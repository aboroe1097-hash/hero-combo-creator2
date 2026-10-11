// Only public operator settings are fetched. Never forward user credentials.
// Cache at most 30 seconds; uncertainty blocks paid calls while browsing stays up.
export async function workerOperationPaused(
  env,
  features,
  { claims = {}, fetcher = fetch, now = Date.now() } = {}
) {
  if (claims.superadmin === true) return false;
  const project = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!/^[a-z][a-z0-9-]{4,62}$/u.test(project)) return true;
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/vts_admin/operations_config`;
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(5000),
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 30, 404: 30, '500-599': 0 } },
    });
    if (response.status === 404) return false;
    if (!response.ok) return true;
    const body = await response.json();
    const fields = body.fields;
    if (!fields || typeof fields !== 'object') return true;
    const expiry = Number(fields.expiresAtMs?.integerValue || 0);
    if (Number.isSafeInteger(expiry) && expiry > 0 && expiry <= now) return false;
    if (fields.readOnly?.booleanValue === true) return true;
    const disabled = fields.disabledFeatures?.arrayValue?.values || [];
    return disabled.some((entry) => features.includes(entry.stringValue));
  } catch {
    return true;
  }
}
