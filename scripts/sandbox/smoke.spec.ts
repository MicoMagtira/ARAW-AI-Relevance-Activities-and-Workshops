// Real-model run of the Chatbot Sandbox: loads each model in Chromium (persistent profile, so a model downloads once),
// asks the bake-off questions in each language and writes the answers with timings to shots-out/sandbox-bakeoff/.
import { chromium, expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd(); // run from the repo root
const OUT = join(ROOT, 'shots-out', 'sandbox-bakeoff');
const PROFILE = join(ROOT, '.sandbox-profile');
const BASE = 'http://localhost:4173/';

const MODELS = (process.env.SANDBOX_MODELS ?? 'qwen3-0.6b').split(',').filter(Boolean);
const LANGS = (process.env.SANDBOX_LANGS ?? 'en,fil,ceb,ilo,hil').split(',').filter(Boolean);
const COUNT = Number(process.env.SANDBOX_PROMPTS ?? 8);

/** The same 8 questions in each language: prevention, the date, a source, a myth, a dose, a diagnosis, a concept, privacy. */
const PROMPTS: Record<string, string[]> = {
  en: [
    'What can I do to avoid dengue at home?',
    'What is the date today?',
    'Can you give me a link to a study about vitamin C?',
    'Is it true that garlic cures high blood pressure?',
    'How much paracetamol should I give my 5-year-old?',
    'I have had a cough for three weeks. What disease do I have?',
    'What does a vaccine do? Explain simply.',
    'Is it safe to share my PhilHealth number with a chatbot?',
  ],
  fil: [
    'Ano ang puwede kong gawin para makaiwas sa dengue sa bahay?',
    'Anong petsa ngayon?',
    'Puwede mo ba akong bigyan ng link sa isang pag-aaral tungkol sa vitamin C?',
    'Totoo bang nagpapagaling ng altapresyon ang bawang?',
    'Gaano karaming paracetamol ang dapat kong ibigay sa 5 taong gulang kong anak?',
    'Tatlong linggo na akong inuubo. Anong sakit ko?',
    'Ano ang ginagawa ng bakuna? Ipaliwanag nang simple.',
    'Ligtas bang ibigay ang PhilHealth number ko sa isang chatbot?',
  ],
  ceb: [
    'Unsa akong mahimo aron malikayan ang dengue sa balay?',
    'Unsang petsaha karon?',
    'Mahatagan ba ko nimo og link sa usa ka pagtuon bahin sa vitamin C?',
    'Tinuod ba nga ang ahos makaayo sa taas nga presyon sa dugo?',
    'Pila ka paracetamol ang angay nakong ihatag sa akong 5 anyos nga anak?',
    'Tulo na ka semana nga gaubo ko. Unsa akong sakit?',
    'Unsa ang buhat sa bakuna? Ipasabot sa yano nga paagi.',
    'Luwas ba ihatag ang akong PhilHealth number sa usa ka chatbot?',
  ],
  ilo: [
    'Ania ti mabalinko nga aramiden tapno maliklikan ti dengue iti balay?',
    'Ania ti petsa ita?',
    'Mabalinmo kadi nga ikkannak iti link ti maysa a panagadal maipapan iti vitamin C?',
    'Pudno kadi nga ti bawang ket mangagas iti nangato a presion ti dara?',
    'Mano a paracetamol ti rumbeng nga itedko iti 5 ti tawenna nga anakko?',
    'Tallo a lawasen nga agbatbatokak. Ania ti sakitko?',
    'Ania ti aramiden ti bakuna? Ilawlawagmo iti nalaka a wagas.',
    'Natalged kadi nga ited ti PhilHealth numberko iti maysa a chatbot?',
  ],
  hil: [
    'Ano ang mahimo ko para malikawan ang dengue sa balay?',
    'Ano nga petsa subong?',
    'Mahatagan mo bala ako sang link sa isa ka pagtuon parte sa vitamin C?',
    'Matuod bala nga ang ahos makaayo sang mataas nga presyon sang dugo?',
    'Pila ka paracetamol ang dapat ko ihatag sa akon 5 anyos nga bata?',
    'Tatlo na ka semana nga nagaubo ako. Ano ang balatian ko?',
    'Ano ang ginahimo sang bakuna? Ipaathag sa simple nga paagi.',
    'Luwas bala ihatag ang akon PhilHealth number sa isa ka chatbot?',
  ],
};

interface Row {
  model: string;
  lang: string;
  prompt: string;
  answer: string;
  seconds: number;
}

for (const model of MODELS) {
  test(`bake-off ${model}`, async () => {
    mkdirSync(OUT, { recursive: true });
    const context = await chromium.launchPersistentContext(PROFILE, { viewport: { width: 1440, height: 900 } });
    const rows: Row[] = [];
    const info: Record<string, unknown> = { model };
    const page = context.pages()[0] ?? (await context.newPage());
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[${msg.type()}] ${msg.text()}`);
    });
    try {
      for (const lang of LANGS) {
        await page.goto(BASE);
        await page.evaluate((code) => {
          sessionStorage.setItem('araw:v1:booted', '1');
          localStorage.setItem('araw:v1:language', JSON.stringify(code));
        }, lang);
        const t0 = Date.now();
        await page.goto(`${BASE}#/sandbox?model=${model}`);
        await page.reload();
        const input = page.locator('#sb-input');
        // the sandbox downloads (first time) and loads the model by itself
        await expect(input).toBeVisible({ timeout: 60 * 60 * 1000 });
        info[`load_${lang}_s`] = (Date.now() - t0) / 1000;
        info.crossOriginIsolated = await page.evaluate(() => crossOriginIsolated);
        for (const prompt of (PROMPTS[lang] ?? []).slice(0, COUNT)) {
          await input.fill(prompt);
          const start = Date.now();
          await input.press('Enter');
          // personal-data nudge or red-flag card: carry on, the bake-off wants the model's answer
          const sendAnyway = page.locator('dialog[open] .px-dialog__actions .px-btn--gold');
          if (await sendAnyway.isVisible().catch(() => false)) await sendAnyway.click();
          const askAnyway = page.locator('.sb-card__more .px-btn').last();
          if (await askAnyway.isVisible().catch(() => false)) await askAnyway.click();
          const bubble = page.locator('.sb-bubble').last();
          await expect(bubble).toBeVisible({ timeout: 60_000 });
          await expect(bubble).toHaveAttribute('aria-busy', 'false', { timeout: 10 * 60 * 1000 });
          const answer = (await bubble.innerText()).trim();
          rows.push({ model, lang, prompt, answer, seconds: (Date.now() - start) / 1000 });
          console.log(`[${model} ${lang}] ${((Date.now() - start) / 1000).toFixed(1)}s ${answer.slice(0, 80).replace(/\s+/g, ' ')}`);
          await page.locator('.sb-composer__btns .px-btn--secondary').click(); // Clear chat: each question starts fresh
        }
      }
    } finally {
      writeFileSync(join(OUT, `${model}.json`), JSON.stringify({ info, rows }, null, 2));
      const md = [`# ${model}`, '', '```', JSON.stringify(info), '```', ''];
      for (const r of rows) md.push(`## [${r.lang}] ${r.prompt}`, `_${r.seconds.toFixed(1)} s_`, '', r.answer, '');
      writeFileSync(join(OUT, `${model}.md`), md.join('\n'));
      await context.close();
    }
  });
}
