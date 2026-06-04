'use client';

type Props = {
  selectedCount: number;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

export default function ModerationBar({
  selectedCount,
  onReject,
  onApprove,
  onDelete,
  onCancel,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-4 flex items-center justify-between z-50">

      <button onClick={onCancel}>
        Cancel
      </button>
    
      <span>
        {selectedCount} selected
      </span>
    
      <div className="flex gap-3">
    
        {onReject && (
          <button
            onClick={onReject}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Reject
          </button>
        )}
    
        {onApprove && (
          <button
            onClick={onApprove}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Approve
          </button>
        )}
    
        {onDelete && (
          <button
            onClick={onDelete}
            className="bg-red-700 px-4 py-2 rounded"
          >
            Delete
          </button>
        )}
    
      </div>
    
    </div>
  );
}