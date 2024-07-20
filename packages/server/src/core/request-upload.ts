import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/provider/types";
import { generateUniqueFilename } from "~/utils";
import { FileInfo, fileInfoSchema } from "~/validations";
import { StorageflowError } from "./error";

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
    throw new StorageflowError({
      code: "NOT_FOUND",
      message: `Route ${body.route} not found`,
    });
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
      throw new StorageflowError({
        code: "BAD_REQUEST",
        message: `File type ${fileInfo.type} is not allowedMimeTypesed`,
      });
    }
  }

  const fileSizeLimit = route._def.fileSizeLimit;
  if (fileSizeLimit !== Infinity && fileInfo.size > fileSizeLimit) {
    throw new StorageflowError({
      code: "FILE_LIMIT_EXCEEDED",
      message: `File size ${fileInfo.size} is larger than max size ${fileSizeLimit}`,
    });
  }

  let input;
  const inputSchema = route._def.input;
  if (inputSchema) {
    const inputResult = inputSchema.safeParse(body.input);

    if (!inputResult.success) {
      // TODO: improve error
      throw new Error(`Invalid input: ${inputResult.error}`);
    }

    input = inputResult.data;
  }

  let metadata;
  const middleware = route._def.middleware;
  if (middleware) {
    try {
      // @ts-expect-error input is always never in router, fix there
      metadata = await middleware({ input, request, response: undefined });
    } catch (error) {
      // TODO: improve error
      throw new Error(`Middleware error: ${error}`);
    }
  }

  let dir = `/${body.route}`;
  const path = route._def.path;
  if (path) {
    try {
      // @ts-expect-error input is always never in router, fix there
      const subdir = await path({ input, metadata });

      // TODO: check if subdir is valid

      if (subdir) {
        if (subdir.startsWith("/")) {
          dir += subdir;
        } else {
          dir += `/${subdir}`;
        }
      }
    } catch (error) {
      // TODO: improve error
      throw new Error(`Path error: ${error}`);
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
