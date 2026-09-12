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
      const result = await Media.getMedias({
        quantity: 100,
      });

      const mapped = result.medias.map((p) => ({
        name: p.identifier,
        webPath: p.data,
      }));

      setFiles(mapped);
    } catch (err) {
      console.log(err);
    }
  };

  const convertToFile = async (data: string) => {
    const dataUrl = data.startsWith("data:")
      ? data
      : `data:image/jpeg;base64,${data}`;
  
    const res = await fetch(dataUrl);
    const blob = await res.blob();
  
    return new File([blob], "photo.jpg", {
      type: blob.type,
    });
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