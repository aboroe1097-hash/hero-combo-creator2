import { DurableObject } from 'cloudflare:workers';
import { LIMITS } from './constants.js';

function utcDay(nowMs) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function nextUtcDayMs(nowMs) {
  const date = new Date(nowMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function firstRow(cursor) {
  return cursor.toArray()[0] || null;
}

export class AiQuotaDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS daily_counters (
          utc_day TEXT PRIMARY KEY,
          turns INTEGER NOT NULL DEFAULT 0,
          interactions INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS accepted_turns (
          request_id TEXT PRIMARY KEY,
          accepted_at INTEGER NOT NULL,
          utc_day TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS accepted_turns_at_idx ON accepted_turns(accepted_at);
        CREATE TABLE IF NOT EXISTS turn_state (
          request_id TEXT PRIMARY KEY,
          last_round INTEGER NOT NULL DEFAULT 0,
          interactions INTEGER NOT NULL DEFAULT 1,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS interaction_reservations (
          reservation_id TEXT PRIMARY KEY,
          reserved_at INTEGER NOT NULL,
          utc_day TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS interaction_reservations_at_idx
          ON interaction_reservations(reserved_at);
      `);
    });
  }

  cleanup(nowMs) {
    const cutoff = nowMs - LIMITS.requestReplayTtlMs;
    this.ctx.storage.sql.exec('DELETE FROM accepted_turns WHERE accepted_at < ?', cutoff);
    this.ctx.storage.sql.exec('DELETE FROM turn_state WHERE updated_at < ?', cutoff);
    this.ctx.storage.sql.exec('DELETE FROM interaction_reservations WHERE reserved_at < ?', cutoff);
    const oldestDay = utcDay(nowMs - 2 * LIMITS.requestReplayTtlMs);
    this.ctx.storage.sql.exec('DELETE FROM daily_counters WHERE utc_day < ?', oldestDay);
  }

  acceptUserTurn({ requestId, nowMs }) {
    this.cleanup(nowMs);
    const existing = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT request_id FROM accepted_turns WHERE request_id = ? LIMIT 1',
        requestId
      )
    );
    if (existing) return { allowed: false, reason: 'duplicate_request' };

    const day = utcDay(nowMs);
    const daily = firstRow(
      this.ctx.storage.sql.exec('SELECT turns FROM daily_counters WHERE utc_day = ? LIMIT 1', day)
    );
    const dailyTurns = Number(daily?.turns || 0);
    if (dailyTurns >= LIMITS.userTurnsPerUtcDay) {
      return {
        allowed: false,
        reason: 'daily_quota',
        remaining: 0,
        resetAt: nextUtcDayMs(nowMs),
      };
    }

    const minuteCutoff = nowMs - 60_000;
    const burst = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT COUNT(*) AS count FROM accepted_turns WHERE accepted_at > ?',
        minuteCutoff
      )
    );
    if (Number(burst?.count || 0) >= LIMITS.initialTurnsPerMinute) {
      const oldest = firstRow(
        this.ctx.storage.sql.exec(
          'SELECT MIN(accepted_at) AS accepted_at FROM accepted_turns WHERE accepted_at > ?',
          minuteCutoff
        )
      );
      return {
        allowed: false,
        reason: 'burst_quota',
        remaining: Math.max(0, LIMITS.userTurnsPerUtcDay - dailyTurns),
        resetAt: Number(oldest?.accepted_at || nowMs) + 60_000,
      };
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO daily_counters (utc_day, turns, interactions)
       VALUES (?, 1, 1)
       ON CONFLICT(utc_day) DO UPDATE SET
         turns = turns + 1,
         interactions = interactions + 1`,
      day
    );
    this.ctx.storage.sql.exec(
      'INSERT INTO accepted_turns (request_id, accepted_at, utc_day) VALUES (?, ?, ?)',
      requestId,
      nowMs,
      day
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO turn_state (request_id, last_round, interactions, updated_at)
       VALUES (?, 0, 1, ?)`,
      requestId,
      nowMs
    );
    return {
      allowed: true,
      remaining: LIMITS.userTurnsPerUtcDay - dailyTurns - 1,
      resetAt: nextUtcDayMs(nowMs),
    };
  }

  releaseUserTurn({ requestId }) {
    const row = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT utc_day FROM accepted_turns WHERE request_id = ? LIMIT 1',
        requestId
      )
    );
    if (!row) return { released: false };
    this.ctx.storage.sql.exec('DELETE FROM accepted_turns WHERE request_id = ?', requestId);
    this.ctx.storage.sql.exec('DELETE FROM turn_state WHERE request_id = ?', requestId);
    this.ctx.storage.sql.exec(
      `UPDATE daily_counters
       SET turns = MAX(0, turns - 1), interactions = MAX(0, interactions - 1)
       WHERE utc_day = ?`,
      row.utc_day
    );
    return { released: true };
  }

  acceptContinuation({ requestId, round, nowMs }) {
    this.cleanup(nowMs);
    const row = firstRow(
      this.ctx.storage.sql.exec(
        `SELECT last_round, interactions FROM turn_state
         WHERE request_id = ? LIMIT 1`,
        requestId
      )
    );
    if (!row) return { allowed: false, reason: 'invalid_continuation' };
    if (
      !Number.isInteger(round) ||
      round !== Number(row.last_round) + 1 ||
      round > LIMITS.toolRounds ||
      Number(row.interactions) >= LIMITS.upstreamInteractions
    ) {
      return { allowed: false, reason: 'invalid_continuation' };
    }
    this.ctx.storage.sql.exec(
      `UPDATE turn_state
       SET last_round = ?, interactions = interactions + 1, updated_at = ?
       WHERE request_id = ?`,
      round,
      nowMs,
      requestId
    );
    const dailyRow = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT utc_day FROM accepted_turns WHERE request_id = ? LIMIT 1',
        requestId
      )
    );
    if (dailyRow) {
      this.ctx.storage.sql.exec(
        'UPDATE daily_counters SET interactions = interactions + 1 WHERE utc_day = ?',
        dailyRow.utc_day
      );
    }
    return { allowed: true };
  }

  rollbackContinuation({ requestId, round, nowMs }) {
    const row = firstRow(
      this.ctx.storage.sql.exec(
        `SELECT last_round, interactions FROM turn_state
         WHERE request_id = ? LIMIT 1`,
        requestId
      )
    );
    if (!row || Number(row.last_round) !== round || Number(row.interactions) <= 1) {
      return { released: false };
    }
    this.ctx.storage.sql.exec(
      `UPDATE turn_state
       SET last_round = last_round - 1, interactions = interactions - 1, updated_at = ?
       WHERE request_id = ?`,
      nowMs,
      requestId
    );
    const dailyRow = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT utc_day FROM accepted_turns WHERE request_id = ? LIMIT 1',
        requestId
      )
    );
    if (dailyRow) {
      this.ctx.storage.sql.exec(
        `UPDATE daily_counters SET interactions = MAX(0, interactions - 1)
         WHERE utc_day = ?`,
        dailyRow.utc_day
      );
    }
    return { released: true };
  }

  acceptGlobalTurnAndInteraction({ reservationId, nowMs }) {
    this.cleanup(nowMs);
    const prior = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT reservation_id FROM interaction_reservations WHERE reservation_id = ? LIMIT 1',
        reservationId
      )
    );
    if (prior) return { allowed: false, reason: 'duplicate_request' };
    const day = utcDay(nowMs);
    const row = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT turns, interactions FROM daily_counters WHERE utc_day = ? LIMIT 1',
        day
      )
    );
    const turns = Number(row?.turns || 0);
    const interactions = Number(row?.interactions || 0);
    if (
      turns >= LIMITS.globalTurnsPerUtcDay ||
      interactions >= LIMITS.globalInteractionsPerUtcDay
    ) {
      return { allowed: false, reason: 'global_budget', resetAt: nextUtcDayMs(nowMs) };
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO daily_counters (utc_day, turns, interactions)
       VALUES (?, 1, 1)
       ON CONFLICT(utc_day) DO UPDATE SET
         turns = turns + 1,
         interactions = interactions + 1`,
      day
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO interaction_reservations (reservation_id, reserved_at, utc_day)
       VALUES (?, ?, ?)`,
      reservationId,
      nowMs,
      day
    );
    return { allowed: true, resetAt: nextUtcDayMs(nowMs) };
  }

  acceptGlobalInteraction({ reservationId, nowMs }) {
    this.cleanup(nowMs);
    const prior = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT reservation_id FROM interaction_reservations WHERE reservation_id = ? LIMIT 1',
        reservationId
      )
    );
    if (prior) return { allowed: false, reason: 'duplicate_request' };
    const day = utcDay(nowMs);
    const row = firstRow(
      this.ctx.storage.sql.exec(
        'SELECT interactions FROM daily_counters WHERE utc_day = ? LIMIT 1',
        day
      )
    );
    if (Number(row?.interactions || 0) >= LIMITS.globalInteractionsPerUtcDay) {
      return { allowed: false, reason: 'global_budget', resetAt: nextUtcDayMs(nowMs) };
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO daily_counters (utc_day, turns, interactions)
       VALUES (?, 0, 1)
       ON CONFLICT(utc_day) DO UPDATE SET interactions = interactions + 1`,
      day
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO interaction_reservations (reservation_id, reserved_at, utc_day)
       VALUES (?, ?, ?)`,
      reservationId,
      nowMs,
      day
    );
    return { allowed: true, resetAt: nextUtcDayMs(nowMs) };
  }

  releaseGlobalReservation({ reservationId, includeTurn }) {
    const row = firstRow(
      this.ctx.storage.sql.exec(
        `SELECT utc_day FROM interaction_reservations
         WHERE reservation_id = ? LIMIT 1`,
        reservationId
      )
    );
    if (!row) return { released: false };
    this.ctx.storage.sql.exec(
      'DELETE FROM interaction_reservations WHERE reservation_id = ?',
      reservationId
    );
    this.ctx.storage.sql.exec(
      `UPDATE daily_counters
       SET turns = MAX(0, turns - ?), interactions = MAX(0, interactions - 1)
       WHERE utc_day = ?`,
      includeTurn ? 1 : 0,
      row.utc_day
    );
    return { released: true };
  }
}
