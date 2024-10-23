import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ErrorResponse, SuccessResponse } from "~/core/api";
import type { Provider } from "~/providers/types";
import { builder, MiddlewareArgs, StorageRouter } from "~/core/router";
import { StorageFlowError } from "~/lib/error";
import { zodErrorToMessage } from "~/lib/utils";
import {
  completeMultipartUpload,
  getFiles,
  GetFilesResponse,
  requestUpload,
  RequestUploadResponse,
} from "~/server/internal";

export type HandlerConfig = {
  provider: Provider;
  router: StorageRouter;
};

const handler = (config: HandlerConfig) => {
  const { provider, router } = config;

  return async (request: NextRequest) => {
    try {
      const pathname = request.nextUrl.pathname;

      if (pathname.endsWith("/health")) {
        return new Response("ok", { status: 200 });
      }

      if (pathname.endsWith("/get-files")) {
        const response = await getFiles({
          router,
          provider,
          request,
          body: await request.json(),
        });

        return NextResponse.json<SuccessResponse<GetFilesResponse>>({
          status: "success",
          ...response,
        });
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

const router = <
  TMiddlewareArgs extends MiddlewareArgs<NextRequest, any>,
  TOutput extends StorageRouter,
>(
  func: (storage: typeof builder<TMiddlewareArgs>) => TOutput,
): TOutput => func(builder);

export const next = {
  handler,
  router,
};
