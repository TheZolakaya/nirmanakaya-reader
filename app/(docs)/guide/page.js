import fs from 'fs';
import path from 'path';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';

export const metadata = {
  title: 'Reader Guide | Nirmanakaya',
  description: 'Complete guide to using the Nirmanakaya Reader - modes, depths, voice customization, and more.',
};

export default function GuidePage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'guide-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <>
      {/* Global Brand Header */}
      <BrandHeader compact />

      <article className="prose-invert pt-4">
        <MarkdownRenderer content={content} />
      </article>

      {/* Global Footer */}
      <Footer />
    </>
  );
}
