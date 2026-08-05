"use client";

import ContactForm from "@/components/contact/ContactForm";
import ContactFAQ from "@/components/contact/ContactFAQ";
import ContactCTA from "@/components/contact/ContactCTA";
import AppLink from "@/components/AppLink";
import ContactHero from "@/components/contact/ContactHero";
import {
  MessageCircle,
  Shield,
  Users,
  HelpCircle,
} from "lucide-react";

export default function ContactPage() {
  return (
    <main className="bg-background text-gray-700 dark:text-gray-300">
      <ContactHero />

      {/* Cards */}
      <section className="mx-auto -mt-10 max-w-6xl px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <Shield className="mb-4 text-blue-600" size={28} />
            <h3 className="font-semibold dark:text-white">
              Safe & Secure
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your information is handled securely and only used to
              respond to your enquiry.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <Users className="mb-4 text-purple-600" size={28} />
            <h3 className="font-semibold dark:text-white">
              Community First
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Whether you're a creator, member or business, we're here
              to help.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <HelpCircle className="mb-4 text-cyan-600" size={28} />
            <h3 className="font-semibold dark:text-white">
              Quick Replies
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Most enquiries receive a response within 24–48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold dark:text-white">
              Send Us a Message
            </h2>

            <p className="mt-3 text-gray-500">
              Fill out the form and we'll review your message as soon as
              possible.
            </p>

            <div id="contact-form" className="mt-8 rounded-3xl border bg-card p-6">
              <ContactForm />
            </div>
          </div>

          <ContactFAQ />
          <ContactCTA />
        </div>
      </section>
    </main>
  );
}