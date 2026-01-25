export const metadata = {
  title: 'Terms of Service | Nirmanakaya',
  description: 'Terms of service for Nirmanakaya consciousness architecture platform',
};

export default function TermsPage() {
  return (
    <div className="prose prose-invert prose-zinc max-w-none">
      <h1 className="text-3xl font-light text-amber-400 mb-2">Terms of Service</h1>
      <p className="text-zinc-500 text-sm mb-8">Last updated: January 24, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Agreement to Terms</h2>
        <p className="text-zinc-400">
          By accessing or using Nirmanakaya at nirmanakaya.com, you agree to be bound by these 
          Terms of Service. If you do not agree to these terms, please do not use our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Description of Service</h2>
        <p className="text-zinc-400">
          Nirmanakaya is a consciousness architecture platform that provides readings and guidance 
          through the 78 signatures of consciousness. The service includes:
        </p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Consciousness readings based on mathematical architecture</li>
          <li>Personal reading history and journaling</li>
          <li>Community discussion features</li>
          <li>Educational content about consciousness architecture</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Nature of Readings</h2>
        <p className="text-zinc-400">
          Nirmanakaya readings are tools for reflection and self-inquiry. They are:
        </p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Not predictions of the future</li>
          <li>Not substitutes for professional medical, psychological, financial, or legal advice</li>
          <li>Offered as invitations for reflection, not prescriptions</li>
          <li>Based on a mathematical consciousness architecture, not fortune-telling</li>
        </ul>
        <p className="text-zinc-400 mt-4">
          You are responsible for how you interpret and act upon any reading. We encourage 
          consulting appropriate professionals for medical, mental health, financial, or legal matters.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">User Accounts</h2>
        <p className="text-zinc-400">
          To access certain features, you must create an account using Google Sign-In. You agree to:
        </p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Provide accurate information</li>
          <li>Maintain the security of your account</li>
          <li>Accept responsibility for all activities under your account</li>
          <li>Notify us immediately of any unauthorized access</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Acceptable Use</h2>
        <p className="text-zinc-400">You agree not to:</p>
        <ul className="text-zinc-400 list-disc list-inside space-y-1">
          <li>Use the service for any unlawful purpose</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Post content that is hateful, violent, or discriminatory</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Use automated tools to access the service without permission</li>
          <li>Misrepresent your identity or affiliation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">User Content</h2>
        <p className="text-zinc-400">
          You retain ownership of content you create (questions, discussions, etc.). By posting 
          content to public areas of Nirmanakaya, you grant us a non-exclusive license to display 
          that content as part of the service.
        </p>
        <p className="text-zinc-400 mt-4">
          We may remove content that violates these terms or is otherwise objectionable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Intellectual Property</h2>
        <p className="text-zinc-400">
          The Nirmanakaya consciousness architecture, including the 78 signatures, five houses, 
          and associated frameworks, is the intellectual property of Chris Crilly. The service 
          design, code, and content are owned by Nirmanakaya or its licensors.
        </p>
        <p className="text-zinc-400 mt-4">
          You may not reproduce, distribute, or create derivative works from our intellectual 
          property without permission.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Disclaimer of Warranties</h2>
        <p className="text-zinc-400">
          Nirmanakaya is provided "as is" without warranties of any kind, either express or implied. 
          We do not guarantee that the service will be uninterrupted, error-free, or meet your 
          specific requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Limitation of Liability</h2>
        <p className="text-zinc-400">
          To the maximum extent permitted by law, Nirmanakaya and its operators shall not be liable 
          for any indirect, incidental, special, consequential, or punitive damages arising from 
          your use of the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Termination</h2>
        <p className="text-zinc-400">
          We may suspend or terminate your access to the service at any time for violations of 
          these terms or for any other reason at our discretion. You may also delete your account 
          at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Changes to Terms</h2>
        <p className="text-zinc-400">
          We may modify these terms at any time. Continued use of the service after changes 
          constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl text-zinc-200 font-normal">Contact</h2>
        <p className="text-zinc-400">
          Questions about these Terms of Service? Contact us at:
        </p>
        <p className="text-zinc-400 mt-2">
          <a href="mailto:zolakaya@nirmanakaya.com" className="text-amber-400 hover:text-amber-300">
            zolakaya@nirmanakaya.com
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
