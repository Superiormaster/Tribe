// app/auth/layout.tsx
'use client';

import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 animated-bg -z-10"></div>

      {/* Floating Blobs / Soft Lights */}
      <div className="absolute inset-0">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>

      {/* Centered Form */}
      <div className="relative z-10 w-full max-w-md p-3 rounded-2xl
                      bg-white/70 dark:bg-zinc-900/70
                      backdrop-blur-xl
                      border border-white/20
                      shadow-2xl">
        {children}
      </div>
    </main>
  );
}