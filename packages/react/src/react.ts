import { z } from "zod";

import type { StorageRouter } from "@storageflow/server";

import { createStorageFlowClient } from "./api-client";
import { getFileInfo, queuedPromises, uploadWithProgress } from "./utils";

type createStorageFlowReactArgs = {
  baseUrl: string;
};

type UseUpload<TInput extends z.ZodTypeAny> = () => {
  upload: (
    file: File,
    ...args: TInput extends z.ZodTypeAny
      ? [input: z.infer<TInput>, options?: any]
      : [options?: any]
  ) => Promise<{ url: string }>;
};

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    useUpload: UseUpload<TRouter[K]["_def"]["input"]>;
  };
};

export const createStorageFlowReact = <TRouter extends StorageRouter>(
  args?: createStorageFlowReactArgs,
) => {
  const client = createStorageFlowClient({
    baseUrl: args?.baseUrl,
  });

  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => {
      const route = key as string;

      return {
        useUpload: () => {
          return {
            upload: async (file, ...args) => {
              const input = args.length === 1 ? args[0] : undefined;
              const options = args.length === 2 ? args[1] : args[0];

              const result = await client.requestUpload({
                route,
                input,
                fileInfo: getFileInfo(file),
              });

              if (result.type === "single") {
                await uploadWithProgress(file, result.uploadUrl);
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

                    // onProgressChange?.(totalProgress);
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

                await client.completeMultipartUpload({
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
      };
    },
  });
};
