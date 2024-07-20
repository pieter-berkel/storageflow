export const ERROR_CODES = {
  // Generic
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  INTERNAL_CLIENT_ERROR: 500,

  // S3 specific
  TOO_LARGE: 413,
  TOO_SMALL: 400,
  TOO_MANY_FILES: 400,
  KEY_TOO_LONG: 400,

  // Storageflow specific
  URL_GENERATION_FAILED: 500,
  UPLOAD_FAILED: 500,
  MISSING_ENV: 500,
  FILE_LIMIT_EXCEEDED: 500,
} as const;

type ErrorCode = keyof typeof ERROR_CODES;

export class StorageflowError extends Error {
  public override readonly cause?: unknown;
  public readonly code: ErrorCode;

  constructor(opts: { message: string; code: ErrorCode; cause?: Error }) {
    super(opts.message);
    this.name = "StorageflowError";
    this.code = opts.code;
    this.cause = opts.cause;
  }
}
