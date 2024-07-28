import type { FileInfo } from "~/validations";
import { RequestUploadResponse } from "~/server/internal";

type RequestUploadArgs = {
  fileInfo: FileInfo;
  filename: string;
  filepath: string;
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
  requestUpload: (args: RequestUploadArgs) => Promise<RequestUploadResponse>;
  completeMultipartUpload: (args: CompleteMultipartUploadArgs) => Promise<void>;
};
