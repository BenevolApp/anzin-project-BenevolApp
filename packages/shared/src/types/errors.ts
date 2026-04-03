// Codes d'erreur applicatifs — JAMAIS throw new Error() directement

export const AppErrorCodes = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Métier
  MISSION_NOT_FOUND: "MISSION_NOT_FOUND",
  MISSION_FULL: "MISSION_FULL",
  ALREADY_APPLIED: "ALREADY_APPLIED",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  ORGANISATION_NOT_FOUND: "ORGANISATION_NOT_FOUND",

  // Pointage
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_ALREADY_USED: "TOKEN_ALREADY_USED",
  QR_INVALID: "QR_INVALID",

  // Système
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type AppErrorCode = (typeof AppErrorCodes)[keyof typeof AppErrorCodes];

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  details?: unknown
): AppError {
  return { code, message, details };
}
