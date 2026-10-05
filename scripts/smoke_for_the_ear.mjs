// .696: prove forTheEar on the shouting case (capital labels) and on the lives verb/noun respell, positives and negatives
const { forTheEar } = await import('../lib/voice/kokoro.js');
console.log('CAPS:', JSON.stringify(forTheEar('WHAT IT IS: Say the pattern out loud. WHY IT IS THE MEDICINE: because it returns the seeing. HOW TO TAKE IT: once this week. THE OTHER SIDE: your own seeing, held.')));
for (const s of ['It is showing up where your sense of direction lives.', 'This is about their lives, not yours.', 'The part of you that lives in the plan.', 'The hours of our lives are counted.', 'Lives change when someone lives this way.', "People's lives are not a plan."]) console.log(JSON.stringify(forTheEar(s)));
