import type { ErrorName } from "~/lib/error";
import {
  CompleteMultipartUploadBody,
  CompleteMultipartUploadResponse,
  RequestUploadBody,
  RequestUploadResponse,
} from "~/adapters/shared";
import { DEFAULT_BASE_URL } from "~/lib/constants";

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

export const createAPI = (options?: { baseUrl?: string }) => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;

  return {
    health: async () => {
      const response = await fetch(`${baseUrl}/health`);
      return (await response.text()) as "ok";
    },
    requestUpload: async (body: RequestUploadBody) => {
      const response = await fetch(`${baseUrl}/request-upload`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return (await response.json()) as ApiResponse<RequestUploadResponse>;
    },
    completeMultipartUpload: async (body: CompleteMultipartUploadBody) => {
      const response = await fetch(`${baseUrl}/complete-multipart-upload`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return (await response.json()) as ApiResponse<CompleteMultipartUploadResponse>;
    },
  };
};
