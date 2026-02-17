// app/api/card-depth/route.js
// V3: Single-depth card interpretation — always full depth, all structural data
// No progressive deepening. One pass. Full transmission.

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../../lib/spreads.js';
import { STATUSES } from '../../../lib/constants.js';
import {
  getArchetypeCorrection,
  getBoundCorrection,
  getAgentCorrection,
  getComponent
} from '../../../lib/corrections.js';
import { fetchWithRetry } from "../../../lib/fetchWithRetry.js";

export async function POST(request) {
  const {
    cardIndex,      // Which card (0-indexed)
    draw,           // The card draw data {transient, status, position}
    question,       // Original question
    spreadType,     // 'discover' | 'reflect' | 'forge' | 'explore'
    spreadKey,      // Spread name
    system,         // Base system prompt (for caching)
    letterContent,  // Letter content for context
    model,
    // Frame context (from preset spreads)
    frameLabel,     // e.g., "Foundation" - the spread position label
    frameLens,      // e.g., "This signature is how your practical reality is expressing..."
    // DTP token context (optional)
    token,          // e.g., "Fear" - the user's token this card is reading
    originalInput,  // e.g., "I'm worried about my marriage" - full question for grounding
    userContext,     // Optional user journey context block
    showArchitecture // Whether architecture terms are visible (default: false)
  } = await request.json();

  const effectiveModel = model || "claude-sonnet-4-20250514";
  const n = cardIndex + 1; // 1-indexed for markers

  // Build card-specific user message — single pass, all structural data
  const baseMessage = buildCardMessage(n, draw, question, spreadType, spreadKey, letterContent, token, originalInput, frameLabel, frameLens, showArchitecture);

  // Prepend user journey context if available
  const userMessage = userContext ? `${userContext}\n\n${baseMessage}` : baseMessage;

  // Convert system prompt to cached format for 90% input token savings
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

  // Single-depth full interpretation — generous budget for complete transmission
  // Must accommodate READING (5-8 paras) + MIRROR (2-3) + WHY (3-5) + REBALANCER/GROWTH (3-5)
  const maxTokens = 12000;

  try {
    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: maxTokens,
        system: systemWithCache,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();

    // Check for Anthropic API errors (credit issues, rate limits, etc.)
    if (data.error) {
      const errorType = data.error.type || 'unknown';
      const errorMsg = data.error.message || 'Unknown API error';
      console.error('Anthropic API error:', errorType, errorMsg);
      return Response.json({
        error: `API Error (${errorType}): ${errorMsg}`
      }, { status: 500 });
    }

    // Check for empty or invalid response
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('Empty API response:', JSON.stringify(data).substring(0, 500));
      return Response.json({
        error: 'API returned empty response. This may indicate a service issue.'
      }, { status: 500 });
    }

    let text = data.content?.map(item => item.text || "").join("\n") || "";
    const stopReason = data.stop_reason || 'unknown';
    let totalUsage = { ...data.usage };

    // Check if we actually got any text content
    if (!text.trim()) {
      console.error('API response had no text content');
      return Response.json({
        error: 'API returned no text content. Please try again.'
      }, { status: 500 });
    }

    // Parse the card sections from response
    let parsedCard = parseCardResponse(text, n, draw);

    // Check if parsing produced results
    const hasContent = parsedCard.summary || parsedCard.reading;
    if (!hasContent) {
      console.error('Parsing failed - no content extracted. First 1000 chars:', text.substring(0, 1000));
      return Response.json({
        error: 'Model response could not be parsed. The AI may be overloaded - please try again.',
        debug: text.substring(0, 500)
      }, { status: 500 });
    }

    // V3: Short-reading retry — if READING section is under 300 words, the model
    // didn't follow length instructions. Send a continuation request.
    const readingWordCount = (parsedCard.reading || '').split(/\s+/).filter(w => w).length;
    if (readingWordCount < 300 && parsedCard.reading) {
      console.log(`[card-depth] Card ${n} reading too short (${readingWordCount} words, stop: ${stopReason}). Requesting continuation.`);

      try {
        const continuationResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31"
          },
          body: JSON.stringify({
            model: effectiveModel,
            max_tokens: maxTokens,
            system: systemWithCache,
            messages: [
              { role: 'user', content: userMessage },
              { role: 'assistant', content: text },
              { role: 'user', content: `Your response was too short. The READING section is only ${readingWordCount} words — the minimum is 600 words. The MIRROR, WHY, and REBALANCER/GROWTH sections also need 200-400 words each. Please REGENERATE the entire response from [CARD:${n}:SUMMARY] with substantially more content. Write 1500-2500 words total. This is not optional.` }
            ]
          })
        });

        const contData = await continuationResponse.json();
        if (contData.content && Array.isArray(contData.content) && contData.content.length > 0) {
          const contText = contData.content.map(item => item.text || "").join("\n");
          if (contText.trim()) {
            const reParsed = parseCardResponse(contText, n, draw);
            const reReadingWords = (reParsed.reading || '').split(/\s+/).filter(w => w).length;
            // Only use the retry if it's actually longer
            if (reReadingWords > readingWordCount) {
              console.log(`[card-depth] Retry produced ${reReadingWords} words (was ${readingWordCount}). Using retry.`);
              parsedCard = reParsed;
              // Accumulate retry usage
              if (contData.usage) {
                totalUsage = {
                  input_tokens: (totalUsage.input_tokens || 0) + (contData.usage.input_tokens || 0),
                  output_tokens: (totalUsage.output_tokens || 0) + (contData.usage.output_tokens || 0),
                  cache_creation_input_tokens: (totalUsage.cache_creation_input_tokens || 0) + (contData.usage.cache_creation_input_tokens || 0),
                  cache_read_input_tokens: (totalUsage.cache_read_input_tokens || 0) + (contData.usage.cache_read_input_tokens || 0)
                };
              }
            } else {
              console.log(`[card-depth] Retry didn't improve (${reReadingWords} words). Keeping original.`);
            }
          }
        }
      } catch (retryErr) {
        console.error('[card-depth] Continuation retry failed:', retryErr.message);
        // Fall through with original short content
      }
    }

    // Post-process: strip prohibited pet names deterministically
    // (prompt instructions alone are not reliable enough)
    const sanitizeText = (t) => {
      if (!t) return t;
      const terms = ['honey', 'sweetie', 'sweetheart', 'dear', 'darling', 'hun', 'sugar', 'babe', 'my friend', 'my dear'];
      let cleaned = t;
      terms.forEach(term => {
        cleaned = cleaned.replace(new RegExp(`\\bOh\\s+${term}\\b[,]?\\s*`, 'gi'), '');
        cleaned = cleaned.replace(new RegExp(`\\b${term}\\b[,]?\\s*`, 'gi'), '');
        cleaned = cleaned.replace(new RegExp(`\\b${term}\\b\\s*[—–-]\\s*`, 'gi'), '');
        cleaned = cleaned.replace(new RegExp(`[,]\\s*\\b${term}\\b[.]?`, 'gi'), '');
      });
      return cleaned.replace(/\s{2,}/g, ' ').replace(/([.!?]\s+)([a-z])/g, (m, p, l) => p + l.toUpperCase()).trim();
    };
    ['summary', 'reading', 'mirror', 'why', 'rebalancer', 'growth'].forEach(key => {
      if (parsedCard[key]) parsedCard[key] = sanitizeText(parsedCard[key]);
    });

    return Response.json({
      cardData: parsedCard,
      cardIndex,
      usage: {
        ...totalUsage,
        cache_creation_input_tokens: totalUsage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: totalUsage?.cache_read_input_tokens || 0
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Build card message — single pass, ALL structural data injected
function buildCardMessage(n, draw, question, spreadType, spreadKey, letterContent, token = null, originalInput = null, frameLabel = null, frameLens = null, showArchitecture = false) {
  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient] :
                AGENTS[draw.transient];
  const stat = STATUSES[draw.status];
  const prefix = stat?.prefix || '';
  const cardName = `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;
  const isBalanced = draw.status === 1;

  // Position context
  const positionName = ARCHETYPES[draw.position]?.name || `Position ${n}`;
  const positionDesc = ARCHETYPES[draw.position]?.description || '';
  const positionExtended = ARCHETYPES[draw.position]?.extended || '';
  const posArch = ARCHETYPES[draw.position];
  const posHouse = posArch?.house || 'Unknown';
  const posFunction = posArch?.function || 'Unknown';
  const posHorizon = draw.position <= 9 ? 'Inner' : (draw.position <= 21 ? 'Outer' : 'Unknown');
  const posChannel = posArch?.channel || null;

  // === ALL STRUCTURAL DATA (previously gated by depth tier) ===

  let structuralContext = '';

  // Gestalt/Portal significance
  const gestaltPositions = [0, 1, 19, 20];
  const portalPositions = [10, 21];
  if (gestaltPositions.includes(draw.position)) {
    structuralContext += `\nGESTALT SIGNIFICANCE: ${positionName} is a Gestalt archetype — it operates above the four houses, at the level of consciousness itself. Interpretations landing here carry meta-level weight.\n`;
  }
  if (portalPositions.includes(draw.position)) {
    const portalType = draw.position === 10 ? 'Ingress (entry)' : 'Egress (completion)';
    structuralContext += `\nPORTAL THRESHOLD: ${positionName} is a Portal — the ${portalType} point between Inner and Outer horizons. This is a threshold position where something is crossing between worlds.\n`;
  }

  // Structural location — horizon, house, process stage
  structuralContext += `\nSTRUCTURAL LOCATION: ${positionName} sits on the ${posHorizon} horizon (${posHorizon === 'Inner' ? 'positions 0-9: forming, seeding, developing' : 'positions 10-21: realized, completed, returning'}), in the ${posHouse} House, at the ${posFunction} stage of the process cycle.\n`;

  // Transient structural data
  const transComp = getComponent(draw.transient);
  const transArch = transComp.type === 'Archetype' ? ARCHETYPES[draw.transient] : (transComp.archetype !== undefined ? ARCHETYPES[transComp.archetype] : null);
  const transFunction = transArch?.function || transComp?.function;
  const transChannel = transComp.channel || null;
  const transHouse = transComp.house || null;

  // Process stage interaction
  if (transFunction && posFunction && transFunction !== posFunction) {
    structuralContext += `STRUCTURAL INTERACTION: The transient (${transComp.name}) carries ${transFunction} energy landing in a ${posFunction} position. This crossing of process stages shapes the interpretation.\n`;
  }

  // Horizon crossing
  const transHorizon = draw.transient <= 9 ? 'Inner' : (draw.transient <= 21 ? 'Outer' : (transComp.archetype !== undefined ? (transComp.archetype <= 9 ? 'Inner-derived' : 'Outer-derived') : 'Channel'));
  if (posHorizon === 'Inner' && transHorizon.startsWith('Outer')) {
    structuralContext += `HORIZON CROSSING: An Outer-horizon signature landing in an Inner position — what has been realized is now influencing what is still forming.\n`;
  } else if (posHorizon === 'Outer' && transHorizon === 'Inner') {
    structuralContext += `HORIZON CROSSING: An Inner-horizon signature landing in an Outer position — what is nascent is expressing through a mature domain.\n`;
  }

  // Rebalancer geometry — all three paths for ALL signature types
  const getRebalancerName = (corr, comp) => {
    if (!corr) return null;
    if (comp.type === 'Bound' && corr.targetBound) return corr.targetBound.name;
    if (comp.type === 'Agent' && corr.targetAgent) return corr.targetAgent.name;
    if (corr.target !== undefined) return ARCHETYPES[corr.target]?.name;
    return null;
  };

  const tooMuchCorr = transComp.type === 'Archetype' ? getArchetypeCorrection(draw.transient, 2) :
                      transComp.type === 'Bound' ? getBoundCorrection(transComp, 2) :
                      getAgentCorrection(transComp, 2);
  const tooLittleCorr = transComp.type === 'Archetype' ? getArchetypeCorrection(draw.transient, 3) :
                        transComp.type === 'Bound' ? getBoundCorrection(transComp, 3) :
                        getAgentCorrection(transComp, 3);
  const unackCorr = transComp.type === 'Archetype' ? getArchetypeCorrection(draw.transient, 4) :
                    transComp.type === 'Bound' ? getBoundCorrection(transComp, 4) :
                    getAgentCorrection(transComp, 4);

  const diagonalName = getRebalancerName(tooMuchCorr, transComp);
  const verticalName = getRebalancerName(tooLittleCorr, transComp);
  const reductionName = getRebalancerName(unackCorr, transComp);

  structuralContext += `\nREBALANCER GEOMETRY for ${transComp.name}:\n`;
  if (diagonalName) structuralContext += `  Diagonal (rebalancer for Too Much): ${diagonalName}\n`;
  if (verticalName) structuralContext += `  Vertical (rebalancer for Too Little): ${verticalName}\n`;
  if (reductionName) structuralContext += `  Reduction (rebalancer for Unacknowledged): ${reductionName}\n`;

  // Channel resonance/crossing
  if (transChannel && posChannel) {
    if (transChannel === posChannel) {
      structuralContext += `CHANNEL RESONANCE: Both operate through ${transChannel} — amplified, concentrated expression.\n`;
    } else {
      structuralContext += `CHANNEL CROSSING: Transient through ${transChannel}, position through ${posChannel}. Cross-pollination of energies.\n`;
    }
  }

  // House interaction
  if (transHouse && posHouse && transHouse !== posHouse) {
    structuralContext += `HOUSE INTERACTION: ${transComp.name} (${transHouse} House) in ${positionName} (${posHouse} House).\n`;
  }

  // Frame lens from preset spread
  let positionLens = frameLens || '';
  let positionFrame = frameLabel || '';
  if (!positionLens && spreadType === 'reflect') {
    const spreadConfig = REFLECT_SPREADS[spreadKey];
    positionLens = spreadConfig?.positions?.[n - 1]?.lens || '';
    positionFrame = positionFrame || spreadConfig?.positions?.[n - 1]?.name || '';
  }

  // Calculate correction target for imbalanced cards
  let correctionTarget = null;
  let correctionType = null;
  if (isImbalanced) {
    let correction = null;
    if (transComp.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        correctionTarget = ARCHETYPES[correction.target]?.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComp.type === 'Bound') {
      correction = getBoundCorrection(transComp, draw.status);
      if (correction && correction.targetBound) {
        correctionTarget = correction.targetBound.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComp.type === 'Agent') {
      correction = getAgentCorrection(transComp, draw.status);
      if (correction && correction.targetAgent) {
        correctionTarget = correction.targetAgent.name;
        correctionType = correction.type.toUpperCase();
      }
    }
  }

  // Calculate growth target for balanced cards
  let growthTarget = null;
  let growthType = null;
  let growthIsSelf = false;
  if (isBalanced) {
    let correction = null;
    if (transComp.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        growthTarget = ARCHETYPES[correction.target]?.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComp.type === 'Bound') {
      correction = getBoundCorrection(transComp, draw.status);
      if (correction && correction.targetBound) {
        growthTarget = correction.targetBound.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComp.type === 'Agent') {
      correction = getAgentCorrection(transComp, draw.status);
      if (correction && correction.targetAgent) {
        growthTarget = correction.targetAgent.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    }
  }

  // Architecture visibility instruction
  const archInstruction = showArchitecture
    ? `You may use structural terminology freely in all sections — house names, channel names, process stages, horizon references, rebalancer geometry terms.`
    : `⚠️ ARCHITECTURE INVISIBLE: The structural data below is for YOUR reasoning only. Use it to inform the DEPTH and ACCURACY of your interpretation, but translate ALL structural insights into felt experience. Do NOT use framework terms like "Seed stage", "Fruition", "diagonal partner", "Inner horizon", "rebalancer geometry", "channel resonance", "house interaction" in your prose. Convey WHAT THOSE PATTERNS MEAN for the person — the derivative insight, not the scaffolding.`;

  return `QUESTION: "${question}"

CONTEXT: This is Signature ${n} (${positionName}) in a ${spreadType.toUpperCase()} reading.${positionFrame ? `
FRAME POSITION: "${positionFrame}" — interpret through this frame in addition to the archetype position.` : ''}${positionLens ? `
POSITION LENS: ${positionLens}` : ''}
${letterContent ? `\nLETTER CONTEXT:\n${letterContent}\n` : ''}

THE SIGNATURE: ${cardName}
IN POSITION: ${positionName} — ${positionDesc}
${positionExtended ? `Position context: ${positionExtended}` : ''}
Description: ${trans?.description || ''}
${trans?.extended ? `Extended: ${trans.extended}` : ''}
Status: ${stat?.name || 'Balanced'} — ${stat?.desc || 'In balance'}

STRUCTURAL DATA${!showArchitecture ? ' (for your reasoning — translate into felt meaning)' : ''}:
${structuralContext}
${archInstruction}

Generate a FULL DEPTH interpretation of this signature. This is the ONE AND ONLY pass — there is no "deeper" version. Everything you have, put it here.

⚠️ ALL SIGNATURE TYPES DESERVE EQUAL DEPTH. Agents (court cards) and Bounds (minor cards) get the SAME 1500-2500 word treatment as Archetypes (majors). There is no "lesser" card in this system. An Agent IS its archetype in embodied form — interpret with the SAME depth and length.

⚠️⚠️⚠️ CRITICAL LENGTH REQUIREMENTS — READ THIS CAREFULLY ⚠️⚠️⚠️
Your TOTAL output for this card should be 1500-2500 words across all sections. This is NOT optional.
If your total output is under 800 words, you have FAILED. Start over mentally and write more.

SECTION MINIMUMS (these are MINIMUMS, not targets):
- SUMMARY: Exactly 2 sentences (the anchor — make them count)
- READING: 6-10 substantial paragraphs. 600-1200 words. THIS IS THE MAIN EVENT. Explore EVERY dimension: what this signature means philosophically, how it manifests psychologically, what it looks like in daily life, how it connects to the question asked, what the position reveals about WHERE this energy is operating. Each paragraph develops a DISTINCT facet — don't repeat yourself, go wider and deeper with each one.
- MIRROR: 3-4 paragraphs of reflective, poetic second-person address. 200-400 words.
- WHY: 3-5 paragraphs on the teleological pressure. 200-400 words. Why THIS signature, why NOW, what is the universe pointing at?
- REBALANCER/GROWTH: 3-5 paragraphs on the path forward. 200-400 words.

THIS IS A FULL READING, NOT A SUMMARY. Think of yourself as a wise counselor who has been asked a deep question and given one chance to say everything that matters. You are NOT writing an overview. You are writing the kind of interpretation someone would pay $200 for — thorough, insightful, layered, personal, alive. Fortune cookies are 1 sentence. You are writing 1500-2500 words. WRITE THE FULL THING.

⚠️ POSITION AND FRAME CONTEXT IS MANDATORY:
- THE SIGNATURE (what emerged): ${cardName}
- THE POSITION (where it landed): ${positionName}
DO NOT reverse these - ${cardName} is the signature, ${positionName} is the position it landed in.${positionFrame ? `
- THE FRAME (the spread position): "${positionFrame}"${positionLens ? `
  ${positionLens}` : ''}
⚠️ THIS IS A FRAMED READING. The frame "${positionFrame}" is PRIMARY — it shapes the PURPOSE of this position. The archetype position "${positionName}" shapes HOW the signature operates.
Your interpretation MUST open by naming the frame: e.g., "Looking at ${positionFrame}, ${cardName} in ${positionName}..." or "In the position of ${positionFrame}..."
Every section should feel like it's answering "${positionFrame}" through the lens of ${cardName} in ${positionName}.` : `
Your interpretation MUST say "${cardName} in ${positionName}" or "in your ${positionName}".`}

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-3 sentences max.

Respond with these markers:

[CARD:${n}:SUMMARY]
(Exactly 2 sentences. The anchor — core insight distilled.${positionFrame ? ` Name "${positionFrame}" to ground the insight.` : ''} Must stand alone as its own composition, NOT the first sentences of READING.)

[CARD:${n}:READING]
(Full interpretation — no sentence limits. Rich, layered, the complete transmission. What does this signature in this position reveal about their question? Explore philosophy, psychology, practical implications.${positionFrame ? ` MUST open with the frame: "Looking at ${positionFrame}, ${cardName} in ${positionName}..." — then develop the interpretation through this lens.` : ''})

[CARD:${n}:MIRROR]
(A reflective passage spoken directly to the reader — 2-3 short paragraphs. First: name what this signature sees in them right now with poetic specificity. Second: deepen — what does this recognition mean? Third: close with an opening — a question, invitation, or gentle redirection that doesn't close the loop. Write in second person, warmly, no headings or markdown. Plain text with blank lines between paragraphs.)

[CARD:${n}:WHY]
(Full transmission on the teleological pressure. Why did THIS signature emerge for THIS question? What is it pointing at? No sentence limits.)
${isImbalanced ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} rebalancing. You MUST discuss ${correctionTarget} specifically.
REBALANCER CONTEXT: This rebalancing is happening in the ${positionName} position. The rebalancing must address how ${correctionTarget} restores balance specifically within the domain of ${positionName}. Position shapes the rebalancing.` : ''}

[CARD:${n}:REBALANCER]
(Full transmission on the rebalancing path through ${correctionTarget || 'the rebalancer target'} as it operates in ${positionName}. No sentence limits. How does this rebalancing restore balance HERE? What does it look like in practice? Explore philosophy, psychology, practical application.)` : ''}
${isBalanced ? `
GROWTH OPPORTUNITY: Balance is a launchpad, not a destination.${growthIsSelf ? `
This is a RECURSION POINT - ${trans?.name || 'this signature'} in balance grows by investing FURTHER in itself. The loop IS the growth.` : `
GROWTH TARGET: ${growthTarget || 'the growth partner'} via ${growthType || 'growth'} opportunity.`}

[CARD:${n}:GROWTH]
(Full transmission on the growth invitation. No sentence limits.${growthIsSelf ? ` Balanced ${trans?.name || 'this signature'} grows by going deeper here. MORE of this. Frame as "continue investing" and "the loop is the path" — NOT "rest here" or "you've arrived".` : ` The developmental invitation from balance toward ${growthTarget}. Frame as "from here, you're invited toward..." Not rebalancing — INVITATION.`})` : ''}

VOICE: Match the humor/register/persona specified in the system prompt throughout all sections.
NOTE: Architecture section will be generated separately — do not include it.${token ? `

TOKEN CONTEXT (DTP MODE):
FOCUS: This reading is regarding "${token}"
${originalInput ? `CONTEXT: "${originalInput}"` : ''}

The token is your lens. The context is your ground.
Don't interpret "${token}" generically — interpret it as it lives in THIS specific situation.
Instead of: "There's pressure in how you hold authority"
Say: "There's pressure in how you hold authority as it relates to ${token}${originalInput ? ` — given that ${originalInput}` : ''}"
The token "${token}" should appear naturally woven into your interpretations, grounded in the specific situation.` : ''}`;
}

// Parse card response — single-depth markers, flat structure
function parseCardResponse(text, n, draw) {
  const extractSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[CARD:\\d+:|\\[[A-Z_]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let content = match[1].trim();
    content = content.replace(/^---+\s*\n?/gm, '');
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/^#{1,3}\s*$/gm, '');
    content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  };

  // Generate Architecture server-side (no AI hallucination)
  const architectureText = generateArchitectureText(draw);
  const isBalanced = draw.status === 1;
  const isImbalanced = draw.status !== 1;

  const cardData = {
    summary: extractSection(`CARD:${n}:SUMMARY`),
    reading: extractSection(`CARD:${n}:READING`),
    architecture: architectureText,
    mirror: extractSection(`CARD:${n}:MIRROR`),
    why: extractSection(`CARD:${n}:WHY`)
  };

  if (isImbalanced) {
    cardData.rebalancer = extractSection(`CARD:${n}:REBALANCER`);
  }

  if (isBalanced) {
    cardData.growth = extractSection(`CARD:${n}:GROWTH`);
  }

  return cardData;
}

// Generate Architecture section SERVER-SIDE (no AI hallucination)
function generateArchitectureText(draw) {
  const transient = draw.transient;
  const status = draw.status;
  const stat = STATUSES[status];
  const trans = getComponent(transient);

  let lines = [];

  if (trans.type === 'Archetype') {
    const arch = ARCHETYPES[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';

    lines.push(`**Signature:** ${statusPrefix}${arch.name}`);
    lines.push(`**House:** ${arch.house}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    if (arch.channel) lines.push(`**Channel:** ${arch.channel}`);
    lines.push(`**Card Type:** Archetype (Major)`);

    const correction = getArchetypeCorrection(transient, status);
    if (correction) {
      const targetArch = ARCHETYPES[correction.target];
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${targetArch.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${targetArch.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${targetArch.name} via ${corrType} rebalancing`);
      }
    }

  } else if (trans.type === 'Bound') {
    const bound = BOUNDS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[bound.archetype];

    lines.push(`**Signature:** ${statusPrefix}${bound.name}`);
    lines.push(`**Channel:** ${bound.channel}`);
    lines.push(`**Number:** ${bound.number} of 10`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Bound (Minor ${bound.number})`);
    lines.push(`**Expresses:** ${associatedArch.name} — ${associatedArch.house} House`);

    const correction = getBoundCorrection(trans, status);
    if (correction && correction.targetBound) {
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${correction.targetBound.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${correction.targetBound.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${correction.targetBound.name} via ${corrType} rebalancing`);
      }
    }

  } else if (trans.type === 'Agent') {
    const agent = AGENTS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[agent.archetype];

    lines.push(`**Signature:** ${statusPrefix}${agent.name}`);
    lines.push(`**Channel:** ${agent.channel}`);
    lines.push(`**Role:** ${agent.role}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Agent (Court)`);
    lines.push(`**Embodies:** ${associatedArch.name} — ${associatedArch.house} House`);

    const correction = getAgentCorrection(trans, status);
    if (correction && correction.targetAgent) {
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${correction.targetAgent.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${correction.targetAgent.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${correction.targetAgent.name} via ${corrType} rebalancing`);
      }
    }
  }

  return lines.join('\n');
}
