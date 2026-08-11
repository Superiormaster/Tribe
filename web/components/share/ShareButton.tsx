import { Share2 } from "lucide-react";
import { formatCount } from "@/utils/formatCount";

type Props = {
  post: any;
  vertical?: boolean;
  dark?: boolean;
  sharesCount?: number;
  onOpen: (post: any) => void;
};

export default function ShareButton({
  post,
  vertical = false,
  dark = false,
  sharesCount = 0,
  onOpen,
}: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen(post);
      }}
      className={`font-medium ${
        vertical
          ? "flex flex-col items-center gap-1"
          : "flex items-center gap-1"
      } ${
        dark ? "text-white" : "text-gray-500"
      }`}
    >
      <div
        className={
          vertical
            ? "rounded-full bg-black/25 backdrop-blur-sm p-2"
            : ""
        }
        style={
          vertical
            ? {
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }
            : undefined
        }
      >
        <Share2 className={vertical ? "w-7 h-7" : "mr-2"} />
      </div>

      {sharesCount > 0 && (
        <span className={vertical ? "text-xs" : ""}>
          {formatCount(sharesCount)}
        </span>
      )}
    </button>
  );
}