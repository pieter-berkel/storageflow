"use client";

import { react } from "storageflow/clients";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = react.client<StorageRouter>();
