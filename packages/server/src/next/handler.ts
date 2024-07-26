import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { StorageFlowError } from "@storageflow/shared";

import type { RequestUploadResponse } from "~/core/controller";
import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/provider/types";
import type { ErrorResponse, SuccessResponse } from "~/types";
import { completeMultipartUpload, requestUpload } from "~/core/controller";
import { AWSProvider } from "~/provider/aws";
import { zodErrorToMessage } from "~/utils";

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
          name: "BAD_REQUEST",
          message: zodErrorToMessage(error),
          fields: error.flatten().fieldErrors as Record<string, string[]>,
        });
      }

      if (error instanceof StorageFlowError) {
        return NextResponse.json<ErrorResponse>({
          status: "error",
          name: error.name,
          message: error.message,
        });
      }

      if (error instanceof Error) {
        return NextResponse.json<ErrorResponse>({
          status: "error",
          name: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return NextResponse.json<ErrorResponse>({
        status: "error",
        name: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      });
    }
  };
};
