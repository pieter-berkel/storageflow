import type { FileInfo } from "~/validations";
import { GetFilesResponse, RequestUploadResponse } from "~/server/internal";

type RequestUploadArgs = {
  fileInfo: FileInfo;
  filename: string;
  filepath: string;
  temporary: boolean;
};

type CompleteMultipartUploadArgs = {
  uploadId: string;
  filepath: string;
  parts: {
    partNumber: number;
    eTag: string;
  }[];
};

export type Provider = {
  getFiles: (path?: string) => Promise<GetFilesResponse>;
  requestUpload: (args: RequestUploadArgs) => Promise<RequestUploadResponse>;
  completeMultipartUpload: (args: CompleteMultipartUploadArgs) => Promise<void>;
  confirm: (url: string) => Promise<void>;
  delete: (url: string | string[]) => Promise<void>;
};
