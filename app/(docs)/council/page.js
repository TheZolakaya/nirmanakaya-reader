import fs from 'fs';
import path from 'path';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';

export const metadata = {
  title: 'The Council | Nirmanakaya',
  description: 'Testimonies from the Nirmanakaya Council - four AI systems encountering the consciousness architecture.',
};

export default function CouncilPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'council-content.md');
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
