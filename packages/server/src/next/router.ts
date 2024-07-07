import { NextRequest } from "next/server";

import { builder, MiddlewareArgs, StorageRouter } from "~/core/router";

export const createStorageRouter = <
  TMiddlewareArgs extends MiddlewareArgs<NextRequest, any>,
  TOutput extends StorageRouter,
>(
  func: (storage: typeof builder<TMiddlewareArgs>) => TOutput,
): TOutput => func(builder);
