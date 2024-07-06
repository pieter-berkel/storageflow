export const STORAGE_ERROR_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type StorageErrorCodeKey = keyof typeof STORAGE_ERROR_CODES;

export class StorageError extends Error {
  public override readonly cause?: Error;
  public readonly code: StorageErrorCodeKey;

  constructor(opts: {
    message: string;
    code: StorageErrorCodeKey;
    cause?: Error;
  }) {
    super(opts.message);
    this.name = "StorageError";

    this.code = opts.code;
    this.cause = opts.cause;
  }
}
