import { NextRequest, NextResponse } from "next/server";

import { STORAGE_ERROR_CODES, StorageError } from "@storageflow/shared";

import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/provider/types";
import { completeMultipartUpload } from "~/core/complete-multipart-upload";
import { requestUpload } from "~/core/request-upload";
import { AWSProvider } from "~/provider/aws";

export type StorageHandlerConfig = {
  provider?: Provider;
  router: StorageRouter;
};

export const createStorageHandler = (config: StorageHandlerConfig) => {
  const { provider = AWSProvider(), router } = config;

  return async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;

      if (pathname.endsWith("/health")) {
        return new Response("ok", { status: 200 });
      }

      if (pathname.endsWith("/request-upload")) {
        const response = await requestUpload({
          router,
          provider,
          request,
          body: await request.json(),
        });

        return NextResponse.json(response);
      }

      if (pathname.endsWith("/complete-multipart-upload")) {
        await completeMultipartUpload({
          router,
          provider,
          body: await request.json(),
        });

        return new Response(null, { status: 204 });
      }

      return new Response(null, { status: 404 });
    } catch (error) {
      if (error instanceof StorageError) {
        return new Response(error.message, {
          status: STORAGE_ERROR_CODES[error.code],
        });
      } else if (error instanceof Error) {
        return new Response(error.message, {
          status: 500,
        });
      } else {
        return new Response("Internal server error", {
          status: 500,
        });
      }
    }
  };
};
