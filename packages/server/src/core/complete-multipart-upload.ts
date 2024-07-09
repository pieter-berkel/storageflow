import type { StorageRouter } from "./router";
import type { Provider } from "~/provider/types";

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
    throw new Error(`Route ${body.route} not found`);
  }

  return await provider.completeMultipartUpload({
    uploadId: body.uploadId,
    filepath: body.filepath,
    parts: body.parts,
  });
};
