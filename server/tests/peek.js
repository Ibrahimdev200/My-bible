const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
const { bibleService } = require('../src/services/bibleService');
(async () => {
  await bibleService.init();
  const r = bibleService.executeQuery("SELECT chapter, verse, translation, text FROM verses WHERE book_id=19 AND chapter=122 AND verse=1");
  console.log(r);
  const g = bibleService.executeQuery("SELECT chapter, verse, translation, text FROM verses WHERE book_id=62 AND chapter=4 AND verse=4 AND translation='KJV'");
  console.log(g);
})();

