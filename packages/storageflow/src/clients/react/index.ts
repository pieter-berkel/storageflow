import * as React from "react";
import { z } from "zod";

import { node } from "~/clients";
import { StorageRouter } from "~/core/router";
import { StorageFlowError } from "~/lib/error";

type UploadStatus = "idle" | "loading" | "error" | "success";

type UseUpload<TInput extends z.ZodTypeAny> = () => {
  status: UploadStatus;
  data: { url?: string };
  error: StorageFlowError | null;
  progress: number;
  upload: (
    args: {
      file: File;
      onError?: (error: StorageFlowError) => void;
      onSuccess?: (data: { url: string }) => void;
      onProgressChange?: (progress: number) => void;
    } & (TInput extends z.ZodNever
      ? { input?: any }
      : { input: z.infer<TInput> }),
  ) => Promise<{ url?: string; error?: StorageFlowError }>;
};

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    useUpload: UseUpload<TRouter[K]["_def"]["input"]>;
  };
};

const client = <TRouter extends StorageRouter>(args?: { baseUrl?: string }) => {
  const { baseUrl } = args ?? {};

  const client = node.client({
    baseUrl,
  });

  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => {
      const route = key as string;

      return {
        useUpload: () => {
          const [status, setStatus] = React.useState<UploadStatus>("idle");
          const [progress, setProgress] = React.useState<number>(0);
          const [data, setData] = React.useState<{ url?: string }>({});
          const [error, setError] = React.useState<StorageFlowError | null>(
            null,
          );

          return {
            upload: async ({ file, input, ...args }) => {
              try {
                setStatus("loading");
                setProgress(0);
                setData({});
                setError(null);

                if (!client[route]) {
                  throw new StorageFlowError(
                    "NOT_FOUND",
                    `Route ${route} not found`,
                  );
                }

                const result = await client[route].upload({
                  file,
                  input,
                  onProgressChange: (progress) => {
                    setProgress(progress);
                    args.onProgressChange?.(progress);
                  },
                });

                setStatus("success");
                setData(result);

                args.onSuccess?.({
                  url: result.url,
                });

                return {
                  url: result.url,
                };
              } catch (e) {
                setStatus("error");
                setData({});

                const err =
                  e instanceof StorageFlowError
                    ? e
                    : e instanceof Error
                      ? new StorageFlowError("UNKNOWN_ERROR", e.message)
                      : new StorageFlowError("UNKNOWN_ERROR", "Unknown error");

                setError(err);
                setError(err);
                args.onError?.(err);

                return {
                  error: err,
                };
              }
            },
            status,
            progress,
            data,
            error,
          };
        },
      };
    },
  });
};

export const react = {
  client,
};
