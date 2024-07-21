import type { ErrorName } from "@storageflow/shared";

export type SuccessResponse<TData = any> = {
  status: "success";
} & TData;

export type ErrorResponse = {
  status: "error";
  name: ErrorName;
  message: string;
  fields?: Record<string, string[]>;
};

export type ApiResponse<TData> = SuccessResponse<TData> | ErrorResponse;
