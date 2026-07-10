"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen my-16 bg-background text-gray-700 dark:text-gray-300">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>

        <p className="text-sm text-gray-500 mb-8">
          Last updated: <span className="font-medium">June 2026</span>
        </p>

        {/* CONTENT */}
        <section className="space-y-6 text-sm leading-6">

          <p>
            Welcome to Tribe. Your privacy is important to us. This Privacy Policy explains how we collect,
            use, and protect your information when you use our platform.
          </p>

          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p>
            We collect information you provide directly (such as username, email, profile details)
            and data generated through your use of the app (posts, interactions, activity logs).
          </p>

          <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
          <p>
            We use your data to provide and improve services, personalize your experience,
            ensure safety, and maintain platform integrity.
          </p>

          <h2 className="text-xl font-semibold">3. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share limited information with service providers
            only when necessary to operate the platform.
          </p>

          <h2 className="text-xl font-semibold">4. Security</h2>
          <p>
            We implement security measures to protect your data, but no system is 100% secure.
          </p>

          <h2 className="text-xl font-semibold">5. Your Rights</h2>
          <p>
            You can update, modify, or request deletion of your personal data at any time from your account settings.
          </p>

          <h2 className="text-xl font-semibold">6. Changes</h2>
          <p>
            This policy may be updated before launch. Final updates will be reflected before release.
          </p>

        </section>
      </div>
    </div>
  );
}