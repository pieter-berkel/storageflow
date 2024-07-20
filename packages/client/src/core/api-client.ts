import type {
  ApiResponse,
  CompleteMultipartUploadBody,
  CompleteMultipartUploadResponse,
  RequestUploadBody,
  RequestUploadResponse,
} from "@storageflow/server";

export const createStorageFlowApiClient = ({
  baseUrl = "/api/storage",
} = {}) => {
  return {
    health: async () => {
      const response = await fetch(`${baseUrl}/health`);
      return (await response.text()) as "ok";
    },

    requestUpload: async (args: RequestUploadBody) => {
      const response = await fetch(`${baseUrl}/request-upload`, {
        method: "POST",
        body: JSON.stringify(args),
      });

      return (await response.json()) as ApiResponse<RequestUploadResponse>;
    },

    completeMultipartUpload: async (args: CompleteMultipartUploadBody) => {
      const response = await fetch(`${baseUrl}/complete-multipart-upload`, {
        method: "POST",
        body: JSON.stringify(args),
      });

      return (await response.json()) as ApiResponse<CompleteMultipartUploadResponse>;
    },
  };
};
