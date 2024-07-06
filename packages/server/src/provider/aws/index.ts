import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { StorageError } from "@storageflow/shared";

import type { Provider } from "../types";
import { generateUniqueFileKey } from "../../utils";

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
    throw new StorageError({
      code: "UNAUTHORIZED",
      message:
        "AWS bucket name is required. Set STORAGE_AWS_BUCKET_NAME or pass bucketName to AWSProvider",
    });
  }

  if (!region) {
    throw new StorageError({
      code: "UNAUTHORIZED",
      message:
        "AWS region is required. Set STORAGE_AWS_REGION or pass region to AWSProvider",
    });
  }

  const baseUrl =
    options?.baseURL ??
    process.env.STORAGE_BASE_URL ??
    `https://${bucketName}.s3.${region}.amazonaws.com`;

  const s3Client = getS3Client(options);

  return {
    requestUpload: async ({ file }) => {
      const key = generateUniqueFileKey(file.name);

      const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
      let partSize = 5 * 1024 * 1024; // 5MB

      if (file.size > MULTIPART_THRESHOLD) {
        let totalParts = Math.ceil(file.size / partSize);

        // the maximum number of parts is 1000
        if (totalParts > 1000) {
          totalParts = 1000;
          partSize = Math.ceil(file.size / totalParts);
        }

        const command = new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          ACL: "public-read",
          ContentType: file.type,
        });

        const { UploadId } = await s3Client.send(command);

        if (!UploadId) {
          throw new StorageError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error creating multipart upload",
          });
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
          key,
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
        ContentLength: file.size,
        ContentType: file.type,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 10, // 10 minutes
      });

      return {
        type: "single",
        url: `${baseUrl}/${key}`,
        uploadUrl: signedUrl,
      };
    },
    completeMultipartUpload: async (params) => {
      const { uploadId, key, parts } = params;

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
    throw new StorageError({
      code: "UNAUTHORIZED",
      message:
        "AWS access key is required. Set STORAGE_AWS_ACCESS_KEY_ID or pass accessKeyId to AWSProvider",
    });
  }

  if (!secretAccessKey) {
    throw new StorageError({
      code: "UNAUTHORIZED",
      message:
        "AWS secret access key is required. Set STORAGE_AWS_SECRET_ACCESS_KEY or pass secretAccessKey to AWSProvider",
    });
  }

  if (!region) {
    throw new StorageError({
      code: "UNAUTHORIZED",
      message:
        "AWS region is required. Set STORAGE_AWS_REGION or pass region to AWSProvider",
    });
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
