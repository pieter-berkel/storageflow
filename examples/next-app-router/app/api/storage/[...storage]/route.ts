import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";
import { server } from "storageflow/server";
import { z } from "zod";

const router = next.router((storage) => ({
  banner: storage()
    .allowedMimeTypes(["image/png", "image/jpeg"])
    .input(
      z.object({
        categoryID: z.string(),
      }),
    )
    .middleware(({ input }) => {
      return {
        myCat: input.categoryID,
        hi: "hello",
        id: 1,
      };
    })
    .path(({ input, context }) => [input.categoryID]),
  nothing: storage(),
}));

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

const sfAPI = server({
  provider: AWSProvider(),
  router: router,
});

sfAPI.banner.upload({
  file: new File([""], "test.png", {
    type: "image/png",
  }),
  input: {
    categoryID: "abraham",
  },
  context: {
    hi: "hello",
    myCat: "abraham",
    id: 1,
  },
});

export { handler as GET, handler as POST };
export type StorageRouter = typeof router;
