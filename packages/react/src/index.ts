//@ts-nocheck

import * as React from "react";

import type { RequestUploadResponse, StorageRouter } from "@storageflow/server";
import { queuedPromises } from "@storageflow/shared";

type UploadStatus = "idle" | "pending" | "error" | "success";

type UploadFn = (
  file: File,
  input: never,
  options?: {
    onSuccess?: ({ data }: { data: string }) => void;
    onError?: ({ error }: { error: Error }) => void;
    onSettled?: ({
      data,
      error,
    }: {
      data: string | null;
      error: Error | null;
    }) => void;
  },
) => Promise<{ url: string }>;

type UseUploadReturn = {
  state: UploadStatus;
  error: Error | undefined;
  data: string | undefined;
  progress: number;
  upload: UploadFn;
  reset: () => void;
};

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    useUpload: () => UseUploadReturn;
  };
};

export const createStorageReact = <TRouter extends StorageRouter>() => {
  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => ({
      useUpload: () => {
        const basePath = "/api/storage";

        const [status, setStatus] = React.useState<UploadStatus>("idle");
        const [error, setError] = React.useState<Error>();
        const [progress, setProgress] = React.useState<number>(0);
        const [data, setData] = React.useState<string>();

        const upload: UploadFn = async (file: File, input, options) => {
          setStatus("pending");
          setError(undefined);
          setData(undefined);
          setProgress(0);

          let url: string | undefined;
          let error: Error | undefined;

          try {
            url = await uploadFile({
              file,
              basePath,
              onProgressChange: setProgress,
            });
            setData(url);
            setStatus("success");
            options?.onSuccess?.({ data: url });
            return { url };
          } catch (error) {
            setError(error as Error);
            setStatus("error");
            options?.onError?.({ error });
            return null;
          } finally {
            options?.onSettled?.({ data: url, error });
          }
        };

        const reset = () => {
          setStatus("idle");
          setError(undefined);
          setData(undefined);
          setProgress(0);
        };

        return {
          upload,
          reset,
          state: status,
          error,
          data,
          progress,
        };
      },
    }),
  });
};

const uploadFile = async ({
  file,
  basePath,
  onProgressChange,
}: {
  file: File;
  basePath: string;
  onProgressChange?: OnProgessChangeHandler;
}) => {
  const response = await fetch(`${basePath}/request-upload`, {
    method: "POST",
    body: JSON.stringify({
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to request upload");
  }

  const json = (await response.json()) as RequestUploadResponse;

  if (json.type === "multipart") {
    const { key } = json;
    const { parts, partSize, uploadId } = json.multipart;

    const uploadingParts: {
      partNumber: number;
      progress: number;
    }[] = [];

    const uploadPart = async (params: {
      part: (typeof parts)[number];
      chunk: Blob;
    }) => {
      const { part, chunk } = params;

      const handleMultipartProgress = (progress: number) => {
        const uploadingPart = uploadingParts.find(
          (p) => p.partNumber === part.partNumber,
        );

        if (uploadingPart) {
          uploadingPart.progress = progress;
        } else {
          uploadingParts.push({
            partNumber: part.partNumber,
            progress,
          });
        }

        const totalProgress =
          Math.round(
            uploadingParts.reduce((acc, p) => acc + p.progress * 100, 0) /
              parts.length,
          ) / 100;

        onProgressChange?.(totalProgress);
      };

      const eTag = await uploadInner(
        chunk,
        part.uploadUrl,
        handleMultipartProgress,
      );

      if (!eTag) {
        throw new Error("Failed to upload part. Etag is not available.");
      }

      return {
        partNumber: part.partNumber,
        eTag,
      };
    };

    const completedParts = await queuedPromises({
      items: parts.map((part) => ({
        part,
        chunk: file.slice(
          (part.partNumber - 1) * partSize,
          part.partNumber * partSize,
        ),
      })),
      fn: uploadPart,
    });

    const response = await fetch(`${basePath}/complete-multipart-upload`, {
      method: "POST",
      body: JSON.stringify({
        uploadId,
        key,
        parts: completedParts,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to complete multipart upload");
    }
  } else if (json.type === "single") {
    await uploadInner(file, json.uploadUrl, onProgressChange);
  }

  return json.url;
};

type OnProgessChangeHandler = (progress: number) => void;

const uploadInner = (
  file: File | Blob,
  url: string,
  onProgressChange?: OnProgessChangeHandler,
) => {
  return new Promise<string | null>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);

    request.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // 2 decimal progress
        const progress = Math.round((e.loaded / e.total) * 10000) / 100;
        onProgressChange?.(progress);
      }
    });

    request.addEventListener("error", () => {
      reject(new Error("Error uploading file"));
    });

    request.addEventListener("abort", () => {
      reject(new Error("File upload aborted"));
    });

    request.addEventListener("loadend", () => {
      resolve(request.getResponseHeader("ETag"));
    });

    request.send(file);
  });
};
