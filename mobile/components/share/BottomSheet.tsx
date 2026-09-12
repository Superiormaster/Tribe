type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({
  open,
  onClose,
  children,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${
          open
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[1005]
        bg-white dark:bg-gray-900
        rounded-t-3xl
        transition-transform duration-300
        ${
          open
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 rounded-full bg-gray-300" />
        </div>

        {children}
      </div>
    </>
  );
}