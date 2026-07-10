"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen my-16 bg-background text-gray-700 dark:text-gray-300">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>

        <p className="text-sm text-gray-500 mb-8">
          Last updated: <span className="font-medium">June 2026</span>
        </p>

        {/* CONTENT */}
        <section className="space-y-6 text-sm leading-6">

          <p>
            By using Tribe, you agree to these Terms & Conditions. Please read them carefully before using the platform.
          </p>

          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Tribe, you agree to comply with these terms and all applicable laws.
          </p>

          <h2 className="text-xl font-semibold">2. User Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account and all activities under it.
          </p>

          <h2 className="text-xl font-semibold">3. Content</h2>
          <p>
            Users are responsible for content they post. We reserve the right to remove content that violates policies.
          </p>

          <h2 className="text-xl font-semibold">4. Prohibited Use</h2>
          <p>
            You may not use Tribe for illegal activities, harassment, spam, or harmful behavior.
          </p>

          <h2 className="text-xl font-semibold">5. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these terms.
          </p>

          <h2 className="text-xl font-semibold">6. Changes</h2>
          <p>
            These terms may be updated before launch. Continued use means acceptance of updates.
          </p>

        </section>
      </div>
    </div>
  );
}