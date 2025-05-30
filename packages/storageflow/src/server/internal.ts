import { z } from "zod";

import { StorageRouter } from "~/core/router";
import { StorageFlowError } from "~/lib/error";
import { generateUniqueFilename } from "~/lib/utils";
import { Provider } from "~/providers/types";
import { FileInfo, fileInfoSchema } from "~/validations";

export type GetFilesBody = {
  route: string;
  input: any;
};

export type GetFilesArgs = {
  router: StorageRouter;
  provider: Provider;
  body: GetFilesBody;
} & (
  | {
      request: any;
      context?: never;
    }
  | {
      request?: never;
      context: any;
    }
);

export type GetFilesResponse = {
  urls: string[];
};

export const getFiles = async (
  args: GetFilesArgs,
): Promise<GetFilesResponse> => {
  const { router, provider, body, request } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  let input;
  const inputSchema = route._def.input;
  if (inputSchema) {
    input = inputSchema.parse(body.input);
  }

  let context = args.context;
  const middleware = route._def.middleware;
  if (request && middleware) {
    context = await middleware({ input, request, response: undefined });
  }

  let dir = `/${body.route}`;
  const path = route._def.path;
  if (path) {
    const parts = await path({ input, context });

    if (parts !== undefined && !Array.isArray(parts)) {
      throw new StorageFlowError(
        "INTERNAL_SERVER_ERROR",
        "Path function must return an array or undefined",
      );
    }

    if (parts) {
      const schema = z.coerce
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

  return await provider.getFiles(dir);
};

export type RequestUploadBody = {
  route: string;
  fileInfo: FileInfo;
  input: any;
};

type RequestUploadArgs = {
  router: StorageRouter;
  provider: Provider;
  body: RequestUploadBody;
} & (
  | {
      request: any;
      context?: never;
    }
  | {
      request?: never;
      context: any;
    }
);

type RequestSingleUploadResponse = {
  url: string;
  filepath: string;
  type: "single";
  upload: {
    url: string;
    headers?: Record<string, string>;
  };
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

  let context = args.context;
  const middleware = route._def.middleware;
  if (request && middleware) {
    context = await middleware({ input, request, response: undefined });
  }

  let dir = `/${body.route}`;
  const path = route._def.path;
  if (path) {
    const parts = await path({ input, context });

    if (parts !== undefined && !Array.isArray(parts)) {
      throw new StorageFlowError(
        "INTERNAL_SERVER_ERROR",
        "Path function must return an array or undefined",
      );
    }

    if (parts) {
      const schema = z.coerce
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
    temporary: route._def.temporary,
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

export type ConfirmBody = {
  route: string;
  url: string;
};

export type ConfirmArgs = {
  router: StorageRouter;
  provider: Provider;
  body: ConfirmBody;
};

export type ConfirmResponse = void;

export const confirm = async (args: ConfirmArgs): Promise<ConfirmResponse> => {
  const { router, provider, body } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  return await provider.confirm(body.url);
};

export type DeleteFileBody = {
  route: string;
  url: string | string[];
};

export type DeleteFileArgs = {
  router: StorageRouter;
  provider: Provider;
  body: DeleteFileBody;
};

export type DeleteFileResponse = void;

export const deleteFile = async (
  args: DeleteFileArgs,
): Promise<DeleteFileResponse> => {
  const { router, provider, body } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  return await provider.delete(body.url);
};

export type CopyFileBody = {
  route: string;
  source: string;
  destination: string;
};

export type CopyFileArgs = {
  router: StorageRouter;
  provider: Provider;
  body: CopyFileBody;
};

export type CopyFileResponse = void;

export const copyFile = async (
  args: CopyFileArgs,
): Promise<DeleteFileResponse> => {
  const { router, provider, body } = args;

  const route = router[body.route];

  if (!route) {
    throw new StorageFlowError("NOT_FOUND", `Route ${body.route} not found`);
  }

  return await provider.copy(body.source, body.destination);
};
