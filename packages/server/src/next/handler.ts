import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import type { RequestUploadResponse } from "~/core/request-upload";
import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/provider/types";
import type { ErrorResponse, SuccessResponse } from "~/types";
import { completeMultipartUpload } from "~/core/complete-multipart-upload";
import { StorageflowError } from "~/core/error";
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

        return NextResponse.json<SuccessResponse<RequestUploadResponse>>({
          status: "success",
          ...response,
        });
      }

      if (pathname.endsWith("/complete-multipart-upload")) {
        await completeMultipartUpload({
          router,
          provider,
          body: await request.json(),
        });

        return NextResponse.json<SuccessResponse>({ status: "success" });
      }

      return new Response(null, { status: 404 });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json<ErrorResponse>({
          status: "error",
          code: "BAD_REQUEST",
          detail: "Invalid input",
          fields: error.flatten().fieldErrors as Record<string, string[]>,
        });
      }

      if (error instanceof StorageflowError) {
        return NextResponse.json<ErrorResponse>({
          status: "error",
          code: error.code,
          detail: error.message,
        });
      }

      if (error instanceof Error) {
        return NextResponse.json<ErrorResponse>({
          status: "error",
          code: "INTERNAL_SERVER_ERROR",
          detail: error.message,
        });
      }

      return NextResponse.json<ErrorResponse>({
        status: "error",
        code: "INTERNAL_SERVER_ERROR",
        detail: "Internal server error",
      });
    }
  };
};
