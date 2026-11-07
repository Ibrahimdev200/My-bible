/* Detector accuracy test. Run: node tests/detector.test.js */
const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
const { bibleService } = require('../src/services/bibleService');
const { scriptureDetector } = require('../src/services/scriptureDetector');

const POSITIVE = [
  // [spoken text, expected reference]
  ['Open your Bible to Psalm 42.', 'Psalms 42'],
  ["Let's read Psalm 42 verse 1.", 'Psalms 42:1'],
  ['Turn with me to John chapter 3 verse 16.', 'John 3:16'],
  ['In the book of Romans, chapter 8, verse 28.', 'Romans 8:28'],
  ["Let's go to First Corinthians 13.", '1 Corinthians 13'],
  ['Matthew 5 from verse 3 to verse 10.', 'Matthew 5:3-10'],
  ['Second Timothy chapter 3 verses 16 and 17', '2 Timothy 3:16-17'],
  ['please turn to Genesis chapter one verse one', 'Genesis 1:1'],
  ['go with me to Hebrews eleven verse one', 'Hebrews 11:1'],
  ['look at Philippians four verse thirteen', 'Philippians 4:13'],
  ['open to Psalm twenty three', 'Psalms 23'],
  ['Revelation chapter twenty one verse four', 'Revelation 21:4'],
  ['turn to First John chapter one verse nine', '1 John 1:9'],
  ['John 3:16', 'John 3:16'],
  ['as it is written in Isaiah 40 verse 31', 'Isaiah 40:31'],
  // quotations without a reference
  ['For God so loved the world that he gave his only begotten Son', 'John 3:16'],
  ['The Lord is my shepherd I shall not want', 'Psalms 23:1'],
  ['I can do all things through Christ which strengtheneth me', 'Philippians 4:13'],
  ['In the beginning God created the heaven and the earth', 'Genesis 1:1'],
  ['Trust in the Lord with all thine heart and lean not unto thine own understanding', 'Proverbs 3:5'],
  ['for all have sinned and come short of the glory of God', 'Romans 3:23'],
  ['Jesus wept', 'John 11:35'],
  ['Thy word is a lamp unto my feet and a light unto my path', 'Psalms 119:105'],
  ['For by grace are ye saved through faith and that not of yourselves it is the gift of God', 'Ephesians 2:8'],
  ['be strong and of a good courage fear not nor be afraid of them', 'Deuteronomy 31:6'],
  ['I am the way the truth and the life no man cometh unto the Father but by me', 'John 14:6'],
];

const NEGATIVE = [
  'Good morning church, how are you all doing today?',
  'We want to welcome all our visitors this morning.',
  'Let us pray together. Father we thank you for this day.',
  'Announcements: the youth meeting is on Friday at 5 pm.',
  'I was talking to a man the other day and he said something amazing.',
  'You need to give God thanks in every situation of your life.',
  'We have three services every Sunday starting at 8 am.',
  'God is good all the time and all the time God is good.',
  'Please open your hearts and receive what the Lord is saying.',
  'Turn to your neighbour and say God loves you.',
  'I have been in ministry for 25 years now.',
  'The offering will be taken after the message, thank you so much.',
  'Then he said to me chapter and verse, I was amazed.',
  'Come on, give the Lord a big hand of praise!',
];

(async () => {
  await bibleService.init();
  let pass = 0, fail = 0;
  const failures = [];

  for (const [text, expected] of POSITIVE) {
    scriptureDetector.clearDebounce();
    const r = scriptureDetector.detectScripture(text, { ignoreDebounce: true });
    const got = r && r.reference;
    // allow a quotation of a verse range to start with the expected verse
    const ok = got && (got === expected || got.startsWith(expected + '-') || expected.startsWith(got + '-'));
    if (ok) pass++; else { fail++; failures.push(`MISS  "${text}"  expected=${expected}  got=${got || 'nothing'}`); }
  }
  const posPass = pass;

  let falsePos = 0;
  for (const text of NEGATIVE) {
    scriptureDetector.clearDebounce();
    const r = scriptureDetector.detectScripture(text, { ignoreDebounce: true });
    if (r) { falsePos++; failures.push(`FALSE "${text}"  -> ${r.reference} (${r.confidence}, ${r.method})`); }
  }

  console.log(`\nPositives: ${posPass}/${POSITIVE.length}`);
  console.log(`Negatives wrongly triggered: ${falsePos}/${NEGATIVE.length}`);
  failures.forEach((f) => console.log('  ' + f));
  process.exit(fail + falsePos === 0 ? 0 : 1);
})();

