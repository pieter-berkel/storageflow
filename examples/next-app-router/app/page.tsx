"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "~/components/ui/input";
import { storage } from "~/lib/storage";

export default function Page() {
  const { upload, status, error, progress } = storage.banner.useUpload();

  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) {
      return toast.error("No file selected");
    }

    upload({
      file,
      onError(error) {
        if (error.name === "FILE_LIMIT_EXCEEDED") {
          return toast.error("Het bestand is te groot");
        }

        toast.error(error.message);
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
        {/* @ts-expect-error */}
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
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
