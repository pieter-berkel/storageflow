# StorageFlow

Storageflow is an self hosted and easy way to handle file management inside your typescript application.

## Features

- File uploads
- React hook uploads like tanstack useMutation
- Input validation
- Middleware for data fetching and authentication
- Custom filepath
- Temporary / confirmed files
- File deletion
- Automatic multipart uploads (for large files)
- Error retries

## Supported (more coming...)

**Server:** NextJS

**Clients:** Node, React

**Providers:** AWS S3

## Example usage

`src/app/api/storage/[...storage]/route.ts`

```typescript
const router = next.router((storage) => ({
  avatar: storage()
    .allowedMimeTypes(["image/*"])
    .fileSizeLimit(10 * 1024 * 1024) // 10MB
    .input(
      z.object({
        username: z.string().min(1),
      }),
    )
    .middleware(async () => {
      const session = await getSession();

      if (!session) {
        throw new StorageFlowError("UNAUTHORIZED", "Unauthorized");
      }

      return session.user;
    })
    .path(({ input, context }) => [context.user.id, input.username]), // avatar/{userId}/{username}
}));

export type StorageRouter = typeof router;

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
```

`src/lib/storage.ts`

```typescript
import { react } from "storageflow/clients";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = react.client<StorageRouter>();
```

`src/app/page.tsx`

```typescript
"use client";

import { storage } from "~/lib/storage";

export default function Page() {
  const { upload, status, error, progress } = storage.avatar.useUpload();

  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) {
      return toast.error("No file selected");
    }

    const { url } = await upload({
      file,
      input: {
        username: "johndoe"
      },
      onProgressChange(progress) {
          console.log(progress);
      },
      onError(error) {
        if (error.name === "FILE_LIMIT_EXCEEDED") {
          return toast.error("File size is too large");
        }

        return toast.error(error.message);
      },
      onSuccess(data) {
        toast.success("Upload successful");
        alert("Here is yout file: " + data.url);
      },
    });
  };

  return (
    <div className="container py-8">
      <form>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
        <div>Progress: {progress}%</div>
        <div>Status: {status}</div>
        <div>Error: {error?.message}</div>
        <button type="button" onClick={handleSubmit}>
          Verzenden
        </button>
      </form>
    </div>
  );
}

```

## Installation / Quick start

Install StorageFlow for NextJS with AWS provider

```bash
npm install storageflow @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod
```

### TODO: Implement AWS S3 bucket settings explanation

Coming soon...

### Environment Variables

To run this project, you will need to add the following environment variables to your .env file

- `STORAGE_AWS_ACCESS_KEY_ID`
- `STORAGE_AWS_SECRET_ACCESS_KEY`
- `STORAGE_AWS_BUCKET_NAME`
- `STORAGE_AWS_REGION`

### File router

Create a `route.ts` file inside the `src/app/api/storage/[...storage]` directory with the following contents:

```typescript
import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";

const router = next.router((storage) => ({
  avatar: storage(),
}));

// used for autocompletion in the clients
export type StorageRouter = typeof router;

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };
```

### React client

Create a `storage.ts` with the following contents:

```typescript
import { react } from "storageflow/clients";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = react.client<StorageRouter>();
```

### Use it in any client component or page

`page.tsx`

```typescript
"use client";

import * as React from "react";

import { storage } from "~/lib/storage";

export default function Page() {
  const { upload } = storage.avatar.useUpload();

  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = async () => {
    const { url } = await upload({
      file,
    });
  };

  return (
    <form>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
      <button type="button" onClick={handleSubmit}>
        Verzenden
      </button>
    </form>
  );
}

```

## API Reference

### Router

A function that returns a StorageRouter object. Make sure to import it from the right adapter.

```typescript
import { next } from "storageflow/adapters";

const router = next.router((storage) => ({ ... }));
```

#### Router routes

Routes are defined using the `storage()` function that is passed as an argument to the router function. See them as "endpoints" to wich users can upload files to.

```typescript
const router = next.router((storage) => ({
  avatar: storage(),
  category: storage(),
  product: storage(),
  // more routes
}));
```

#### Route allowed file/mime types

The `allowedMimeTypes` function is used to define which file types are allowed to be uploaded to the route. It accepts an array of strings. Each string can be a file type or a file type with a wildcard. For example: `image/*` to allow all images or `image/png` to allow only png images.

```typescript
const router = next.router((storage) => ({
  // allow all mime types
  media: z.storage(),

  // only allow png and jpeg
  avatar: storage().allowedMimeTypes(["image/png", "image/jpeg"]),

  // allow all images
  attachment: storage().allowedMimeTypes(["image/*"]),

  // only allow pdf
  manual: storage().allowedMimeTypes(["application/pdf"]),
}));
```

#### Route max file size

The `fileSizeLimit` function is used to define the maximum file size that can be uploaded to the route. It accepts a number in bytes.

```typescript
const router = next.router((storage) => ({
  // allow all sizes
  media: z.storage(),

  // only allow files smaller than 10MB
  avatar: storage().fileSizeLimit(10 * 1024 * 1024), // 10MB
}));
```

#### Route temporary

The `temporary` function is used to define if the file should be deleted after 24~ hours if it is not confirmed.

```typescript
const router = next.router((storage) => ({
  // Store permanently
  media: z.storage(),

  // delete after 24~ hours if not confirmed
  avatar: storage().temporary(),
}));
```

#### Route input

The `input` function is used to define the a zod input schema to make sure that the input is valid that can be used in the middleware function and the path function. It validates the input and throws a `StorageFlowError` if the input is invalid.

```typescript
const router = next.router((storage) => ({
  avatar: storage().input(
    z.object({
      username: z.string().min(1),
      email: z.string().email(),
    }),
  ),
}));
```

#### Route middleware

The `middleware` function is used to define a function that is executed before the file is uploaded. It receives the input and the request and response objects as arguments. Here you can fetch extra data or check if the user is allowed to upload files.

```typescript
const router = next.router((storage) => ({
  avatar: storage()
    .input(...)
    .middleware(async ({ input, request }) => {
      const session = await getSession(request);

      if (!session) {
        throw new StorageFlowError("UNAUTHORIZED", "Unauthorized");
      }

      return session.user;
    }),
}));
```

#### Route path

```typescript
const router = next.router((storage) => ({
  avatar: storage()
    .input(...),
    .middleware(...),

    // path will be: /avatar/{userId}/{username}/hello
    .path(({ input, context }) => [context.user.id, input.username, "hello"]),
}));
```

### React client

Create a file that exports the react client. Make sure to import react from the storafeflow package.
For typesafety import the `StorageRouter` type that you have exported in the router file. In this example the client is named `storage` but you can name it whatever you want.

```typescript
import { react } from "storageflow/clients";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = react.client<StorageRouter>();
```

#### React client upload with hook

Use the `useUpload` hook to upload files to the route. The hook returns an object with the following properties:

- `upload`: A function that takes an object with the following properties:
  - `file`: The file to upload
  - `input`: The input to validate (only if the route has an input)
  - `onProgressChange`: A function that is called when the upload progress changes.
  - `onSuccess`: A function that is called when the upload is successful.
  - `onError`: A function that is called if an error occurs during the upload.
- `status`: The current status of the upload. Can be `idle`, `loading`, `error` or `success`.
- `error`: The error that occurred during the upload.
- `progress`: The progress of the upload in percent.
- `data`: The data that was returned by the server after the upload was successful.

```typescript
import { storage } from "~/lib/storage";

const { upload, status, error, progress, data } = storage.avatar.useUpload();

const { url } = await upload({
  file,
  input: {}, // only if the route has an input
  onProgressChange(progress) {},
  onError(error) {},
  onSuccess(data) {},
});
```

### Node client

Create a file that exports the node client. Make sure to import node from the storafeflow package.
For typesafety import the `StorageRouter` type that you have exported in the router file. In this example the client is named `storage` but you can name it whatever you want.

```typescript
import { node } from "storageflow/clients";

import type { StorageRouter } from "~/app/api/storage/[...storage]/route";

export const storage = node.client<StorageRouter>();
```

#### Node client upload with promise

Use the `upload` function to upload files to the route.

```typescript
const { url } = await storage.avatar.upload({
  file,
  input: {}, // only if the route has an input
  onProgressChange(progress) {},
});
```

### Server client

Create a file that exports the server client. Make sure to only use the server client on the server side.

```typescript
import { next } from "storageflow/adapters";
import { AWSProvider } from "storageflow/providers";
import { server } from "storageflow/server";

const router = next.router((storage) => ({
  avatar: storage(),
}));

export type StorageRouter = typeof router;

const handler = next.handler({
  provider: AWSProvider(),
  router: router,
});

export { handler as GET, handler as POST };

export const storage = server({
  provider: AWSProvider(),
  router: router,
});
```

#### Server client upload

Use the `upload` function to upload files to the route.

```typescript
import { storage } from "~/app/api/storage/[...storage]/route";

const { url } = await storage.banner.upload({
  file,
  input: {},

  // this must be the same as returned by the middleware function
  // also has typesafety
  context: {},
});
```

#### Server client confirm

Use the `confirm` function to confirm a temporart file that was uploaded to the route. Now the file is permanently stored.

```typescript
await storage.avatar.confirm(url);
```

#### Server client delete

Use the `delete` function to delete a file that was uploaded to the route.

```typescript
await storage.avatar.delete(url);
// or
await storage.avatar.delete([url1, url2]);
```

## Authors

- [@pieter-berkel](https://github.com/pieter-berkel)

## Support

For support, search on Discord username: `perkamentus`
