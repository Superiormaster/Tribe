'use client';

import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  msg: any;

  isCurrentUser: boolean;
  isMediaMessage: boolean;

  selectedMessages: Set<string>;
  toggleSelectMessage: (id: string) => void;

  setReplyingTo: (msg: any) => void;
  setActiveReaction: (id: string | null) => void;

  clearSelection?: () => void;
  openPreview: () => void;
};

export default function useBubbleGestures({
  id,
  msg,

  isCurrentUser,
  isMediaMessage,

  selectedMessages,
  toggleSelectMessage,

  setReplyingTo,
  setActiveReaction,

  openPreview,
}: Props) {

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const hasMoved = useRef(false);
  const didLongPress = useRef(false);

  const startX = useRef(0);

  const longPressTimer =
    useRef<NodeJS.Timeout | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const movedDuringTouch = useRef(false);

  const MAX_DRAG = 120;
  const TRIGGER = 60;
  
  const canReply =
  !(
    isCurrentUser &&
    ["pending", "sending", "uploading", "failed"].includes(
      msg.status ?? ""
    )
  );

  useEffect(() => {

    const reset = () => {
      setDragging(false);
      setDragX(0);
    };

    window.addEventListener("pointerup", reset);
    window.addEventListener("pointercancel", reset);

    return () => {
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
    };

  }, []);

  return {

    dragX,
    dragging,
    TRIGGER,
    canReply,

    bindBubble: {

      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();

        if (selectedMessages.size > 0) {
          toggleSelectMessage(id);
        }
      },

      onPointerDown: (e: React.PointerEvent) => {
        if (!canReply) return;
  
        setDragging(true);
        startX.current = e.clientX;
        hasMoved.current = false;
      },

      onPointerMove: (e: React.PointerEvent) => {

        if (!canReply || !dragging) return;

        const delta = e.clientX - startX.current;

        if (Math.abs(delta) > 8) {
          hasMoved.current = true;
        }

        if (!hasMoved.current) return;

        isDraggingRef.current = true;

        let raw = 0;

        if (isCurrentUser) {
          if (delta < 0) {
            raw = Math.abs(delta);
          }
        } else {
          if (delta > 0) {
            raw = delta;
          }
        }

        if (raw > 0) {

          const resisted = Math.min(
            MAX_DRAG,
            raw * 0.6 + Math.pow(raw, 0.7)
          );

          setDragX(resisted);

        }

      },

      onPointerUp: () => {

        const wasSwipe = hasMoved.current;

        setDragging(false);

        const wasDrag = dragX > 10;

        if (
          !wasSwipe &&
          !didLongPress.current &&
          isMediaMessage
        ) {
          openPreview();
        }

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 0);

        if (dragX > TRIGGER && canReply) {
          setReplyingTo(msg);
        }

        requestAnimationFrame(() => {
          setDragX(0);
        });

      },

      onPointerCancel: () => {
        setDragging(false);
        setDragX(0);
      },

      onTouchStart: (e: React.TouchEvent) => {

        didLongPress.current = false;

        const touch = e.touches[0];

        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        movedDuringTouch.current = false;

        longPressTimer.current = setTimeout(() => {

          if (!movedDuringTouch.current) {

            didLongPress.current = true;

            setActiveReaction(id);
            toggleSelectMessage(id);

          }

        }, 500);

      },

      onTouchMove: (e: React.TouchEvent) => {

        const touch = e.touches[0];

        const dx = Math.abs(
          touch.clientX - touchStartX.current
        );

        const dy = Math.abs(
          touch.clientY - touchStartY.current
        );

        if (dx > 5 || dy > 5) {

          movedDuringTouch.current = true;

          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }

        }

      },

      onTouchEnd: () => {

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        setTimeout(() => {
          didLongPress.current = false;
        }, 100);

      },

      onTouchCancel: () => {

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

      },

    },

  };

}