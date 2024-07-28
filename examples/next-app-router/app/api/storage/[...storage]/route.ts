import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";
import { z } from "zod";

const router = next.router((storage) => ({
  banner: storage()
    .allowedMimeTypes(["image/png", "image/jpeg"])
    .input(
      z.object({
        categoryID: z.string(),
      }),
    )
    .path(({ input }) => [input.categoryID]),
  nothing: storage(),
}));

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
export type StorageRouter = typeof router;
