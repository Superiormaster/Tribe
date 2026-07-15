'use client'

import Image from "next/image";
import { tribe2 } from "@/assets";

interface AuthLoadingProps {
  show: boolean
  text?: string
}

export default function AuthLoading({
  show,
  text = "Signing you in..."
}: AuthLoadingProps) {

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center">

        <div className="w-16 h-16 border border-indigo-600 rounded-full overflow-hidden shadow">
          <Image
            src={tribe2}
            alt="Tribe Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="mt-6 h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />

        <p className="mt-5 text-white text-lg font-medium">
          {text}
        </p>

      </div>
    </div>
  );
}