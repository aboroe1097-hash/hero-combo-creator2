export async function assertOperationAvailable({ db, feature, claims, now = Date.now() }) {
  if (claims?.superadmin === true) return;
  const snapshot = await db.doc('vts_admin/operations_config').get();
  const config = snapshot.data() || {};
  if (
    Number.isSafeInteger(config.expiresAtMs) &&
    config.expiresAtMs > 0 &&
    config.expiresAtMs <= now
  )
    return;
  if (
    config.readOnly === true ||
    (Array.isArray(config.disabledFeatures) && config.disabledFeatures.includes(feature))
  ) {
    throw new Error('Operation temporarily paused.');
  }
}

export function withOperationGate(handler, { db, auth, feature }) {
  return async (request, response) => {
    if (String(request.method).toUpperCase() === 'POST') {
      let claims;
      try {
        const header = request.get?.('authorization') || request.headers?.authorization || '';
        claims = await auth.verifyIdToken(String(header).replace(/^Bearer\s+/i, ''), true);
      } catch {
        // The handler owns authentication errors and its origin/App Check gates.
        return handler(request, response);
      }
      try {
        await assertOperationAvailable({ db, feature, claims });
      } catch {
        response.set?.('Cache-Control', 'no-store');
        return response.status(503).json({ error: 'operation_paused' });
      }
    }
    return handler(request, response);
  };
}
