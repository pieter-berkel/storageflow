export type SuccessResponse<TData = any> = {
  status: "success";
} & TData;

export type ErrorResponse = {
  status: "error";
  code: string;
  detail?: string;
  fields?: Record<string, string[]>;
};

export type ApiResponse<TData> = SuccessResponse<TData> | ErrorResponse;
