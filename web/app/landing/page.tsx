"use client";

import { useContext } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import LoadingScreen from "@/components/LoadingScreen";
import { UserContext } from "@/components/UserContext";
import { useNavigation } from "@/utils/useNavigation";
import { tribe2 } from "@/assets";

export default function Home() {
  const { replace } = useNavigation();
  const { user, authReady, loadingUser } = useContext(UserContext)!;

  if (!authReady || loadingUser) {
    return (
      <LoadingScreen
        onComplete={() => {}}
      />
    );
  }
  
  if (user) {
    replace("/main/home");
    return null;
  }

  return (
    <div className="relative h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 animated-bg -z-10"></div>

      {/* Floating Blobs / Soft Lights */}
      <div className="absolute inset-0">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>
  
      <div className="relative z-10">
        {/* NAVBAR */}
        <nav className="flex justify-between items-center px-3 py-4 border-b border-gray-600 dark:border-gray-400">
  
          <div className="w-16 h-16 border dark:border-indigo-600 border-indigo-600 rounded-full overflow-hidden shadow">
            <Image src={tribe2} alt="Tribe Logo" />
          </div>
  
          <div className="flex gap-4">
            <AppLink
              href={"/auth/login"}
              className="px-4 py-2 rounded-lg border-indigo-600 dark:border-gray-200 border"
            >
              Login
            </AppLink>
  
            <AppLink
              href={"/auth/register"}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
            >
              Get Started
            </AppLink>
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
  
            <AppLink
              href={"/auth/register"}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-lg"
            >
              Join Tribe
            </AppLink>
  
            <AppLink
              href={"/auth/login"}
              className="px-6 py-3 border border-indigo-600 dark:border-gray-200 rounded-xl text-lg"
            >
              Login
            </AppLink>
  
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
  
          <AppLink
            href={"/auth/register"}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-lg"
          >
            Create Account
          </AppLink>
  
        </section>
  
        {/* FOOTER */}
        <footer className="border-t border-gray-600 dark:border-gray-400 py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        
            <p className="text-center">
              © {new Date().getFullYear()} Superior Masters Int'l Ltd. All rights reserved.
            </p>
        
            <div className="flex items-center gap-5">
              <AppLink
                href="/privacy-policy"
                className="hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </AppLink>
        
              <AppLink
                href="/terms"
                className="hover:text-indigo-600 transition-colors"
              >
                Terms & Conditions
              </AppLink>
        
              <AppLink
                href="/contact"
                className="hover:text-indigo-600 transition-colors"
              >
                Contact
              </AppLink>
            </div>
        
          </div>
        </footer>
      </div>

    </div>
  )
}// test
