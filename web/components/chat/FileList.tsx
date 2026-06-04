'use client';

import { useEffect, useState } from "react";
import { Media } from "@capacitor-community/media";

type FileItem = {
  name: string;
  webPath: string;
};

export default function FileList({
  onSelect,
}: {
  onSelect: (file: File) => void;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const result = await Media.getPhotos({
        limit: 100,
      });

      const mapped = result.photos.map((p: any) => ({
        name: p.path?.split("/").pop() || "file",
        webPath: p.webPath,
      }));

      setFiles(mapped);
    } catch (err) {
      console.log(err);
    }
  };

  const convertToFile = async (webPath: string) => {
    const res = await fetch(webPath);
    const blob = await res.blob();
    return new File([blob], "file", { type: blob.type });
  };

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div
          key={i}
          onClick={async () => {
            const f = await convertToFile(file.webPath);
            onSelect(f);
          }}
          className="p-3 bg-gray-800 rounded-lg text-white text-sm"
        >
          📎 {file.name}
        </div>
      ))}
    </div>
  );
}