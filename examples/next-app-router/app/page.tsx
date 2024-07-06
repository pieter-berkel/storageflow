"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "~/components/ui/input";
import { storage } from "~/lib/storage";

export default function Page() {
  const { upload, reset, state, data, error, progress } =
    storage.banner.useUpload();

  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    toast.promise(upload(file), {
      loading: "Uploading...",
      success: "Upload successful",
      error: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="container py-8">
      <form>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
        <div>Progress: {progress}%</div>
        <button onClick={handleSubmit}>Verzenden</button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </form>
    </div>
  );
}
