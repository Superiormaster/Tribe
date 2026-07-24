"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

import ShareSheet from "@/components/share/ShareSheet";

const ShareContext = createContext<any>(null);

export function ShareProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [post, setPost] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const showShare = (post: any) => {
    setPost(post);
    setOpen(true);
  };

  return (
    <ShareContext.Provider value={{ showShare }}>
      {children}

      <ShareSheet
        open={open}
        post={post}
        onClose={() => setOpen(false)}
      />
    </ShareContext.Provider>
  );
}

export const useShareSheet = () =>
  useContext(ShareContext);