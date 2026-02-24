import { spawn } from 'node:child_process';

const PORT = process.env.PORT ?? '4010';
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractMaxAttackCandidate(cards) {
  let best = null;

  for (const card of cards) {
    for (const attack of card.attacks ?? []) {
      const raw = typeof attack.damage === 'string' ? attack.damage : String(attack.damage ?? '');
      const value = Number((raw.match(/\d+/) ?? [])[0]);

      if (!Number.isFinite(value)) continue;

      if (!best || value > best.damage) {
        best = {
          cardName: card.name,
          attackName: attack.name,
          damage: value,
        };
      }
    }
  }

  return best;
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=ping`);
      if (res.status !== 404) return;
    } catch {
      // keep waiting
    }

    await wait(1000);
  }

  throw new Error('Server did not become ready in time');
}

async function checkQuery(query) {
  const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
  const body = await res.json();

  return {
    query,
    status: res.status,
    resultCount: Array.isArray(body.results) ? body.results.length : 0,
    coolPicksCount: Array.isArray(body.coolPicks) ? body.coolPicks.length : 0,
    sampleNames: Array.isArray(body.results) ? body.results.slice(0, 3).map((c) => c.name) : [],
    body,
  };
}

async function main() {
  const env = {
    ...process.env,
    PORT,
    POKEMON_API_DEBUG: process.env.POKEMON_API_DEBUG ?? '1',
  };

  const dev = spawn('npm', ['run', 'dev', '--', '-p', PORT], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  dev.stdout.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`));
  dev.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));

  try {
    await waitForServer();

    const fire = await checkQuery('fire');
    const largest = await checkQuery('fire type pokemon largest attack points');
    const maxAttack = extractMaxAttackCandidate(largest.body.results ?? []);

    console.log('\n=== Live verification summary ===');
    console.log(JSON.stringify({ fire, largest, maxAttack }, null, 2));

    if (fire.status !== 200 || fire.resultCount === 0) {
      throw new Error('Acceptance failed: /api/search?q=fire must return 200 with non-empty results');
    }

    if (largest.status !== 200 || largest.resultCount === 0 || !maxAttack) {
      throw new Error('Acceptance failed: largest-attack query must return data with a max-attack candidate');
    }

    console.log('\nLIVE_CHECK: PASS');
  } finally {
    dev.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error('\nLIVE_CHECK: FAIL');
  console.error(error);
  process.exit(1);
});
