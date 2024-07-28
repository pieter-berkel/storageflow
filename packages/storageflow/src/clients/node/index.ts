import type { z } from "zod";

import type { StorageRouter } from "~/core/router";
import { sdk } from "~/core/sdk";

export type UploadArgs<TInput extends z.ZodTypeAny> = {
  file: File;
  onProgressChange?: (progress: number) => void;
} & (TInput extends z.ZodNever
  ? { input?: never }
  : { input: z.infer<TInput> });

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
        upload: (args) => sdk.upload({ ...args, route, baseUrl }),
      };
    },
  });
};

export const node = {
  client,
};
