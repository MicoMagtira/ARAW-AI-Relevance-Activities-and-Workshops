// Chatbot Sandbox server-model bake-off (not part of verify: it uses the Workers AI allowance). Run `npx wrangler login` first.
//   node scripts/sandbox/cloud-bakeoff.mjs                  (every candidate, 5 languages, 8 questions)
//   node scripts/sandbox/cloud-bakeoff.mjs --agree          (accept the Llama 3.2 licence on the account, once, then stop)
//   MODELS=@cf/x/y LANGS=en,fil node scripts/sandbox/cloud-bakeoff.mjs
// Uses the real system prompt and the questions of the on-device bake-off (smoke.spec.ts). Answers, timings, tokens and neurons
// go to shots-out/sandbox-bakeoff-cloud/. Neuron rates are from the Workers AI pricing page (2026-10-20).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createDoseFilter } from '../../src/sandbox/guard.ts';
import { systemPrompt } from '../../src/sandbox/prompt.ts';

/** Neurons per million tokens: [input, output]. */
const CANDIDATES = {
  '@cf/meta/llama-3.2-1b-instruct': [2457, 18252],
  '@cf/meta/llama-3.2-3b-instruct': [4625, 30475],
  '@cf/ibm-granite/granite-4.0-h-micro': [1542, 10158],
  '@cf/qwen/qwen3-30b-a3b-fp8': [4625, 30475],
  '@cf/google/gemma-4-26b-a4b-it': [9091, 27273],
  '@cf/aisingapore/gemma-sea-lion-v4-27b-it': [31876, 50488],
};
const DAILY_NEURONS = 10_000;
const MAX_TOKENS = 320;
const OUT = join('shots-out', 'sandbox-bakeoff-cloud');

function credentials() {
  const base = process.env.APPDATA ? join(process.env.APPDATA, 'xdg.config') : join(homedir(), '.config');
  const toml = readFileSync(join(base, '.wrangler', 'config', 'default.toml'), 'utf8');
  const token = /oauth_token\s*=\s*"([^"]+)"/.exec(toml)?.[1];
  if (!token) throw new Error('No Wrangler login found. Run: npx wrangler login');
  return token;
}

const token = credentials();
const auth = { Authorization: `Bearer ${token}` };

async function accountId() {
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts', { headers: auth });
  const body = await res.json();
  if (!body.success) throw new Error(`Cannot read the account: ${JSON.stringify(body.errors)}`);
  return body.result[0].id;
}

const account = process.env.CF_ACCOUNT ?? (await accountId());

async function run(model, input) {
  const started = Date.now();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  const ms = Date.now() - started;
  if (!res.ok || body.success === false) return { ms, error: `${res.status} ${JSON.stringify(body.errors ?? body).slice(0, 200)}` };
  const r = body.result ?? {};
  const text = r.response ?? r.choices?.[0]?.message?.content ?? '';
  return { ms, text: typeof text === 'string' ? text : JSON.stringify(text), usage: r.usage ?? null, finish: r.choices?.[0]?.finish_reason };
}

if (process.argv.includes('--agree')) {
  const r = await run('@cf/meta/llama-3.2-1b-instruct', { prompt: 'agree' });
  console.log(r.error ? `Failed: ${r.error}` : 'Licence accepted on this account.');
  process.exit(r.error ? 1 : 0);
}

// the questions live in the on-device bake-off: one set for both
const smoke = readFileSync(join('scripts', 'sandbox', 'smoke.spec.ts'), 'utf8');
const block = /const PROMPTS: Record<string, string\[\]> = (\{[\s\S]*?\n\});/.exec(smoke)?.[1];
if (!block) throw new Error('Could not find the questions in smoke.spec.ts');
const PROMPTS = new Function(`return ${block}`)();

const models = (process.env.MODELS ?? Object.keys(CANDIDATES).join(',')).split(',').filter(Boolean);
const langs = (process.env.LANGS ?? 'en,fil,ceb,ilo,hil').split(',').filter(Boolean);
mkdirSync(OUT, { recursive: true });

const summary = [];
for (const model of models) {
  const rate = CANDIDATES[model];
  const rows = [];
  let neurons = 0;
  let inTok = 0;
  let outTok = 0;
  for (const lang of langs) {
    const jobs = PROMPTS[lang].map(async (question, i) => {
      const r = await run(model, {
        messages: [
          { role: 'system', content: systemPrompt(lang) },
          { role: 'user', content: question },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
        top_p: 0.9,
      });
      const filter = createDoseFilter('[DOSE HIDDEN]');
      if (r.text) filter.push(r.text);
      const shown = filter.end();
      return { lang, i: i + 1, question, ...r, doseHidden: filter.hidDose, shown };
    });
    for (const row of await Promise.all(jobs)) {
      rows.push(row);
      const pt = row.usage?.prompt_tokens ?? 0;
      const ct = row.usage?.completion_tokens ?? 0;
      inTok += pt;
      outTok += ct;
      neurons += (pt * rate[0] + ct * rate[1]) / 1e6;
    }
    process.stdout.write(`${model} ${lang} done\n`);
  }
  const good = rows.filter((r) => !r.error);
  const times = good.map((r) => r.ms).sort((a, b) => a - b);
  const line = {
    model,
    answered: `${good.length}/${rows.length}`,
    empty: good.filter((r) => !r.text.trim()).length,
    cutOff: good.filter((r) => (r.usage?.completion_tokens ?? 0) >= MAX_TOKENS).length,
    medianSeconds: times.length ? +(times[Math.floor(times.length / 2)] / 1000).toFixed(1) : null,
    avgIn: good.length ? Math.round(inTok / good.length) : 0,
    avgOut: good.length ? Math.round(outTok / good.length) : 0,
    neuronsPerTurn: good.length ? +(neurons / good.length).toFixed(1) : 0,
    freeTurnsPerDay: neurons ? Math.floor(DAILY_NEURONS / (neurons / good.length)) : 0,
    dosesHidden: good.filter((r) => r.doseHidden).length,
    neuronsUsed: +neurons.toFixed(0),
    firstError: rows.find((r) => r.error)?.error ?? null,
  };
  summary.push(line);
  writeFileSync(join(OUT, `${model.split('/').pop()}.json`), JSON.stringify(rows, null, 1));
  console.log(JSON.stringify(line));
}
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
