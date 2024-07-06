"use client";

import { createStorageReact } from "@storageflow/react";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = createStorageReact<StorageRouter>();
