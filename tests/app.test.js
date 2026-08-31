const test = require('node:test');
const assert = require('node:assert/strict');

const { app, startServer, normalizeSocialVideoUrl, isValidHttpUrl } = require('../server');

test('server exports app instance', () => {
  assert.ok(app);
  assert.strictEqual(typeof app.get, 'function');
});

test('homepage responds with 200', async () => {
  const server = await startServer(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
});

test('text-to-speech mp3 export route responds successfully', async () => {
  const server = await startServer(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/tts/text-to-mp3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello from ToolBox LK' })
    });

    assert.equal(response.status, 200);
    const json = await response.json();
    assert.ok(json.downloadUrl);
    assert.ok(json.filename);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
});

test('social video conversion route validates input', async () => {
  const server = await startServer(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/convert/social-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    const json = await response.json();
    assert.ok(json.message);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
});

test('social video URL normalizer accepts common short-form video URLs', () => {
  assert.equal(
    normalizeSocialVideoUrl('youtu.be/dQw4w9WgXcQ'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
  assert.equal(
    normalizeSocialVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
  assert.equal(
    normalizeSocialVideoUrl('x.com/example/status/123'),
    'https://x.com/example/status/123'
  );
  assert.ok(isValidHttpUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  assert.ok(isValidHttpUrl('youtu.be/dQw4w9WgXcQ'));
});
