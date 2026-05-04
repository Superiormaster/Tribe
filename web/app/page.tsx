"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { tribe2 } from "@/assets";
import LoadingScreen from '@/components/LoadingScreen';
import useAuthRedirect from "@/utils/useAuthRedirect";
import { useState, useEffect } from 'react';

export default function Home() {

  const router = useRouter()
  const [loading, setLoading] = useState(true);
  useAuthRedirect();
  
  if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-200 dark:border-gray-800">

        <div className="w-16 h-16 border dark:border-indigo-600 rounded-full overflow-hidden shadow">
          <Image src={tribe2} alt="Tribe Logo" />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 rounded-lg border"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/auth/register")}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            Get Started
          </button>
        </div>

      </nav>

      {/* HERO SECTION */}
      <section className="text-center py-24 px-6">

        <h1 className="text-5xl font-bold mb-6">
          Find Your Tribe
        </h1>

        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
          A community-driven social platform where people connect,
          share ideas, post content, and build communities.
        </p>

        <div className="flex justify-center gap-4">

          <button
            onClick={() => router.push("/auth/register")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-lg"
          >
            Join Tribe
          </button>

          <button
            onClick={() => router.push("/auth/login")}
            className="px-6 py-3 border rounded-xl text-lg"
          >
            Login
          </button>

        </div>

      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-10 px-10 py-20">

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            Create Posts
          </h3>
          <p className="text-gray-500">
            Share your thoughts, ideas, and media with your community.
          </p>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            Join Communities
          </h3>
          <p className="text-gray-500">
            Discover communities built around your interests.
          </p>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            Engage & Connect
          </h3>
          <p className="text-gray-500">
            Like, comment, and share posts with people across the world.
          </p>
        </div>

      </section>

      {/* CTA */}
      <section className="text-center py-20 bg-gray-50 dark:bg-gray-900">

        <h2 className="text-3xl font-bold mb-6">
          Ready to join your Tribe?
        </h2>

        <button
          onClick={() => router.push("/auth/register")}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-lg"
        >
          Create Account
        </button>

      </section>

      {/* FOOTER */}
      <footer className="text-center py-6 text-sm text-gray-500 border-t border-gray-200 dark:border-gray-800">
        © {new Date().getFullYear()} Tribe. All rights reserved.
      </footer>

    </div>
  )
}