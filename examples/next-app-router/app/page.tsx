"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "~/components/ui/input";
import { storage } from "~/lib/storage";

export default function Page() {
  const { upload } = storage.banner.useUpload();

  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    toast.promise(upload(file, { category: "cats" }), {
      loading: "Uploading...",
      success: "Upload successful",
      error: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="container py-8">
      <form>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
        <div>Progress: {0}%</div>
        <button onClick={handleSubmit}>Verzenden</button>
      </form>
    </div>
  );
}
