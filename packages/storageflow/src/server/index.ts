import type { z } from "zod";

import type { AnyInput, AnyMiddleware, StorageRouter } from "~/core/router";
import type { Provider } from "~/providers/types";
import { getFileInfo, queuedPromises, upload } from "~/lib/utils";
import {
  completeMultipartUpload,
  confirm,
  deleteFile,
  requestUpload,
} from "./internal";

export type UploadArgs<
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
> = {
  file: File;
} & (TInput extends z.ZodType
  ? { input: z.infer<TInput> }
  : { input?: never }) &
  (TMiddleware extends null
    ? { context?: never }
    : { context: Awaited<ReturnType<NonNullable<TMiddleware>>> });

type ServerProxy<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    upload: (
      args: UploadArgs<
        TRouter[K]["_def"]["input"],
        TRouter[K]["_def"]["middleware"]
      >,
    ) => Promise<{ url: string }>;
    confirm: (url: string) => Promise<void>;
    delete: (url: string | string[]) => Promise<void>;
  };
};

export const server = <TRouter extends StorageRouter>(config: {
  provider: Provider;
  router: TRouter;
}) => {
  return new Proxy<ServerProxy<TRouter>>({} as any, {
    get: (_target, key): ServerProxy<TRouter>[string] => {
      const { provider, router } = config;
      const route = key as string;

      return {
        upload: async (args) => {
          const { file, input, context } = args;

          const result = await requestUpload({
            router,
            provider,
            context,
            body: {
              route,
              input,
              fileInfo: getFileInfo(file),
            },
          });

          if (result.type === "single") {
            await upload(file, result.upload.url, {
              headers: result.upload.headers,
            });
          } else if (result.type === "multipart") {
            const { parts, partSize, uploadId } = result.multipart;

            const uploadPart = async (params: {
              part: (typeof parts)[number];
              chunk: Blob;
            }) => {
              const { part, chunk } = params;

              const eTag = await upload(chunk, part.uploadUrl);

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

            await completeMultipartUpload({
              router,
              provider,
              body: {
                route,
                uploadId,
                filepath: result.filepath,
                parts: completedParts,
              },
            });
          }

          return {
            url: result.url,
          };
        },
        confirm: async (url) => {
          await confirm({
            router,
            provider,
            body: {
              route,
              url,
            },
          });
        },
        delete: async (url) => {
          await deleteFile({
            router,
            provider,
            body: {
              route,
              url,
            },
          });
        },
      };
    },
  });
};
