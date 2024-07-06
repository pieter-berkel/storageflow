import { NextRequest } from "next/server";
import { z } from "zod";

import { createStorageRouter, MiddlewareArgs } from "~/core/router";

const createNextAppStorageRouter = createStorageRouter<
  MiddlewareArgs<NextRequest, undefined>
>;

export { createNextAppStorageRouter as createStorageRouter };

const myRouter = createNextAppStorageRouter((storage) => ({
  banner: storage()
    .input(z.object({ category: z.string().uuid() }))
    .middleware(async ({ input, request }) => {
      return {
        hello: "world",
      };
    })
    .path(({ input, metadata }) => `/${input.category}/${metadata.hello}`),
}));

type MyRouter = typeof myRouter;
