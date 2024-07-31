import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { Provider } from "../types";
import { StorageFlowError } from "~/lib/error";

export type AWSProviderOptions = {
  baseURL?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucketName?: string;
};

export const AWSProvider = (options?: AWSProviderOptions): Provider => {
  const {
    bucketName = process.env.STORAGE_AWS_BUCKET_NAME,
    region = process.env.STORAGE_AWS_REGION,
  } = options ?? {};

  if (!bucketName) {
    throw new StorageFlowError(
      "MISSING_ENV",
      "AWS bucket name is required. Set STORAGE_AWS_BUCKET_NAME or pass bucketName to AWSProvider",
    );
  }

  if (!region) {
    throw new StorageFlowError(
      "MISSING_ENV",
      "AWS region is required. Set STORAGE_AWS_REGION or pass region to AWSProvider",
    );
  }

  const baseUrl =
    options?.baseURL ??
    process.env.STORAGE_BASE_URL ??
    `https://${bucketName}.s3.${region}.amazonaws.com`;

  const s3Client = getS3Client(options);

  return {
    requestUpload: async ({ fileInfo, filepath, temporary }) => {
      const key = filepath.startsWith("/") ? filepath.slice(1) : filepath;

      const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
      let partSize = 5 * 1024 * 1024; // 5MB

      if (fileInfo.size > MULTIPART_THRESHOLD) {
        let totalParts = Math.ceil(fileInfo.size / partSize);

        // the maximum number of parts is 1000
        if (totalParts > 1000) {
          totalParts = 1000;
          partSize = Math.ceil(fileInfo.size / totalParts);
        }

        const command = new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          ACL: "public-read",
          ContentType: fileInfo.type,
          Tagging: temporary ? "temporary=true" : undefined,
        });

        const { UploadId } = await s3Client.send(command);

        if (!UploadId) {
          throw new StorageFlowError(
            "INTERNAL_SERVER_ERROR",
            "Multipart upload has no UploadId",
          );
        }

        const parts = await Promise.all(
          Array.from({ length: totalParts }).map(async (_, i) => {
            const command = new UploadPartCommand({
              Bucket: bucketName,
              Key: key,
              UploadId,
              PartNumber: i + 1,
            });

            const url = await getSignedUrl(s3Client, command, {
              expiresIn: 60 * 10, // 10 minutes
            });

            return {
              uploadUrl: url,
              partNumber: i + 1,
            };
          }),
        );

        return {
          type: "multipart",
          url: `${baseUrl}/${key}`,
          filepath,
          multipart: {
            uploadId: UploadId,
            parts,
            partSize,
          },
        };
      }

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ACL: "public-read",
        ContentLength: fileInfo.size,
        ContentType: fileInfo.type,
        Tagging: temporary ? "temporary=true" : undefined,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 10, // 10 minutes
        unhoistableHeaders: new Set(["x-amz-tagging"]),
      });

      return {
        type: "single",
        url: `${baseUrl}/${key}`,
        filepath,
        upload: {
          url: signedUrl,
          headers: temporary
            ? { "x-amz-tagging": "temporary=true" }
            : undefined,
        },
      };
    },
    completeMultipartUpload: async (params) => {
      const { uploadId, filepath, parts } = params;

      const key = filepath.startsWith("/") ? filepath.slice(1) : filepath;

      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part, i) => ({
            ETag: part.eTag,
            PartNumber: part.partNumber,
          })),
        },
      });

      await s3Client.send(command);
    },
    delete: async (url: string | string[]) => {
      const urls = Array.isArray(url) ? url : [url];
      const keys = urls.map((url) => url.replace(`${baseUrl}/`, ""));

      const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map((key) => ({
            Key: key,
          })),
        },
      });

      await s3Client.send(command);
    },
  };
};

type S3ClientConfig = {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};

const getS3Client = (config?: S3ClientConfig) => {
  const {
    accessKeyId = process.env.STORAGE_AWS_ACCESS_KEY_ID,
    secretAccessKey = process.env.STORAGE_AWS_SECRET_ACCESS_KEY,
    region = process.env.STORAGE_AWS_REGION,
  } = config ?? {};

  if (!accessKeyId) {
    throw new StorageFlowError(
      "MISSING_ENV",
      "AWS access key is required. Set STORAGE_AWS_ACCESS_KEY_ID or pass accessKeyId to AWSProvider",
    );
  }

  if (!secretAccessKey) {
    throw new StorageFlowError(
      "MISSING_ENV",
      "AWS secret access key is required. Set STORAGE_AWS_SECRET_ACCESS_KEY or pass secretAccessKey to AWSProvider",
    );
  }

  if (!region) {
    throw new StorageFlowError(
      "MISSING_ENV",
      "AWS region is required. Set STORAGE_AWS_REGION or pass region to AWSProvider",
    );
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
};
