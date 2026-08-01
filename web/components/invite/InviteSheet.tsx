"use client";

import BottomSheet from "@/components/share/BottomSheet";
import {
  Copy,
  Share2,
} from "lucide-react";
import {
  FaWhatsapp,
  FaTelegram,
  FaFacebook,
  FaFacebookMessenger,
  FaXTwitter,
} from "react-icons/fa6";
import toast from "react-hot-toast";
import { useInvite } from "@/lib/useInvite";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InviteSheet({
  open,
  onClose,
}: Props) {
  const { inviteFriends } = useInvite();

  const url = "https://tribe-app.app";

  const text = `🚀 Tribe Is Finally Here!

Find your tribe, join communities, chat, watch reels and make new friends.

Download now:
${url}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);

    toast.success("Link copied");

    onClose();
  };

  const whatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );

    onClose();
  };

  const telegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(text)}`,
      "_blank"
    );

    onClose();
  };

  const facebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      "_blank"
    );

    onClose();
  };

  const twitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );

    onClose();
  };

  const messenger = () => {
    window.open(
      `fb-messenger://share?link=${encodeURIComponent(
        url
      )}`
    );

    onClose();
  };

  const nativeShare = async () => {
    await inviteFriends();

    onClose();
  };

  const Item = ({
    icon,
    label,
    onClick,
  }: any) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
        {icon}
      </div>

      <span className="text-xs text-center">
        {label}
      </span>
    </button>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
    >
      <div className="px-5 text-gray-700 dark:text-gray-200 pb-8">

        <h2 className="text-lg font-semibold text-center">
          Invite Friends
        </h2>

        <div className="mt-6 grid grid-cols-4 gap-y-6">

          <Item
            icon={<Copy />}
            label="Copy Link"
            onClick={copyLink}
          />

          <Item
            icon={<FaWhatsapp className="text-green-500" />}
            label="WhatsApp"
            onClick={whatsapp}
          />

          <Item
            icon={<FaTelegram className="text-sky-500" />}
            label="Telegram"
            onClick={telegram}
          />

          <Item
            icon={<FaFacebook className="text-blue-600" />}
            label="Facebook"
            onClick={facebook}
          />

          <Item
            icon={<FaXTwitter />}
            label="X"
            onClick={twitter}
          />

          <Item
            icon={<FaFacebookMessenger className="text-blue-500" />}
            label="Messenger"
            onClick={messenger}
          />

          <Item
            icon={<Share2 />}
            label="More"
            onClick={nativeShare}
          />

        </div>

      </div>
    </BottomSheet>
  );
}