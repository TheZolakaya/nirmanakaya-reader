export const metadata = {
  title: 'Privacy Policy | Nirmanakaya',
  description: 'Privacy policy for Nirmanakaya consciousness architecture platform',
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert prose-zinc max-w-none">
      <h1 className="text-3xl font-light text-amber-400 mb-2">Privacy Policy</h1>
      <p className="text-zinc-500 text-sm mb-8">Last updated: January 24, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Overview</h2>
        <p className="text-zinc-400">
          Nirmanakaya ("we," "our," or "us") is a consciousness architecture platform that provides 
          readings and guidance through the 78 signatures of consciousness. This Privacy Policy 
          explains how we collect, use, and protect your information when you use our service at 
          nirmanakaya.com.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Information We Collect</h2>
        
        <h3 className="text-lg text-zinc-300 font-normal mt-4">Account Information</h3>
        <p className="text-zinc-400">
          When you create an account using Google Sign-In, we receive and store:
        </p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Your email address</li>
          <li>Your display name</li>
          <li>Your profile picture URL (if provided by Google)</li>
        </ul>

        <h3 className="text-lg text-zinc-300 font-normal mt-4">Reading Data</h3>
        <p className="text-zinc-400">
          When you use Nirmanakaya, we store:
        </p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Questions you submit for readings</li>
          <li>Cards drawn and their interpretations</li>
          <li>Reading history and preferences</li>
          <li>Community discussions and replies you create</li>
        </ul>

        <h3 className="text-lg text-zinc-300 font-normal mt-4">Technical Information</h3>
        <p className="text-zinc-400">
          We automatically collect standard technical information including browser type, 
          device information, and usage patterns to improve our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">How We Use Your Information</h2>
        <p className="text-zinc-400">We use your information to:</p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Provide and personalize readings</li>
          <li>Save your reading history</li>
          <li>Send you emails about your readings (with your consent)</li>
          <li>Enable community features</li>
          <li>Improve our service</li>
        </ul>
        <p className="text-zinc-400 mt-4">
          We do not sell your personal information to third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Third-Party Services</h2>
        <p className="text-zinc-400">We use the following third-party services:</p>
        
        <ul className="text-zinc-400 list-disc list-inside space-y-2 mt-2">
          <li>
            <strong className="text-zinc-300">Google OAuth</strong> — For secure authentication. 
            Google's privacy policy applies to information collected during sign-in.
          </li>
          <li>
            <strong className="text-zinc-300">Supabase</strong> — For database and authentication 
            services. Data is stored securely in Supabase's infrastructure.
          </li>
          <li>
            <strong className="text-zinc-300">Anthropic (Claude)</strong> — For generating reading 
            interpretations. Your questions are processed by Anthropic's AI service.
          </li>
          <li>
            <strong className="text-zinc-300">Resend</strong> — For sending emails. Your email 
            address is shared with Resend when we send you communications.
          </li>
          <li>
            <strong className="text-zinc-300">Vercel</strong> — For hosting. Standard server logs 
            may be collected.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Data Retention</h2>
        <p className="text-zinc-400">
          We retain your account and reading data for as long as your account is active. 
          You can request deletion of your account and associated data at any time by 
          contacting us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Your Rights</h2>
        <p className="text-zinc-400">You have the right to:</p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your reading history</li>
          <li>Opt out of marketing emails</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Email Communications</h2>
        <p className="text-zinc-400">
          We may send you emails regarding your readings, account updates, and community 
          activity. You can manage your email preferences in your profile settings or 
          unsubscribe via the link in any email.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Security</h2>
        <p className="text-zinc-400">
          We implement industry-standard security measures to protect your data, including 
          encryption in transit (HTTPS) and secure authentication via OAuth 2.0. However, 
          no method of transmission over the internet is 100% secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Children's Privacy</h2>
        <p className="text-zinc-400">
          Nirmanakaya is not intended for children under 13. We do not knowingly collect 
          information from children under 13. If you believe we have collected such 
          information, please contact us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Changes to This Policy</h2>
        <p className="text-zinc-400">
          We may update this Privacy Policy from time to time. We will notify you of any 
          significant changes by posting the new policy on this page and updating the 
          "Last updated" date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Contact Us</h2>
        <p className="text-zinc-400">
          If you have questions about this Privacy Policy or your data, please contact us at:
        </p>
        <p className="text-zinc-400 mt-2">
          <a href="mailto:chriscrilly@gmail.com" className="text-amber-400 hover:text-amber-300">
            chriscrilly@gmail.com
          </a>
        </p>
      </section>

      <div className="border-t border-zinc-800 pt-6 mt-12">
        <a 
          href="/" 
          className="text-amber-400 hover:text-amber-300 text-sm"
        >
          ← Return to Nirmanakaya
        </a>
      </div>
    </div>
  );
}
