const DEFAULT_APP_VERSION = '14.2.0';

function cleanWarnings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((warning) => typeof warning === 'string' && warning.trim())
    .map((warning) => warning.trim().slice(0, 300))
    .slice(0, 12);
}

function createMeta(name, options = {}, context = {}) {
  return {
    tool: name,
    schemaVersion: 1,
    sourceId: options.sourceId || 'vts-app',
    appVersion: String(context.appVersion || DEFAULT_APP_VERSION),
    asOf: options.asOf ?? null,
    filters: options.filters && typeof options.filters === 'object' ? options.filters : {},
    truncated: options.truncated === true,
    completeness: ['complete', 'partial', 'unknown'].includes(options.completeness)
      ? options.completeness
      : 'unknown',
    warnings: cleanWarnings(options.warnings),
    evidenceId: `E${Math.max(1, Number(context.evidenceIndex) || 1)}`,
  };
}

export function createToolSuccess(name, data, options = {}, context = {}) {
  return {
    callId: context.callId || null,
    name,
    ok: true,
    data: data && typeof data === 'object' ? data : {},
    meta: createMeta(name, options, context),
  };
}

export function createToolError(name, code, message, options = {}, context = {}) {
  const setupAction = options.setupAction
    ? { id: options.setupAction.id, hash: options.setupAction.hash }
    : undefined;
  return {
    callId: context.callId || null,
    name,
    ok: false,
    data: {},
    error: {
      code: String(code || 'tool_error'),
      message: String(message || 'The tool could not be completed.').slice(0, 300),
      ...(setupAction ? { setupAction } : {}),
    },
    meta: createMeta(
      name,
      {
        ...options,
        completeness: options.completeness || 'unknown',
        warnings: options.warnings || [message],
      },
      context
    ),
  };
}
