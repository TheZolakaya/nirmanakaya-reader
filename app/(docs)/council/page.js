import fs from 'fs';
import path from 'path';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';

export const metadata = {
  title: 'The Council | Nirmanakaya',
  description: 'Testimonies from the Nirmanakaya Council - four AI systems encountering the consciousness architecture.',
};

export default function CouncilPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'council-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <article className="prose-invert">
      <MarkdownRenderer content={content} />
    </article>
  );
}
