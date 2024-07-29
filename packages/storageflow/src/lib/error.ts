export const ERROR_CODES = {
  // Generic
  UNKNOWN_ERROR: 500,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
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

export type ErrorName = keyof typeof ERROR_CODES;

export class StorageFlowError extends Error {
  public override readonly name: ErrorName;

  constructor(name: ErrorName, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = name;
  }
}
