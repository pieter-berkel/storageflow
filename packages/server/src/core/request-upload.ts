import type { StorageRouter } from "~/core/router";
import type { Provider } from "~/provider/types";
import { generateUniqueFileKey } from "~/utils";
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
  type: "single";
  uploadUrl: string;
};

type RequestMultipartUploadResponse = {
  type: "multipart";
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
    throw new Error(`Route ${body.route} not found`);
  }

  const fileInfoResult = fileInfoSchema.safeParse(body.fileInfo);

  if (!fileInfoResult.success) {
    // TODO: improve error
    throw new Error(`Invalid file info: ${fileInfoResult.error}`);
  }

  const fileInfo = fileInfoResult.data;

  const accept = route._def.accept;
  if (accept) {
    const regex = /^\w+\/([\w\.\-\+]+|\*)$/gm;

    const accepted = accept.some((mime) => {
      // check if the route has valid accept entries
      if (!regex.test(mime)) {
        throw new Error(`Route ${body.route} has invalid accept entry ${mime}`);
      }

      const [type, subtype] = mime.split("/") as [string, string];

      if (subtype === "*") {
        return fileInfo.type.startsWith(type);
      }

      return fileInfo.type === mime;
    });

    if (!accepted) {
      throw new Error(`File type ${fileInfo.type} is not accepted`);
    }
  }

  const maxSize = route._def.maxSize;
  if (maxSize !== Infinity && fileInfo.size > maxSize) {
    throw new Error(
      `File size ${fileInfo.size} is larger than max size ${maxSize}`,
    );
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

  const key = generateUniqueFileKey(fileInfo.name);
  const filePath = `${dir}/${key}`;

  return await provider.requestUpload({
    fileInfo,
    filePath,
  });
};
