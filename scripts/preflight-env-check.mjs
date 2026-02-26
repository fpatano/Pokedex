#!/usr/bin/env node

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const targets = ['/', '/api/search?q=pikachu'];

const missingChunkRegex = /Cannot find module '\.\/\d+\.js'/i;

async function check(path) {
  const url = `${base}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  const contentType = res.headers.get('content-type') || '';
  return {
    path,
    status: res.status,
    contentType,
    hasMissingChunkError: missingChunkRegex.test(body),
  };
}

try {
  const results = await Promise.all(targets.map(check));

  for (const r of results) {
    console.log(`${r.path} -> ${r.status} (${r.contentType || 'no-content-type'})`);
  }

  const invalidEnv = results.some((r) => r.status >= 500 && r.hasMissingChunkError);
  if (invalidEnv) {
    console.error('\nINVALID_ENV detected: stale/corrupt Next build artifacts (.next).');
    console.error('Run: npm run dev:cloud:clean');
    process.exit(2);
  }

  const anyFailure = results.some((r) => r.status >= 400);
  if (anyFailure) {
    process.exit(1);
  }

  console.log('\npreflight env check passed');
} catch (error) {
  console.error('preflight env check failed:', error?.message || error);
  process.exit(1);
}
