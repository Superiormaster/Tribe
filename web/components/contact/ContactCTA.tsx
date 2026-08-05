"use client";

import AppLink from "@/components/AppLink";
import { ArrowRight, Users } from "lucide-react";

export default function ContactCTA() {
  return (
    <section className="relative rounded-3xl overflow-hidden py-3">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />

      {/* Glow Effects */}
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 text-center text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
          <Users size={18} />
          Join the Community
        </div>

        <h2 className="mt-6 text-4xl font-bold md:text-5xl">
          Ready to become part of Tribe?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
          Create your account to discover communities, connect with
          creators, share your ideas, and access our dedicated Support
          Center whenever you need assistance.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <AppLink
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-blue-700 shadow-xl transition hover:scale-105"
          >
            Create Free Account
            <ArrowRight size={18} />
          </AppLink>

          <AppLink
            href="/auth/login"
            className="rounded-full border border-white/30 bg-white/10 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white/20"
          >
            Sign In
          </AppLink>
        </div>
      </div>
    </section>
  );
}