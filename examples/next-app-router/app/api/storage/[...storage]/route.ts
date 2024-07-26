import { z } from "zod";

import {
  createStorageHandler,
  createStorageRouter,
} from "@storageflow/server/next";
import { AWSProvider } from "@storageflow/server/provider/aws";

const router = createStorageRouter((storage) => ({
  banner: storage()
    .allowedMimeTypes(["image/png", "image/jpeg"])
    .input(
      z.object({
        categoryID: z.string(),
      }),
    )
    .path(({ input }) => [input.categoryID]),
}));

export type StorageRouter = typeof router;

const handler = createStorageHandler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
