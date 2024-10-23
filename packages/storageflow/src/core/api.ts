import type { ErrorName } from "~/lib/error";
import { DEFAULT_BASE_URL } from "~/lib/constants";
import {
  CompleteMultipartUploadBody,
  CompleteMultipartUploadResponse,
  GetFilesBody,
  GetFilesResponse,
  RequestUploadBody,
  RequestUploadResponse,
} from "~/server/internal";

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
    getFiles: async (body: GetFilesBody) => {
      const response = await fetch(`${baseUrl}/get-files`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return (await response.json()) as ApiResponse<GetFilesResponse>;
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
