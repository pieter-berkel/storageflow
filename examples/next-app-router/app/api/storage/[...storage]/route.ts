import {
  createStorageHandler,
  createStorageRouter,
} from "@storageflow/server/next";
import { AWSProvider } from "@storageflow/server/provider/aws";

const router = createStorageRouter((storage) => ({
  banner: storage().fileSizeLimit(10 * 1024 * 1024),
}));

export type StorageRouter = typeof router;

const handler = createStorageHandler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
