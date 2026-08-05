"use client";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-gray-700 dark:text-gray-300 py-5">
      <div className="max-w-4xl mx-auto px-5">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Terms & Conditions
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Last updated: <span className="font-medium">August 2026</span>
          </p>
        </header>

        <div className="space-y-8 text-sm leading-7">

          <section>
            <p>
              Welcome to <strong>Tribe</strong>. These Terms & Conditions
              govern your access to and use of the Tribe platform. By creating
              an account or using our services, you agree to be bound by these
              terms. If you do not agree, please do not use Tribe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Eligibility
            </h2>

            <p>
              You must meet the minimum age required by applicable law to use
              Tribe. By using the platform, you confirm that you have the legal
              capacity to accept these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. Your Account
            </h2>

            <p>
              You are responsible for maintaining the security of your account,
              password, and any activity that occurs under your account. Please
              notify us immediately if you believe your account has been
              accessed without authorization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. User Content
            </h2>

            <p>
              You retain ownership of the content you post on Tribe. By
              uploading content, you grant Tribe a limited license to display,
              store, and distribute that content solely for operating and
              improving the platform.
            </p>

            <p className="mt-3">
              You are solely responsible for the content you publish and must
              ensure it does not violate any laws or the rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Acceptable Use
            </h2>

            <p>You agree not to:</p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Post illegal or harmful content.</li>
              <li>Harass, threaten, or abuse other users.</li>
              <li>Share spam, scams, or misleading information.</li>
              <li>Upload malicious software or harmful code.</li>
              <li>Impersonate another person or organization.</li>
              <li>Attempt to gain unauthorized access to Tribe's systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              5. Communities and Messages
            </h2>

            <p>
              Tribe provides communities, private messaging, and other social
              features. Users are responsible for their interactions and should
              communicate respectfully. We may moderate or remove content that
              violates these Terms or our community guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. Intellectual Property
            </h2>

            <p>
              The Tribe platform, including its design, branding, software, and
              original content, is protected by intellectual property laws.
              Unless otherwise permitted, you may not copy, modify, or
              distribute any part of the platform without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              7. Account Suspension and Termination
            </h2>

            <p>
              We reserve the right to suspend or permanently terminate accounts
              that violate these Terms, engage in abusive behavior, or threaten
              the safety and security of the platform or its users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Disclaimer
            </h2>

            <p>
              Tribe is provided on an "as is" and "as available" basis. While
              we strive to provide a reliable service, we cannot guarantee that
              the platform will always be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Limitation of Liability
            </h2>

            <p>
              To the fullest extent permitted by law, Tribe and its operators
              shall not be liable for indirect, incidental, or consequential
              damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              10. Changes to These Terms
            </h2>

            <p>
              We may update these Terms & Conditions from time to time. When we
              do, we will update the "Last updated" date on this page.
              Continued use of Tribe after changes become effective constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              11. Contact Us
            </h2>

            <p>
              If you have any questions about these Terms & Conditions, please
              contact the Tribe support team through the app or our official
              support email.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}