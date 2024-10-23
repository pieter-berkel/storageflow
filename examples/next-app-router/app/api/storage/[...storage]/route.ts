import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";
import { server } from "storageflow/server";
import { z } from "zod";

const router = next.router((storage) => ({
  avatar: storage()
    .allowedMimeTypes(["image/*"])
    .fileSizeLimit(10 * 1024 * 1024) // 10MB
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .path(({ input }) => [input.id]),
}));

export type StorageRouter = typeof router;

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };

export const storage = server({
  provider: AWSProvider(),
  router: router,
});
