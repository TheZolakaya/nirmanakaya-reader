// === SHARED READING PAGE (Server Component) ===
// Fetches reading data server-side for generateMetadata (OG tags)
// then passes to SharedReading client component for rich rendering

import { getPublicReadingServer } from '../../../lib/supabase-server';
import { getComponent } from '../../../lib/corrections';
import SharedReading from './SharedReading';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nirmanakaya.com';

function getModeLabel(mode) {
  const labels = {
    reflect: 'Reflect',
    discover: 'Discover',
    forge: 'Forge',
    explore: 'Explore',
    firstContact: 'First Contact'
  };
  return labels[mode] || mode || 'Reading';
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: reading } = await getPublicReadingServer(slug);

  if (!reading) {
    return {
      title: 'Reading Not Found | Nirmanakaya',
      description: 'This reading is no longer available.',
    };
  }

  const modeLabel = getModeLabel(reading.mode);
  const title = `${modeLabel} Reading | Nirmanakaya`;

  // Build description from question + card names
  let description = '';
  if (reading.question) {
    description = `"${reading.question}" — `;
  }
  if (reading.cards && Array.isArray(reading.cards)) {
    const cardNames = reading.cards.map(c => {
      const trans = getComponent(c.transient);
      return trans?.name || `Card ${c.transient}`;
    });
    description += cardNames.join(', ');
  }
  if (!description) {
    description = 'A Nirmanakaya consciousness architecture reading';
  }
  // Truncate for OG
  if (description.length > 200) {
    description = description.slice(0, 197) + '...';
  }

  const url = `${SITE_URL}/r/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Nirmanakaya',
      type: 'article',
      images: [
        {
          url: `${url}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${modeLabel} Reading — Nirmanakaya`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${url}/opengraph-image`],
    },
  };
}

export default async function SharedReadingPage({ params }) {
  const { slug } = await params;
  const { data: reading, error } = await getPublicReadingServer(slug);

  return <SharedReading reading={reading} error={error ? 'Reading not found or is no longer public' : null} />;
}
