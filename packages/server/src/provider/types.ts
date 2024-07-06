export type MaybePromise<TType> = Promise<TType> | TType;

export type Simplify<TType> = TType extends any[] | Date
  ? TType
  : { [K in keyof TType]: TType[K] };

export type FileInfo = {
  name: string;
  size: number;
  type: string;
};

export type RequestUploadParams = {
  file: FileInfo;
};

type RequestSingleUploadResponse = {
  type: "single";
  url: string;
  uploadUrl: string;
};

type RequestMultipartUploadResponse = {
  type: "multipart";
  url: string;
  key: string;
  multipart: {
    uploadId: string;
    partSize: number;
    parts: {
      partNumber: number;
      uploadUrl: string;
    }[];
  };
};

export type RequestUploadResponse =
  | RequestSingleUploadResponse
  | RequestMultipartUploadResponse;

export type CompleteMultipartUploadParams = {
  uploadId: string;
  key: string;
  parts: {
    partNumber: number;
    eTag: string;
  }[];
};

export type Provider = {
  requestUpload: (
    params: RequestUploadParams,
  ) => MaybePromise<RequestUploadResponse>;
  completeMultipartUpload: (
    params: CompleteMultipartUploadParams,
  ) => MaybePromise<void>;
};
