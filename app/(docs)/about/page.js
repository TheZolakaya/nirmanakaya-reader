import fs from 'fs';
import path from 'path';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';

export const metadata = {
  title: 'What Is Nirmanakaya? | Nirmanakaya',
  description: 'A complete introduction to the consciousness architecture - the map, the math, and the invitation.',
};

export default function AboutPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'about-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <>
      {/* Global Header */}
      <Header />

      <article className="prose-invert pt-4">
        <MarkdownRenderer content={content} />
      </article>

      {/* Global Footer */}
      <Footer />
    </>
  );
}
