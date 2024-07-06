import { z } from "zod";

import { createStorageHandler } from "@storageflow/server/adapter/next/app";
import { AWSProvider } from "@storageflow/server/provider/aws";
import { createStorageRouter } from "@storageflow/server/router/next/app";

const router = createStorageRouter((storage) => ({
  banner: storage()
    .input(
      z.object({
        category: z.string().uuid(),
      }),
    )
    .middleware(async ({ input, request }) => {
      return {
        hello: "world",
      };
    })
    .path(({ input, metadata }) => `/${input.category}/${metadata.hello}`),
}));

export type StorageRouter = typeof router;

const handler = createStorageHandler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
