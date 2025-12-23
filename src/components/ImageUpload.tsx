"use client";

import { useState } from "react";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  bucket?: string;
  className?: string;
  label?: string;
}

export function ImageUpload({
  onUpload,
  bucket = "social-images",
  className = "",
  label = "Upload Image",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);

      const file = event.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      onUpload(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded transition-colors">
        {uploading ? "Uploading..." : label}
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
