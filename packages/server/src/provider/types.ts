import type { RequestUploadResponse } from "~/core/controller";
import type { FileInfo } from "~/validations";

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
