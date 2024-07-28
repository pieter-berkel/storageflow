// functions for client creations

import { createAPI } from "~/core/api";
import { StorageFlowError } from "~/lib/error";
import { getFileInfo, queuedPromises, uploadWithProgress } from "~/lib/utils";

export type UploadArgs = {
  file: File;
  route: string;
  baseUrl?: string;
  input?: any;
  onProgressChange?: (progress: number) => void;
};

const upload = async (args: UploadArgs) => {
  const { file, route, baseUrl, input, onProgressChange } = args;

  const api = createAPI({
    baseUrl,
  });

  const result = await api.requestUpload({
    route,
    input,
    fileInfo: getFileInfo(file),
  });

  if (result.status === "error") {
    // TODO: check if error contains fields
    throw new StorageFlowError(result.name, result.message);
  }

  if (result.type === "single") {
    await uploadWithProgress(file, result.uploadUrl, onProgressChange);
  } else if (result.type === "multipart") {
    const { parts, partSize, uploadId } = result.multipart;

    const uploadingParts: {
      partNumber: number;
      progress: number;
    }[] = [];

    const uploadPart = async (params: {
      part: (typeof parts)[number];
      chunk: Blob;
    }) => {
      const { part, chunk } = params;

      const handleMultipartProgress = (progress: number) => {
        const uploadingPart = uploadingParts.find(
          (p) => p.partNumber === part.partNumber,
        );

        if (uploadingPart) {
          uploadingPart.progress = progress;
        } else {
          uploadingParts.push({
            partNumber: part.partNumber,
            progress,
          });
        }

        const totalProgress =
          Math.round(
            uploadingParts.reduce((acc, p) => acc + p.progress * 100, 0) /
              parts.length,
          ) / 100;

        onProgressChange?.(totalProgress);
      };

      const eTag = await uploadWithProgress(
        chunk,
        part.uploadUrl,
        handleMultipartProgress,
      );

      if (!eTag) {
        throw new Error("Failed to upload part. Etag is not available.");
      }

      return {
        partNumber: part.partNumber,
        eTag,
      };
    };

    const completedParts = await queuedPromises({
      items: parts.map((part) => ({
        part,
        chunk: file.slice(
          (part.partNumber - 1) * partSize,
          part.partNumber * partSize,
        ),
      })),
      fn: uploadPart,
    });

    await api.completeMultipartUpload({
      route,
      uploadId,
      filepath: result.filepath,
      parts: completedParts,
    });
  }

  return {
    url: result.url,
  };
};

export const sdk = {
  upload,
};
