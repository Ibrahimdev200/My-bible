const path = require('path');
const fs = require('fs');
process.chdir(path.resolve(__dirname, '..'));
const { bibleService } = require('../src/services/bibleService');
const { scriptureDetector } = require('../src/services/scriptureDetector');
const file = process.argv[2] || path.join(__dirname, 'phrases.txt');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
(async () => {
  await bibleService.init();
  for (const l of lines) {
    scriptureDetector.clearDebounce();
    const r = scriptureDetector.detectScripture(l, { ignoreDebounce: true });
    const ev = r && r.evidence ? ` p=${r.evidence.precision} r=${r.evidence.recall} o=${r.evidence.order} w=${r.evidence.weight} n=${r.evidence.matchedWords}` : '';
    console.log(`${r ? r.reference + ' ' + r.confidence + ' ' + r.method + ev : '-- nothing'}   <=  ${l}`);
  }
})();
