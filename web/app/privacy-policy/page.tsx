"use client";

export default function PrivacyPolicyPage() {
  return (
    <main className="relative h-screen bg-background text-gray-700 dark:text-gray-300 py-5">

      <div className="max-w-4xl mx-auto px-5">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Privacy Policy
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Last updated: <span className="font-medium">August 2026</span>
          </p>
        </header>

        <div className="space-y-8 text-sm leading-7">

          <section>
            <p>
              Welcome to <strong>Tribe</strong>. We respect your privacy and are
              committed to protecting your personal information. This Privacy
              Policy explains what information we collect, how we use it, and
              the choices you have when using our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Information We Collect
            </h2>

            <p>
              We may collect information you provide directly when creating an
              account or using Tribe, including:
            </p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Username and display name</li>
              <li>Email address</li>
              <li>Profile photo and bio</li>
              <li>Posts, comments, reactions, and messages</li>
              <li>Communities you create or join</li>
              <li>Media you upload such as images, videos, GIFs, and voice messages</li>
            </ul>

            <p className="mt-4">
              We also collect technical information such as your device type,
              browser, IP address, approximate location, and usage statistics to
              help improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Information
            </h2>

            <p>Your information is used to:</p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Create and manage your account.</li>
              <li>Provide messaging, communities, and social features.</li>
              <li>Personalize your experience.</li>
              <li>Improve platform performance and reliability.</li>
              <li>Detect spam, fraud, abuse, and security threats.</li>
              <li>Respond to support requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Data Sharing
            </h2>

            <p>
              We do not sell your personal information.
            </p>

            <p className="mt-3">
              We may share information only with trusted service providers that
              help us operate Tribe, such as cloud hosting, media storage, email
              delivery, and security services. These providers only receive the
              information necessary to perform their services.
            </p>

            <p className="mt-3">
              We may also disclose information if required by law or to protect
              the safety, rights, and security of our users and platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Cookies and Local Storage
            </h2>

            <p>
              Tribe uses cookies and similar technologies, including local
              storage, to keep you signed in, remember your preferences,
              improve performance, and enhance your experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              5. Data Security
            </h2>

            <p>
              We use reasonable administrative, technical, and organizational
              measures to protect your information from unauthorized access,
              loss, misuse, or disclosure. However, no online service can
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. Your Rights
            </h2>

            <p>
              You can update your profile information, manage your account
              settings, or request account deletion where available. Depending
              on your location, you may also have additional privacy rights
              under applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              7. Children's Privacy
            </h2>

            <p>
              Tribe is not intended for children under the age required by
              applicable law. We do not knowingly collect personal information
              from children. If we become aware that such information has been
              collected, we will take appropriate steps to remove it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Third-Party Services
            </h2>

            <p>
              Tribe may rely on trusted third-party providers for services such
              as cloud hosting, media storage, authentication, email delivery,
              analytics, and content delivery. These providers process data only
              as necessary to support the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Changes to This Privacy Policy
            </h2>

            <p>
              We may update this Privacy Policy from time to time as Tribe
              evolves or legal requirements change. Any updates will be posted
              on this page, and the "Last updated" date will be revised
              accordingly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              10. Contact Us
            </h2>

            <p>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal information, please contact the
              Tribe support team through the app or our official support email.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}