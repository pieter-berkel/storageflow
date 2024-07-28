import type { z } from "zod";

import type { AnyInput, AnyMiddleware, StorageRouter } from "~/core/router";
import type { Provider } from "~/providers/types";

export type UploadArgs<
  TInput extends AnyInput,
  TContext extends AnyMiddleware | undefined,
> = {
  file: File;
} & (TInput extends z.ZodNever
  ? { input?: never }
  : { input: z.infer<TInput> }) &
  (TContext extends undefined
    ? { context?: never }
    : { context: Awaited<ReturnType<TContext>> });

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
