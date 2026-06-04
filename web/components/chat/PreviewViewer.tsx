'use client';

export default function PreviewViewer({
  files,
  index,
  setIndex,
  onClose,
}: any) {
  if (index === null) return null;

  const file = files[index];

  return (
    <div className="fixed inset-0 bg-black z-[999] flex items-center justify-center">

      <button className="absolute top-4 right-4 text-white" onClick={onClose}>
        ✕
      </button>

      {file.type.startsWith("image") ? (
        <img src={URL.createObjectURL(file)} className="max-h-full max-w-full" />
      ) : (
        <video src={URL.createObjectURL(file)} controls className="max-h-full max-w-full" />
      )}

      <button
        onClick={() => setIndex((i: number) => Math.max(i - 1, 0))}
        className="absolute left-3 text-white text-2xl"
      >
        ‹
      </button>

      <button
        onClick={() => setIndex((i: number) => i + 1)}
        className="absolute right-3 text-white text-2xl"
      >
        ›
      </button>
    </div>
  );
}