import type { FileInfo } from "@storageflow/server";

export const getFileInfo = (file: File): FileInfo => ({
  name: file.name,
  size: file.size,
  type: file.type,
});

export const uploadWithProgress = async (
  file: File | Blob,
  url: string,
  onProgressChange?: (progress: number) => void,
) => {
  return new Promise<string | null>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);

    request.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // 2 decimal progress
        const progress = Math.round((e.loaded / e.total) * 10000) / 100;
        onProgressChange?.(progress);
      }
    });

    request.addEventListener("error", () => {
      reject(new Error("Error uploading file"));
    });

    request.addEventListener("abort", () => {
      reject(new Error("File upload aborted"));
    });

    request.addEventListener("loadend", () => {
      resolve(request.getResponseHeader("ETag"));
    });

    request.send(file);
  });
};

export const queuedPromises = async <TType, TRes>({
  items,
  fn,
  concurrency = 5,
  retries = 3,
}: {
  items: TType[];
  fn: (item: TType) => Promise<TRes>;
  concurrency?: number;
  retries?: number;
}): Promise<TRes[]> => {
  const results: TRes[] = new Array(items.length);

  const executeWithRetry = async (
    func: () => Promise<TRes>,
    retries: number,
  ): Promise<TRes> => {
    try {
      return await func();
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return executeWithRetry(func, retries - 1);
      } else {
        throw error;
      }
    }
  };

  const semaphore = {
    count: concurrency,
    wait: async () => {
      while (semaphore.count <= 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      semaphore.count--;
    },
    signal: () => {
      semaphore.count++;
    },
  };

  const tasks: Promise<void>[] = items.map((item, i) =>
    (async () => {
      await semaphore.wait();

      try {
        const result = await executeWithRetry(() => fn(item), retries);
        results[i] = result;
      } finally {
        semaphore.signal();
      }
    })(),
  );

  await Promise.all(tasks);
  return results;
};
