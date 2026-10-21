/**
 * Normalized API error format (§78):
 * { "error": { "code": "...", "message": "...", "request_id": "..." } }
 */

export type ErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "invalid_api_key"
  | "forbidden"
  | "not_found"
  | "model_not_found"
  | "provider_unavailable"
  | "insufficient_balance"
  | "rate_limit_exceeded"
  | "free_quota_exceeded"
  | "queue_unavailable"
  | "astra_entitlement_required"
  | "campaign_inactive"
  | "invalid_code"
  | "code_expired"
  | "self_redemption_not_allowed"
  | "already_redeemed"
  | "not_eligible"
  | "provider_error"
  | "provider_timeout"
  | "upstream_error"
  | "payload_too_large"
  | "method_not_allowed"
  | "internal_error";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unauthenticated: 401,
  invalid_api_key: 401,
  forbidden: 403,
  not_found: 404,
  model_not_found: 404,
  provider_unavailable: 503,
  insufficient_balance: 402,
  rate_limit_exceeded: 429,
  free_quota_exceeded: 429,
  queue_unavailable: 503,
  astra_entitlement_required: 403,
  campaign_inactive: 403,
  invalid_code: 404,
  code_expired: 410,
  self_redemption_not_allowed: 403,
  already_redeemed: 409,
  not_eligible: 403,
  provider_error: 502,
  provider_timeout: 504,
  upstream_error: 502,
  payload_too_large: 413,
  method_not_allowed: 405,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, message: string, opts: { details?: unknown; retryAfter?: number } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = opts.details;
    this.retryAfter = opts.retryAfter;
  }

  toBody(requestId: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        request_id: requestId,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}