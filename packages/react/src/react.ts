import * as React from "react";
import { z } from "zod";

import type { StorageRouter } from "@storageflow/server";

import { upload } from "./client";

type UploadStatus = "idle" | "loading" | "error" | "success";

type UseUpload<TInput extends z.ZodTypeAny> = () => {
  status: UploadStatus;
  data: { url?: string };
  error: Error | null;
  progress: number;
  upload: (
    args: {
      file: File;
      onError?: (error: Error) => void;
      onSuccess?: (data: { url: string }) => void;
      onProgressChange?: (progress: number) => void;
    } & (TInput extends z.ZodNever
      ? { input?: any }
      : { input: z.infer<TInput> }),
  ) => Promise<{ url?: string; error?: Error }>;
};

type RouteFunctions<TRouter extends StorageRouter> = {
  [K in keyof TRouter]: {
    useUpload: UseUpload<TRouter[K]["_def"]["input"]>;
  };
};

export const createStorageFlowReact = <TRouter extends StorageRouter>(args?: {
  baseUrl?: string;
}) => {
  const { baseUrl } = args ?? {};

  return new Proxy<RouteFunctions<TRouter>>({} as any, {
    get: (_target, key): RouteFunctions<TRouter>[string] => {
      const route = key as string;

      return {
        useUpload: () => {
          const [status, setStatus] = React.useState<UploadStatus>("idle");
          const [progress, setProgress] = React.useState<number>(0);
          const [data, setData] = React.useState<{ url?: string }>({});
          const [error, setError] = React.useState<Error | null>(null);

          return {
            upload: async ({ file, input, ...args }) => {
              try {
                setStatus("loading");
                setProgress(0);
                setData({});
                setError(null);

                const result = await upload({
                  file,
                  route,
                  baseUrl,
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

                const err = e instanceof Error ? e : new Error("Unknown error");

                setError(err);
                setData({});

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
