import type { StorageRouter } from "./router";
import type { Provider } from "~/provider/types";

type RequestUploadBody = {
  route: string;
  uploadId: string;
  key: string;
  parts: {
    partNumber: number;
    eTag: string;
  }[];
};

type CompleteMultipartUploadArgs = {
  router: StorageRouter;
  provider: Provider;
  body: RequestUploadBody;
};

type CompleteMultipartUploadResponse = void;

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
    key: body.key,
    parts: body.parts,
  });
};
