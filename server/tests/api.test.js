const assert = require('assert');
const url = require('url');
const { initDatabase } = require('../src/config/database');
const { bibleService } = require('../src/services/bibleService');
const { scriptureDetector } = require('../src/services/scriptureDetector');
const authRoutes = require('../src/routes/auth');
const bibleRoutes = require('../src/routes/bible');
const scriptureRoutes = require('../src/routes/scripture');
const churchRoutes = require('../src/routes/church');
const express = require('express');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/scripture', scriptureRoutes);
app.use('/api/church', churchRoutes);

// In-process Express dispatcher (no TCP socket needed inside sandbox)
function dispatch(method, fullPath, body = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(fullPath, true);
    const req = {
      method: method.toUpperCase(),
      url: fullPath,
      originalUrl: fullPath,
      path: parsed.pathname,
      query: parsed.query || {},
      body: body || {},
      headers: Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
      ),
      get(name) {
        return this.headers[name.toLowerCase()];
      },
      header(name) {
        return this.headers[name.toLowerCase()];
      },
    };

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return this.headers[k.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, data: payload });
        return this;
      },
      send(payload) {
        resolve({ status: this.statusCode, data: payload });
        return this;
      },
    };

    app.handle(req, res, (err) => {
      if (err) return reject(err);
      resolve({ status: 404, data: { error: 'Not found' } });
    });
  });
}

(async () => {
  await initDatabase();
  await bibleService.init();
  scriptureDetector.ensureEngine();

  // 1. Register a test church account
  const uniqueEmail = `test_${Date.now()}@gracechurch.org`;
  const reg = await dispatch('POST', '/api/auth/register', {
    churchName: 'Grace Chapel International',
    email: uniqueEmail,
    password: 'password123',
    preferredTranslation: 'KJV',
  });
  assert.strictEqual(reg.status, 201, `Register failed: ${JSON.stringify(reg.data)}`);
  assert.ok(reg.data.token, 'Missing JWT token');
  const token = reg.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };
  console.log('✓ POST /api/auth/register -> 201 (Church:', reg.data.church.name, ')');

  // 2. Get books
  const books = await dispatch('GET', '/api/bible/books', {}, authHeader);
  assert.strictEqual(books.status, 200);
  assert.strictEqual(books.data.books.length, 66);
  console.log('✓ GET /api/bible/books -> 66 books');

  // 3. Get chapter verses (John 3 in KJV, tested with both numeric ID 43 and string code JHN)
  const john3Num = await dispatch('GET', '/api/bible/books/43/chapters/3?translation=KJV', {}, authHeader);
  assert.strictEqual(john3Num.status, 200);
  assert.strictEqual(john3Num.data.verses.length, 36);

  const john3Code = await dispatch('GET', '/api/bible/books/JHN/chapters/3?translation=KJV', {}, authHeader);
  assert.strictEqual(john3Code.status, 200, `JHN code lookup failed: ${JSON.stringify(john3Code.data)}`);
  assert.strictEqual(john3Code.data.verses.length, 36);
  console.log('✓ GET /api/bible/books/{43|JHN}/chapters/3 -> 36 verses');

  // 4. Get reference (Psalm 23:1-2)
  const refRes = await dispatch(
    'GET',
    '/api/bible/reference?ref=' + encodeURIComponent('Psalms 23:1-2') + '&translation=KJV',
    {},
    authHeader
  );
  assert.strictEqual(refRes.status, 200);
  assert.ok(refRes.data.text.includes('The LORD is my shepherd'));
  console.log('✓ GET /api/bible/reference?ref=Psalms+23:1-2 ->', refRes.data.reference);

  // 5. Universal search (both direct reference & keyword search)
  const searchRef = await dispatch(
    'GET',
    '/api/bible/search?q=' + encodeURIComponent('Romans 8:28') + '&translation=KJV',
    {},
    authHeader
  );
  assert.strictEqual(searchRef.status, 200);
  assert.ok(searchRef.data.results.length >= 1);
  assert.strictEqual(searchRef.data.results[0].reference, 'Romans 8:28');

  const searchKw = await dispatch(
    'GET',
    '/api/bible/search?q=' + encodeURIComponent('only begotten Son') + '&translation=KJV',
    {},
    authHeader
  );
  assert.strictEqual(searchKw.status, 200);
  assert.ok(searchKw.data.results.some((r) => r.reference === 'John 3:16'));
  console.log('✓ GET /api/bible/search (reference + keyword) -> matched Romans 8:28 & John 3:16');

  // 6. AI Scripture Detector (spoken reference + direct unreferenced quote)
  const detectSpoken = await dispatch(
    'POST',
    '/api/bible/detect',
    {
      text: 'Brethren turn with me to First Corinthians chapter thirteen verse four',
      translation: 'KJV',
    },
    authHeader
  );
  assert.strictEqual(detectSpoken.status, 200);
  assert.strictEqual(detectSpoken.data.detected, true);
  assert.strictEqual(detectSpoken.data.reference, '1 Corinthians 13:4');

  const detectQuote = await dispatch(
    'POST',
    '/api/bible/detect',
    {
      text: 'For God so loved the world that he gave his only begotten Son that whosoever believeth in him should not perish',
      translation: 'KJV',
    },
    authHeader
  );
  assert.strictEqual(detectQuote.status, 200);
  assert.strictEqual(detectQuote.data.detected, true);
  assert.strictEqual(detectQuote.data.reference, 'John 3:16');
  console.log('✓ POST /api/bible/detect -> matched 1 Corinthians 13:4 & quote John 3:16');

  // 7. Scripture History POST & GET
  const postHist = await dispatch(
    'POST',
    '/api/scripture/history',
    {
      reference: 'John 3:16',
      text: detectQuote.data.text,
      translation: 'KJV',
      confidence: 0.96,
      spokenText: 'For God so loved the world...',
    },
    authHeader
  );
  assert.strictEqual(postHist.status, 201);

  const getHist = await dispatch('GET', '/api/scripture/history', {}, authHeader);
  assert.strictEqual(getHist.status, 200);
  assert.ok(getHist.data.history.length >= 1);
  assert.strictEqual(getHist.data.history[0].reference, 'John 3:16');
  console.log('✓ POST & GET /api/scripture/history -> saved & retrieved John 3:16');

  console.log('\nALL API ENDPOINT TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
})().catch((err) => {
  console.error('API Test Failed:', err);
  process.exit(1);
});
