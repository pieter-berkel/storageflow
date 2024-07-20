"use client";

import { createStorageFlowReact } from "@storageflow/client/react";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = createStorageFlowReact<StorageRouter>();
