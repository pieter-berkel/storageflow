import type { z } from "zod";

import type { AnyInput, StorageRouter } from "@storageflow/server";
import { StorageFlowError } from "@storageflow/shared";

import { getFileInfo } from "../lib/utils";
import { createStorageFlowApiClient } from "./api-client";

type UploadArgs<TInput extends AnyInput> = {
  file: File;
  onProgressChange?: (progress: number) => void;
} & (TInput extends z.ZodNever ? { input?: any } : { input: z.infer<TInput> });

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    upload: (
      args: UploadArgs<TRouter[K]["_def"]["input"]>,
    ) => Promise<{ url: string }>;
  };
};

export const createStorageFlowClient = <TRouter extends StorageRouter>(args?: {
  baseUrl?: string;
}) => {
  const { baseUrl } = args ?? {};

  const api = createStorageFlowApiClient({
    baseUrl,
  });

  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => {
      const route = key as string;

      return {
        upload: async (args) => {
          const { file, input, onProgressChange } = args;

          const result = await api.requestUpload({
            route,
            input,
            fileInfo: getFileInfo(file),
          });

          if (result.status === "error") {
            // TODO: check if error contains fields
            throw new StorageFlowError(result.name, result.message);
          }

          if (result.type === "single") {
            await uploadWithProgress(file, result.uploadUrl, onProgressChange);
          } else if (result.type === "multipart") {
            const { parts, partSize, uploadId } = result.multipart;

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
                    uploadingParts.reduce(
                      (acc, p) => acc + p.progress * 100,
                      0,
                    ) / parts.length,
                  ) / 100;

                onProgressChange?.(totalProgress);
              };

              const eTag = await uploadWithProgress(
                chunk,
                part.uploadUrl,
                handleMultipartProgress,
              );

              if (!eTag) {
                throw new Error(
                  "Failed to upload part. Etag is not available.",
                );
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

            await api.completeMultipartUpload({
              route,
              uploadId,
              filepath: result.filepath,
              parts: completedParts,
            });
          }

          return {
            url: result.url,
          };
        },
      };
    },
  });
};

const uploadWithProgress = async (
  file: File | Blob,
  url: string,
  onProgressChange?: (progress: number) => void,
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

const queuedPromises = async <TType, TRes>({
  items,
  fn,
  concurrency = 5,
  retries = 3,
}: {
  items: TType[];
  fn: (item: TType) => Promise<TRes>;
  concurrency?: number;
  retries?: number;
}): Promise<TRes[]> => {
  const results: TRes[] = new Array(items.length);

  const executeWithRetry = async (
    func: () => Promise<TRes>,
    retries: number,
  ): Promise<TRes> => {
    try {
      return await func();
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return executeWithRetry(func, retries - 1);
      } else {
        throw error;
      }
    }
  };

  const semaphore = {
    count: concurrency,
    wait: async () => {
      while (semaphore.count <= 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      semaphore.count--;
    },
    signal: () => {
      semaphore.count++;
    },
  };

  const tasks: Promise<void>[] = items.map((item, i) =>
    (async () => {
      await semaphore.wait();

      try {
        const result = await executeWithRetry(() => fn(item), retries);
        results[i] = result;
      } finally {
        semaphore.signal();
      }
    })(),
  );

  await Promise.all(tasks);
  return results;
};
