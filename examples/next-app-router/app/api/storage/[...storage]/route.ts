import { StorageFlowError } from "storageflow";
import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";
import { server } from "storageflow/server";
import { z } from "zod";

const router = next.router((storage) => ({
  banner: storage()
    .allowedMimeTypes(["image/png", "image/jpeg", "application/pdf"])
    .temporary()
    .input(
      z.object({
        bannerId: z.number(),
      }),
    )
    .middleware(() => {
      if (Math.random() > 0.5) {
        throw new StorageFlowError("UNAUTHORIZED", "Unauthorized");
      }

      const user = { id: 1, name: "John Doe" };

      return {
        user,
      };
    })
    .path(({ input, context }) => [context.user.id, input.bannerId]),
  nothing: storage(),
}));

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export const storage = server({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
export type StorageRouter = typeof router;
