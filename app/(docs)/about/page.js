import fs from 'fs';
import path from 'path';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';

export const metadata = {
  title: 'Why Nirmanakaya Isn\'t Tarot | Nirmanakaya',
  description: 'The difference between fortune-telling and consciousness navigation.',
};

export default function AboutPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'about-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <article className="prose-invert">
      <MarkdownRenderer content={content} />
    </article>
  );
}
