// === DYNAMIC OG IMAGE FOR SHARED READINGS ===
// Generates a 1200x630 image for social media sharing
// Uses Next.js ImageResponse (Satori) to render JSX to PNG

import { ImageResponse } from 'next/og';
import { getPublicReadingServer } from '../../../lib/supabase-server';
import { getComponent } from '../../../lib/corrections';
import { getCardThumbPath } from '../../../lib/cardImages';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nirmanakaya.com';

// Status to RGB color mapping
const STATUS_COLORS = {
  1: { r: 16, g: 185, b: 129 },   // Balanced - emerald
  2: { r: 245, g: 158, b: 11 },    // Too Much - amber
  3: { r: 56, g: 189, b: 248 },    // Too Little - sky
  4: { r: 167, g: 139, b: 250 },   // Unacknowledged - violet
};

const MODE_COLORS = {
  reflect: 'rgb(96, 165, 250)',   // blue-400
  discover: 'rgb(251, 191, 36)',  // amber-400
  forge: 'rgb(251, 146, 60)',     // orange-400
  explore: 'rgb(52, 211, 153)',   // emerald-400
  firstContact: 'rgb(161, 161, 170)', // zinc-400
};

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

async function loadCardImage(transient) {
  const thumbPath = getCardThumbPath(transient);
  if (!thumbPath) return null;

  try {
    // Fetch thumbnail from public CDN URL
    const url = `${SITE_URL}${thumbPath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OGImage({ params }) {
  const { slug } = await params;
  const { data: reading } = await getPublicReadingServer(slug);

  if (!reading) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: 48, fontWeight: 300, color: '#fbbf24', marginBottom: 16, display: 'flex' }}>
            NIRMANAKAYA
          </div>
          <div style={{ fontSize: 24, color: '#71717a', display: 'flex' }}>
            Reading not found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const modeLabel = getModeLabel(reading.mode);
  const modeColor = MODE_COLORS[reading.mode] || MODE_COLORS.discover;
  const cards = reading.cards && Array.isArray(reading.cards) ? reading.cards.slice(0, 5) : [];

  // Load card thumbnail images in parallel
  const cardImages = await Promise.all(
    cards.map(async (card) => {
      const trans = getComponent(card.transient);
      const imgData = await loadCardImage(card.transient);
      const statusColor = STATUS_COLORS[card.status] || STATUS_COLORS[1];
      return {
        name: trans?.name || `Card ${card.transient}`,
        status: card.status,
        imgData,
        statusColor,
      };
    })
  );

  // Truncate question
  let question = reading.question || '';
  if (question.length > 120) {
    question = question.slice(0, 117) + '...';
  }

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center',
        background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
        fontFamily: 'sans-serif',
        padding: '40px 60px',
      }}>
        {/* Top branding */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 20, fontWeight: 300, letterSpacing: 8,
            color: '#fbbf24',
            marginBottom: 8,
            display: 'flex',
          }}>
            NIRMANAKAYA
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28, fontWeight: 300, color: modeColor }}>
              {modeLabel}
            </span>
            <span style={{ fontSize: 28, fontWeight: 300, color: '#a1a1aa' }}>
              Reading
            </span>
          </div>
        </div>

        {/* Card thumbnails row */}
        {cardImages.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            gap: 24, marginBottom: 24, flex: 1,
          }}>
            {cardImages.map((card, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8,
              }}>
                {/* Card image with status border */}
                <div style={{
                  display: 'flex', padding: 3,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.6), transparent 50%, rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.6))`,
                  boxShadow: `0 0 20px rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.3)`,
                }}>
                  {card.imgData ? (
                    <img
                      src={card.imgData}
                      width={120}
                      height={180}
                      style={{ borderRadius: 6 }}
                    />
                  ) : (
                    <div style={{
                      width: 120, height: 180, borderRadius: 6,
                      background: '#27272a', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#52525b', fontSize: 14,
                    }}>
                      Card
                    </div>
                  )}
                </div>
                {/* Card name */}
                <div style={{
                  fontSize: 13, color: '#d4d4d8',
                  maxWidth: 120, textAlign: 'center',
                  display: 'flex',
                }}>
                  {card.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question at bottom */}
        {question && (
          <div style={{
            fontSize: 18, color: '#a1a1aa', fontStyle: 'italic',
            textAlign: 'center', maxWidth: 900,
            lineHeight: 1.4,
            display: 'flex',
          }}>
            {`\u201C${question}\u201D`}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
