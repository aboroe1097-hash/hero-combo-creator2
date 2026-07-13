export class AiRequestError extends Error {
  constructor(status, code, message, details = undefined, retryAfter = undefined) {
    super(message);
    this.name = 'AiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export function asSafeError(error) {
  if (error instanceof AiRequestError) return error;
  return new AiRequestError(502, 'provider_outage', 'The AI provider is unavailable.');
}
