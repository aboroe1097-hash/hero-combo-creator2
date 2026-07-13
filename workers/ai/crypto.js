const encoder = new TextEncoder();

export function utf8Bytes(value) {
  return encoder.encode(String(value));
}

export function utf8ByteLength(value) {
  return utf8Bytes(value).byteLength;
}

export function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function base64UrlDecode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new TypeError('Invalid base64url value.');
  }
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function base64UrlDecodeJson(value) {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64UrlDecode(value)));
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

export async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', utf8Bytes(value));
  return base64UrlEncode(digest);
}

async function importHmacKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new TypeError('HMAC secret is not configured.');
  }
  return crypto.subtle.importKey(
    'raw',
    utf8Bytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function hmacBase64Url(secret, value) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, utf8Bytes(value));
  return base64UrlEncode(signature);
}

export async function verifyHmacBase64Url(secret, value, signature) {
  try {
    const key = await importHmacKey(secret);
    return crypto.subtle.verify('HMAC', key, base64UrlDecode(signature), utf8Bytes(value));
  } catch {
    return false;
  }
}

export async function shortOpaqueId(secret, namespace, rawValue) {
  const digest = await hmacBase64Url(secret, `${namespace}\u0000${rawValue}`);
  return digest.slice(0, 32);
}
