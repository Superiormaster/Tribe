import { Forward } from "lucide-react";

type Props = {
  isCurrentUser: boolean;
  onClick?: () => void;
};

export default function ForwardButton({
  isCurrentUser,
  onClick,
}: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        absolute top-1/2 -translate-y-1/2
        ${isCurrentUser ? "-left-10" : "-right-10"}
        z-20
        p-2 rounded-full
        bg-black/40 text-white
      `}
    >
      <Forward size={18} />
    </button>
  );
}