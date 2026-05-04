export default function LoadingSpinner() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );
}