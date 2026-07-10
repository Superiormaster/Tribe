interface Props {
    open: boolean;
    isOwner: boolean;
    reelId: number;
    username: string;
    onClose: () => void;
    onReport: () => void;
    onMute: () => void;
    onBlock: () => void;
    onCopyLink: () => void;
    onDelete: () => void;
    onEdit: () => void;
}

export default function ReelMenu({
    open,
    isOwner,
    onClose,
    onReport,
    onMute,
    onBlock,
    onCopyLink,
    onDelete,
    onEdit,
}: Props) {

    if (!open) return null;

    return (

        <div className="absolute right-3 bottom-14 bg-white dark:bg-gray-800 border rounded-xl shadow-lg z-50 overflow-hidden">

            <div className="flex flex-col">

                {!isOwner && (

                    <>

                        <button
                            className="px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={onReport}
                        >
                            Report
                        </button>

                        <button
                            className="px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={onMute}
                        >
                            Mute User
                        </button>

                        <button
                            className="px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={onBlock}
                        >
                            Block User
                        </button>

                    </>

                )}

                <button
                    className="px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={onCopyLink}
                >
                    Copy Link
                </button>

                {isOwner && (

                    <>

                        <button
                            className="px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"className="px-3 py-2 text-left text-gray-700 text-sm dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={onEdit}
                        >
                            Edit
                        </button>

                        <button
                            className="px-3 py-2 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={onDelete}
                        >
                            Delete
                        </button>

                    </>

                )}

                <button
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700"
                    onClick={onClose}
                >
                    Close
                </button>

            </div>

        </div>

    );

}