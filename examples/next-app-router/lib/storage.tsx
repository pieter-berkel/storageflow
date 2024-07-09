"use client";

import { createStorageFlowReact } from "@storageflow/react";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = createStorageFlowReact<StorageRouter>();
