'use client';

import {
  Clock3,
  Check,
  CheckCheck,
  AlertCircle,
} from "lucide-react";

type Props = {
  msg: any;
  isCurrentUser: boolean;
  isMediaMessage: boolean;
  retryFailedMessage?: (msg: any) => void;
  resendPendingMessage?: (msg: any) => void;
};

export default function MessageFooter({
  msg,
  isCurrentUser,
  isMediaMessage,
  retryFailedMessage,
  resendPendingMessage,
}: Props) {
  return (
    <div className="flex justify-end items-center gap-1 mt-1">
      <span
        className={`text-[10px] ${
          isCurrentUser
            ? "text-gray-700 dark:text-green-100"
            : "text-gray-700 dark:text-gray-400"
        }`}
      >
        {msg.created_at &&
          new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
      </span>

      {isCurrentUser && (
        <span className="text-[10px] opacity-80 text-gray-700 dark:text-white">
          {["pending", "sending", "uploading"].includes(msg.status) && (
            <Clock3
              size={14}
              className="text-gray-500 dark:text-gray-300"
            />
          )}

          {msg.status === "sent" && (
            <Check
              size={14}
              className="text-gray-500 dark:text-gray-300"
            />
          )}

          {msg.status === "delivered" && (
            <CheckCheck
              size={14}
              className="text-gray-500 dark:text-gray-300"
            />
          )}

          {msg.status === "seen" && (
            <CheckCheck
              size={14}
              className="text-indigo-600 dark:text-indigo-300"
            />
          )}

          {msg.status === "failed" && isMediaMessage && (
            <AlertCircle
              size={14}
              className="text-red-500"
            />
          )}

          {!isMediaMessage && (
            <>
              {msg.status === "failed" && (
                <button
                  onClick={() => retryFailedMessage?.(msg)}
                  className="text-red-500 dark:text-red-300"
                >
                  Retry
                </button>
              )}

              {msg.status === "pending" && (
                <button
                  onClick={() => resendPendingMessage?.(msg)}
                  className="text-red-300"
                >
                  Resend
                </button>
              )}
            </>
          )}
        </span>
      )}
    </div>
  );
}