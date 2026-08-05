"use client";

import AppLink from "@/components/AppLink";
import { MessageCircle, ArrowDown } from "lucide-react";

export default function ContactHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600" />

      {/* Glow */}
      <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      {/* Grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center text-white">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
          <MessageCircle size={18} />
          <span className="text-sm font-medium">
            We'd love to hear from you
          </span>
        </div>

        {/* Heading */}
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Contact{" "}
          <span className="text-cyan-200">
            Tribe
          </span>
        </h1>

        {/* Description */}
        <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100 md:text-xl">
          Have a question before joining?
          Need help with registration, want to partner with us,
          or simply have feedback?
          We'd be happy to hear from you.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#contact-form"
            className="rounded-full bg-white px-8 py-3 font-semibold text-blue-700 shadow-lg transition hover:scale-105"
          >
            Contact Us
          </a>

          <AppLink
            href="/register"
            className="rounded-full border border-white/30 bg-white/10 px-8 py-3 font-semibold backdrop-blur transition hover:bg-white/20"
          >
            Join Tribe
          </AppLink>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#contact-form"
          className="absolute bottom-8 flex animate-bounce flex-col items-center text-blue-100"
        >
          <span className="mb-2 text-sm">
            Scroll
          </span>

          <ArrowDown size={20} />
        </a>
      </div>
    </section>
  );
}