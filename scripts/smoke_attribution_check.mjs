// .699: the attribution check, as the page runs it — a positive (the Reader's own step handed back) and two negatives
const check = (glass, askerText) => { const askerWords = new Set(askerText.toLowerCase().split(/[^a-z']+/).filter((w) => w.length >= 4)); const re = /\byou (?:said|told me|called it|put it|wrote|mentioned)\b([^.!?]{0,80})/gi; let m; while ((m = re.exec(glass))) { const tail = String(m[1] || '').toLowerCase().split(/[^a-z']+/).filter((w) => w.length >= 4); const hit = tail.filter((w) => askerWords.has(w)).length; if (tail.length >= 2 && hit < 2) return 'FLAG: ' + m[0].trim(); } return 'ok'; };
const asker = 'Why do I keep second guessing myself? I decide and then I reopen it the next morning.';
console.log('positive (the step handed back):', check('You said the step is not more work. So what is one small thing you could do this week?', asker));
console.log('negative (their words):', check('You said you decide and then reopen it the next morning. That is the shape.', asker));
console.log('negative (no "you said"):', check('The step I handed you was not more work. What is one small thing?', asker));
