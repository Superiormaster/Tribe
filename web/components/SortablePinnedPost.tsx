'use client'

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export default function SortablePinnedPost({
  post,
  children
}: any) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: post.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "scale-[1.02] opacity-90"
          : ""
      }
    >
      {/* DRAG HANDLE */}
      <div
        {...attributes}
        {...listeners}
        className="
          flex justify-end
          px-2 pt-2
          cursor-grab
          active:cursor-grabbing
          text-gray-400
          touch-none
        "
      >
        ⋮⋮
      </div>

      {children}
    </div>
  )
}