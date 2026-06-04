'use client';

import { Send } from 'lucide-react';

export default function CaptionBar({
  selectedFiles,
  value,
  onChange,
  setPreviewIndex,
  onSend,
}: any) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-t border-gray-800">

      <div
        onClick={() => setPreviewIndex(0)}
        className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-700 cursor-pointer"
      >
        <img
          src={URL.createObjectURL(selectedFiles[0])}
          className="w-full h-full object-cover"
        />

        {selectedFiles.length > 1 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
            +{selectedFiles.length}
          </div>
        )}
      </div>

      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val);
          handleTyping?.(val);
          saveDraftLocal?.(val);
        }}
        onSelect={(e) => {
          cursorRef.current = e.currentTarget.selectionStart;
        }}
        onClick={(e) => {
          cursorRef.current = e.currentTarget.selectionStart;
        }}
        onKeyUp={(e) => {
          cursorRef.current = e.currentTarget.selectionStart;
        }}
        disabled={disabled}
        rows={1}
        className="
          w-full
          px-4
          py-3
          bg-transparent
          text-white
          text-sm
          outline-none
          flex-1
          resize-none
          max-h-32
          overflow-y-auto
        "
        placeholder="Add a caption..."
      />

      <button
        onClick={onSend}
        disabled={!value.trim()}
        className="
          p-3
          rounded-full
          bg-indigo-600
          disabled:opacity-50
          text-white
        "
      >
        <Send size={18} />
      </button>
    </div>
  );
}