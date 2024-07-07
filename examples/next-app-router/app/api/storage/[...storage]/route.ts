import { z } from "zod";

import {
  createStorageHandler,
  createStorageRouter,
} from "@storageflow/server/next";
import { AWSProvider } from "@storageflow/server/provider/aws";

const router = createStorageRouter((storage) => ({
  banner: storage()
    .input(
      z.object({
        category: z.string(),
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
