'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import MediaGrid from './MediaGrid';
import FileList from './FileList';

type Props = {
  mediaTab: "photos" | "videos" | "files";
  setMediaTab: (v: any) => void;

  setShowMediaPicker: (v: boolean) => void;
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setShowCaptionBar: (v: boolean) => void;
};

export default function MediaPickerSheet({
  mediaTab,
  setMediaTab,
  setShowMediaPicker,
  setSelectedFiles,
  setShowCaptionBar,
}: Props) {
  const handleSelect = (file: File) => {
    setSelectedFiles(prev => [...prev, file]);
    setShowCaptionBar(true);
  };
  
  const [open, setOpen] = useState(true); 
  const startY = useRef(0);
  const isDragging = useRef(false);
  const [dragY, setDragY] = useState(0);

  return (
    <motion.div
      initial={{ y: "40%" }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      animate={{
        y: open ? 0 : "50%" 
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={0.1}
      onDragEnd={(e, info) => {
        if (info.offset.y > 120) {
          setOpen(false); 
        } else {
          setOpen(true);  
        }
      }}
      className="
        fixed bottom-0 left-0 right-0
        h-[90vh]
        bg-[#111b21]
        z-[60]
        rounded-t-2xl
        flex flex-col
      "
    
      onTouchStart={(e) => {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
      }}
    
      onTouchMove={(e) => {
        if (!isDragging.current) return;
    
        const diff = e.touches[0].clientY - startY.current;
        setDragY(diff);
      }}
    
      onTouchEnd={() => {
        isDragging.current = false;
    
        if (dragY > 200) {
          setShowMediaPicker(false);
        }
    
        setDragY(0);
      }}
    >
      {/* HANDLE */}
      <div className="pt-2 pb-3 flex justify-center">
        <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
      </div>

      {/* TABS */}
      <div className="flex justify-around border-b border-gray-800 px-4 pb-2">
        {["photos", "videos", "files"].map((tab) => (
          <button
            key={tab}
            onClick={() => setMediaTab(tab as any)}
            className={`text-sm px-3 py-1 rounded-full ${
              mediaTab === tab
                ? "bg-indigo-600 text-white"
                : "text-gray-400"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-3">
        {mediaTab === "photos" && (
          <MediaGrid type="image" onSelect={handleSelect} />
        )}

        {mediaTab === "videos" && (
          <MediaGrid type="video" onSelect={handleSelect} />
        )}

        {mediaTab === "files" && (
          <FileList onSelect={handleSelect} />
        )}
      </div>
    </motion.div>
  );
}