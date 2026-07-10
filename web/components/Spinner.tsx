'use client';

interface ReelSpinnerProps {
  show: boolean;
}

export default function ReelSpinner({
  show,
}: ReelSpinnerProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] pointer-events-none">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-white/20" />

        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
      </div>
    </div>
  );
}
{/*
'use client';

interface ReelSpinnerProps {
  show: boolean;
}

export default function ReelSpinner({
  show,
}: ReelSpinnerProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="h-8 w-8 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
    </div>
  );
}
*/}