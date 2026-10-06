// .709: the journey thread renders a v2 summary by authority and a legacy summary as unestablished
const { buildUserContextBlock } = await import('../lib/userContext.js');
const now = new Date().toISOString();
const v2 = '[provenance v2]\nASKER_SAID: has a headache right now | can\'t stop working on it\nREADER_OFFERED: an example scene: three things pulling on you tonight\nASKER_CONFIRMED: —\nCAME_DOWN_TO: separate the pieces and act on one\nVERDICT: none';
const legacy = 'They asked about their project; the reading said they have been carefully tending it.';
const block = buildUserContextBlock({ totalReadings: 5, houseDistribution: {}, statusDistribution: {} }, [], [], null, null, [], [{ narrative_summary: v2, hashtags: ['headache', 'overwhelm'], created_at: now, topic: 'x' }, { narrative_summary: legacy, hashtags: ['project', 'thriving'], created_at: now, topic: 'y' }]);
console.log(block.slice(block.indexOf('=== JOURNEY THREAD ===')));
