import type { z } from "zod";

import type { AnyInput, AnyMiddleware, StorageRouter } from "~/core/router";
import type { Provider } from "~/providers/types";

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
          const { file, input } = args;

          return {
            url: "",
          };
        },
      };
    },
  });
};
