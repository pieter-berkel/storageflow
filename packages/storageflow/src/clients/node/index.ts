import type { z } from "zod";

import type { AnyInput, StorageRouter } from "~/core/router";
import { createAPI } from "~/core/api";
import { StorageFlowError } from "~/lib/error";
import { getFileInfo, queuedPromises, uploadWithProgress } from "~/lib/utils";

export type UploadArgs<TInput extends AnyInput> = {
  file: File;
  onProgressChange?: (progress: number) => void;
} & (TInput extends z.ZodType ? { input: z.infer<TInput> } : { input?: never });

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    upload: (
      args: UploadArgs<TRouter[K]["_def"]["input"]>,
    ) => Promise<{ url: string }>;
  };
};

const client = <TRouter extends StorageRouter>(args?: { baseUrl?: string }) => {
  const { baseUrl } = args ?? {};

  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => {
      const route = key as string;

      return {
        upload: async (args) => {
          const { file, input, onProgressChange } = args;

          const api = createAPI({
            baseUrl,
          });

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

export const node = {
  client,
};
