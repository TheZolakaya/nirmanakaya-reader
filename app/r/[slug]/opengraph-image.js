// === DYNAMIC OG IMAGE FOR SHARED READINGS ===
// Generates a 1200x630 image for social media sharing
// Uses Next.js ImageResponse (Satori) to render JSX to PNG
// Features: random fractal background, card thumbnails, synthesis text

import { ImageResponse } from 'next/og';
import { getPublicReadingServer } from '../../../lib/supabase-server';
import { getComponent } from '../../../lib/corrections';
import { getCardThumbPath } from '../../../lib/cardImages';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nirmanakaya.com';

// Background images (same as app/page.js imageBackgrounds)
const BACKGROUNDS = [
  '/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_1.png',
  '/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_3.png',
  '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_0.png',
  '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_1.png',
  '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_2.png',
  '/images/Zolakaya_imaginary_green_Lucious_fractal_garden_calm_forest_w_ff789520-3ec5-437d-b2da-d378d9a837f2_0.png',
  '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_0.png',
  '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_2.png',
  '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_3.png',
  '/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_0.png',
  '/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_3.png',
];

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

// Deterministic hash from slug -> consistent background per reading
function hashSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Extract shallow synthesis text (first 1-2 sentences from shallowest depth)
function getSynthesisShallow(synthesis) {
  if (!synthesis?.summary) return null;
  let text = null;
  const summary = synthesis.summary;
  if (typeof summary === 'string') {
    text = summary;
  } else if (typeof summary === 'object') {
    text = summary.surface || summary.wade || summary.swim || summary.deep || null;
  }
  if (!text) return null;
  // Extract first 2 sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const shallow = sentences.slice(0, 2).join(' ');
  // Truncate if still too long
  if (shallow.length > 200) return shallow.slice(0, 197) + '...';
  return shallow;
}

async function fetchImage(path) {
  try {
    const res = await fetch(`${SITE_URL}${path}`);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
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

  // Pick a deterministic background based on slug hash
  const bgIndex = hashSlug(slug) % BACKGROUNDS.length;
  const bgPath = BACKGROUNDS[bgIndex];

  // Load background and card thumbnails in parallel
  const [bgData, ...cardResults] = await Promise.all([
    fetchImage(bgPath),
    ...cards.map(async (card) => {
      const trans = getComponent(card.transient);
      const imgData = await fetchImage(getCardThumbPath(card.transient));
      const statusColor = STATUS_COLORS[card.status] || STATUS_COLORS[1];
      return {
        name: trans?.name || `Card ${card.transient}`,
        imgData,
        statusColor,
      };
    })
  ]);

  // Get synthesis shallow text
  const synthesisText = getSynthesisShallow(reading.synthesis);

  // Truncate question
  let question = reading.question || '';
  if (question.length > 100) {
    question = question.slice(0, 97) + '...';
  }

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        {bgData ? (
          <img
            src={bgData}
            width={1200}
            height={630}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          }} />
        )}

        {/* Dark overlay for text readability */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.8) 100%)',
          display: 'flex',
        }} />

        {/* Content layer */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', width: '100%', height: '100%',
          padding: '24px 40px',
        }}>
          {/* Top branding */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 300, letterSpacing: 10,
              color: '#fbbf24',
              marginBottom: 4,
              display: 'flex',
            }}>
              NIRMANAKAYA
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 300, color: modeColor }}>
                {modeLabel}
              </span>
              <span style={{ fontSize: 32, fontWeight: 300, color: 'rgba(255,255,255,0.7)' }}>
                Reading
              </span>
            </div>
          </div>

          {/* Card thumbnails row */}
          {cardResults.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              gap: 24, marginBottom: 12, flex: 1,
            }}>
              {cardResults.map((card, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6,
                }}>
                  <div style={{
                    display: 'flex', padding: 4, borderRadius: 10,
                    background: `linear-gradient(135deg, rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.7), transparent 50%, rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.7))`,
                    boxShadow: `0 0 30px rgba(${card.statusColor.r}, ${card.statusColor.g}, ${card.statusColor.b}, 0.5)`,
                  }}>
                    {card.imgData ? (
                      <img
                        src={card.imgData}
                        width={140}
                        height={210}
                        style={{ borderRadius: 8 }}
                      />
                    ) : (
                      <div style={{
                        width: 140, height: 210, borderRadius: 8,
                        background: 'rgba(39,39,42,0.8)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#71717a', fontSize: 16,
                      }}>
                        Card
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 15, color: 'rgba(255,255,255,0.9)',
                    maxWidth: 140, textAlign: 'center',
                    display: 'flex',
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  }}>
                    {card.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom text area */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, maxWidth: 1060,
          }}>
            {/* Question */}
            {question && (
              <div style={{
                fontSize: 17, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic',
                textAlign: 'center',
                display: 'flex',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>
                {`\u201C${question}\u201D`}
              </div>
            )}

            {/* Synthesis shallow */}
            {synthesisText && (
              <div style={{
                fontSize: 18, color: 'rgba(255,255,255,0.85)',
                textAlign: 'center',
                lineHeight: 1.5,
                display: 'flex',
                textShadow: '0 1px 5px rgba(0,0,0,0.95)',
              }}>
                {synthesisText}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
