import type { FileInfo } from "@storageflow/server";

export const getFileInfo = (file: File): FileInfo => ({
  name: file.name,
  size: file.size,
  type: file.type,
});
