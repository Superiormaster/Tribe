"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Do I need a Tribe account to contact you?",
    answer:
      "No. Anyone can send us a message using the contact form. If you already have an account, we recommend using the Support page to track your requests.",
  },
  {
    question: "How long does it take to receive a reply?",
    answer:
      "Our team typically responds within 24–48 hours, although response times may be longer during busy periods.",
  },
  {
    question: "Where can I report issues after creating an account?",
    answer:
      "After signing in, visit the Support page to create support requests, monitor their status, and receive replies from our team.",
  },
  {
    question: "I already have an account.",
    answer:
      "Please sign in and use the Support page to create and track your support requests.",
  },
];
{/* {
    question: "Can I contact Tribe about partnerships or business opportunities?",
    answer:
      "Yes. We welcome partnership, media, investment, and business enquiries. Simply include the details in your message and we'll get back to you.",
  },*/}

export default function ContactFAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-4 px-2">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold dark:text-white">
            Frequently Asked Questions
          </h2>

          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Find answers to some of the most common questions about
            contacting the Tribe team.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = open === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-sm dark:border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpen(isOpen ? null : index)
                  }
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-muted/40"
                >
                  <span className="font-semibold dark:text-white">
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={`transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    size={20}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ${
                    isOpen
                      ? "grid-rows-[1fr]"
                      : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t px-6 py-5 text-gray-600 dark:border-zinc-800 dark:text-gray-400">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}