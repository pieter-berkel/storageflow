import { z } from "zod";

import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/providers/types";
import { StorageFlowError } from "~/lib/error";
import { generateUniqueFilename } from "~/lib/utils";
import { FileInfo, fileInfoSchema } from "~/validations";

export type RequestUploadBody = {
  route: string;
  fileInfo: FileInfo;
  input: any;
};

type RequestUploadArgs = {
  router: StorageRouter;
  provider: Provider;
  request: any;
  body: RequestUploadBody;
};

type RequestSingleUploadResponse = {
  url: string;
  filepath: string;
  type: "single";
  uploadUrl: string;
};

type RequestMultipartUploadResponse = {
  type: "multipart";
  filepath: string;
  multipart: {
    uploadId: string;
    partSize: number;
    parts: {
      partNumber: number;
      uploadUrl: string;
    }[];
  };
  url: string;
};

export type RequestUploadResponse =
  | RequestSingleUploadResponse
  | RequestMultipartUploadResponse;

export const requestUpload = async (
  args: RequestUploadArgs,
): Promise<RequestUploadResponse> => {
  const { router, provider, request, body } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  const fileInfo = fileInfoSchema.parse(body.fileInfo);

  const allowedMimeTypes = route._def.allowedMimeTypes;
  if (allowedMimeTypes) {
    const accepted = allowedMimeTypes.some((mime) => {
      const [type, subtype] = mime.split("/") as [string, string];

      if (subtype === "*") {
        return fileInfo.type.startsWith(type);
      }

      return fileInfo.type === mime;
    });

    if (!accepted) {
      throw new StorageFlowError(
        "BAD_REQUEST",
        `File type ${fileInfo.type} is not a allowed mime type`,
      );
    }
  }

  const fileSizeLimit = route._def.fileSizeLimit;
  if (fileSizeLimit !== Infinity && fileInfo.size > fileSizeLimit) {
    throw new StorageFlowError(
      "FILE_LIMIT_EXCEEDED",
      `File size ${fileInfo.size} is larger than max size ${fileSizeLimit}`,
    );
  }

  let input;
  const inputSchema = route._def.input;
  if (inputSchema) {
    input = inputSchema.parse(body.input);
  }

  let metadata;
  const middleware = route._def.middleware;
  if (middleware) {
    // @ts-expect-error input is always never in router, fix there
    metadata = await middleware({ input, request, response: undefined });
  }

  let dir = `/${body.route}`;
  const path = route._def.path;
  if (path) {
    // @ts-expect-error input is always never in router, fix there
    const parts = await path({ input, metadata });

    if (parts !== undefined && !Array.isArray(parts)) {
      throw new StorageFlowError(
        "INTERNAL_SERVER_ERROR",
        "Path function must return an array or undefined",
      );
    }

    if (parts) {
      const schema = z
        .string()
        .trim()
        .min(1)
        .regex(/^[\w!\-.*'()]*$/gm);

      for (const part of parts) {
        const result = schema.safeParse(part);

        if (!result.success) {
          throw new StorageFlowError(
            "INTERNAL_SERVER_ERROR",
            `Path part ${part} is not valid`,
          );
        }

        dir += `/${result.data}`;
      }
    }
  }

  const filename = generateUniqueFilename(fileInfo.name);
  const filepath = `${dir}/${filename}`;

  return await provider.requestUpload({
    fileInfo,
    filename,
    filepath,
  });
};

export type CompleteMultipartUploadBody = {
  route: string;
  uploadId: string;
  filepath: string;
  parts: {
    partNumber: number;
    eTag: string;
  }[];
};

type CompleteMultipartUploadArgs = {
  router: StorageRouter;
  provider: Provider;
  body: CompleteMultipartUploadBody;
};

export type CompleteMultipartUploadResponse = void;

export const completeMultipartUpload = async (
  args: CompleteMultipartUploadArgs,
): Promise<CompleteMultipartUploadResponse> => {
  const { router, provider, body } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  return await provider.completeMultipartUpload({
    uploadId: body.uploadId,
    filepath: body.filepath,
    parts: body.parts,
  });
};
