"use client";

import { useMemo } from "react";
import { useNavigation } from "@/utils/useNavigation";
import BottomSheet from "@/components/share/BottomSheet";
import {
  Copy,
  Users,
  Share2,
} from "lucide-react";

import {
  FaWhatsapp,
  FaTelegram,
  FaFacebook,
  FaFacebookMessenger,
  FaXTwitter,
} from "react-icons/fa6";

import { useShare } from "@/lib/useShare";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  post: any;
  onShared?: (shares: number) => void;
};

export default function ShareSheet({
  open,
  onClose,
  post,
  onShared,
}: Props) {
  const { push } = useNavigation();

  const { recordShare } = useShare();

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}/post/${post?.id}`;
  }, [post]);

  if (!post) return null;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);

    const res = await recordShare(post.id, "copy_link");
    if (res) {
      onShared?.(res.shares_count);
    }

    toast.success("Link copied");

    onClose();
  };

  const shareCommunity = () => {
    onClose();

    push(
      `/main/share/community/${post.id}`
    );
  };

  const whatsapp = async () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(url)}`,
      "_blank"
    );

    const res = await recordShare(post.id, "whatsapp");
    if (res) {
      onShared?.(res.shares_count);
    }

    onClose();
  };

  const telegram = async () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}`,
      "_blank"
    );

    const res = await recordShare(post.id, "telegram");
    if (res) {
      onShared?.(res.shares_count);
    }

    onClose();
  };

  const facebook = async () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      "_blank"
    );

    const res = await recordShare(post.id, "facebook");
    if (res) {
      onShared?.(res.shares_count);
    }

    onClose();
  };

  const twitter = async () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}`,
      "_blank"
    );

    const res = await recordShare(post.id, "x");
    if (res) {
      onShared?.(res.shares_count);
    }

    onClose();
  };

  const messenger = async () => {
    window.open(
      `fb-messenger://share?link=${encodeURIComponent(
        url
      )}`
    );

    const res = await recordShare(post.id, "messenger");
    if (res) {
      onShared?.(res.shares_count);
    }

    onClose();
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      toast.error("Sharing isn't supported.");
      return;
    }

    try {
      await navigator.share({
        title: "Tribe",
        text: post.caption,
        url,
      });

      const res = await recordShare(post.id, "native");
      if (res) {
        onShared?.(res.shares_count);
      }
    } catch {}

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
          Share
        </h2>
  
        <div className="mt-6 grid grid-cols-4 gap-y-6">
  
          <Item
            icon={<Copy />}
            label="Copy Link"
            onClick={copyLink}
          />
  
          {/*<Item
            icon={<Users />}
            label="Community"
            onClick={shareCommunity}
          />*/}
  
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