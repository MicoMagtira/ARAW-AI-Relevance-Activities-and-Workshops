// The generic lecture driver: turns one module's content into a list of beats, played in the real lesson screen.
// Title card, objectives, hook, every card in order (questions get a "think about it" pause, then the best answer and its
// feedback), the module game (module override), the takeaway and the closing card. Selectors are the lesson screen's own.
import { hideCard, showCard } from './lib.mjs';

const THINK_MS = 5000;
const NEXT = '.lesson-actions .px-btn--gold:not([disabled])';
const TYPE_CLASS = { 'story-hook': 'story', info: 'info', reveal: 'reveal', choice: 'choice', 'swipe-sort': 'sort', poll: 'poll', takeaway: 'takeaway' };

const txt = async (loc) => ((await loc.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
/** Sentences for the narration: each part ends with a full stop unless it already ends with ? ! . or : */
const join = (...parts) => parts.filter(Boolean).map((p) => (/[.?!:"]$/.test(p) ? p : `${p}.`)).join(' ');

/**
 * ctx: { page, h, t, L (bridge lines, translated), info, content, url, override, beat }.
 * `beat({ screen, narr, read, run, min, fixed })`: run the action, then hold. `screen` and `narr` may be functions (they
 * are called after the action, when the page shows the result); `read` is the text whose words set the hold.
 */
export async function playLecture(ctx) {
  const { page, h, t, L, info, content, beat } = ctx;
  const ara = () => txt(page.locator('.lesson-ara p'));
  const next = () => h.tap(page.locator(NEXT));
  const waitCard = (type) => page.locator(`.lesson-card .card--${TYPE_CLASS[type]}`).waitFor({ state: 'visible', timeout: 20_000 });
  const settle = () => h.sleep(1200); // Ara's bubble and the card finish animating

  // 1. title card (already showing when the capture starts)
  await beat({
    screen: `Title card: Module ${info.n}`,
    narr: join(t('learn.dialogTitle', { n: info.n }), t(info.title), t(info.topic)),
    read: '',
    min: 8000,
  });

  // 2. objectives
  await beat({
    screen: 'Card: what you will learn',
    narr: join(`${t('learn.objectives')}:`, ...info.objectives.map((o) => t(o))),
    read: [t('learn.objectives'), ...info.objectives.map((o) => t(o))].join(' '),
    async run() {
      await showCard(page, { kicker: t('learn.dialogTitle', { n: info.n }), heading: t('learn.objectives'), items: info.objectives.map((o) => t(o)) });
    },
  });
  await hideCard(page);

  // 3 and 4. hook, then every card in order
  const cards = [content.hook, ...content.cards];
  for (const [i, card] of cards.entries()) {
    if (i > 0) await next();
    await waitCard(card.type);
    await settle();
    const tag = `Card ${i + 1}/${cards.length}`;
    await playCard(card, tag);
  }

  async function playCard(card, tag) {
    switch (card.type) {
      case 'story-hook':
        return beat({
          screen: `${tag}, story: ${t(card.scene)}`,
          narr: async () => join(`${t(card.scene)}.`, `${t(card.speaker)}: ${t(card.line)}`, await ara()),
          read: async () => join(t(card.scene), t(card.line), t(card.speaker), await ara()),
        });
      case 'info':
        return beat({
          screen: `${tag}, idea: ${t(card.title)}`,
          narr: async () => join(t(card.title), t(card.body), await ara()),
          read: async () => join(t(card.title), t(card.body), await ara()),
        });
      case 'reveal': {
        await beat({
          screen: `${tag}, tap to reveal: ${t(card.title)}`,
          narr: join(`${t(card.title)}.`, t(card.prompt)),
          read: join(t(card.title), t(card.prompt)),
        });
        for (const [k, tile] of card.tiles.entries()) {
          await beat({
            screen: `${tag}, tile ${k + 1}/${card.tiles.length}: ${t(tile.label)}`,
            narr: async () => join(`${t(tile.label)}.`, t(tile.detail), await ara()),
            read: async () => join(t(tile.label), t(tile.detail), await ara()),
            min: 6000,
            run: () => h.tap(page.locator('.tiles .tile').nth(k)),
          });
        }
        return;
      }
      case 'choice': {
        const opts = card.options.map((o, k) => `${k + 1}. ${t(o.text)}`);
        await beat({ screen: `${tag}, question: ${t(card.question)}`, narr: join(t(card.question), ...opts), read: join(t(card.question), ...opts) });
        await beat({ screen: `${tag}, think about it`, narr: L.think, fixed: THINK_MS });
        const best = card.options[card.correct];
        await beat({
          screen: `${tag}, best answer: ${t(best.text)}`,
          narr: async () => {
            const others = card.options.filter((_, k) => k !== card.correct).map((o) => t(o.feedback));
            return join(`${t(best.text)}.`, t(best.feedback), ...others, await ara());
          },
          read: async () => join(t(best.feedback), ...card.options.filter((_, k) => k !== card.correct).map((o) => t(o.feedback)), await ara()),
          run: () => h.tap(page.locator('.options .option').nth(card.correct)),
        });
        return;
      }
      case 'poll': {
        const opts = card.options.map((o, k) => `${k + 1}. ${t(o)}`);
        await beat({ screen: `${tag}, poll: ${t(card.question)}`, narr: join(t(card.question), ...opts), read: join(t(card.question), ...opts) });
        await beat({ screen: `${tag}, think about it`, narr: L.think, fixed: THINK_MS });
        await beat({
          screen: `${tag}, answer and reflection`,
          narr: async () => join(`${t(card.options[0])}.`, t(card.reflection), await ara()),
          read: async () => join(t(card.reflection), await ara()),
          run: () => h.tap(page.locator('.options .option').nth(0)),
        });
        return;
      }
      case 'swipe-sort': {
        const [left, right] = card.bins;
        await beat({
          screen: `${tag}, sort: ${t(card.title)}`,
          narr: join(`${t(card.title)}.`, `${t(left.label)} / ${t(right.label)}`),
          read: join(t(card.title), t(left.label), t(right.label)),
        });
        await beat({ screen: `${tag}, think about it`, narr: L.think, fixed: THINK_MS });
        for (const [k, item] of card.items.entries()) {
          const bin = item.bin === left.id ? 0 : 1;
          await beat({
            screen: `${tag}, item ${k + 1}/${card.items.length}: ${t(item.text)}`,
            narr: join(`${t(item.text)}.`, `${t(bin === 0 ? left.label : right.label)}.`, t(item.why)),
            read: join(t(item.text), t(item.why)),
            min: 6000,
            run: async () => {
              await h.sleep(2500); // the item is readable before the answer lands
              await h.tap(page.locator('.sort-bins button').nth(bin));
            },
          });
        }
        return;
      }
      default:
        throw new Error(`no lecture beats for card type "${card.type}"`);
    }
  }

  // 5. the module game: briefing and a few seconds of play (module override)
  await next();
  await page.locator('.card--game').waitFor({ state: 'visible', timeout: 20_000 });
  await settle();
  if (!ctx.override?.game) throw new Error(`${info.id} needs scripts/lectures/overrides/${info.id}.mjs with a game(ctx) to play its game`);
  await ctx.override.game(ctx);

  // 6. takeaway
  await next();
  await waitCard('takeaway');
  await settle();
  const bullets = content.takeaway.bullets.map((b, k) => `${k + 1}. ${t(b)}`);
  await beat({
    screen: 'Takeaway: when should I trust it?',
    narr: async () => join(L.takeawayIntro, `${await txt(page.locator('.card--takeaway .card__title'))}`, ...bullets),
    read: async () => join(L.takeawayIntro, await txt(page.locator('.card--takeaway .card__title')), ...bullets),
  });

  // 7. closing card
  await beat({
    screen: 'Closing card: practise in ARAW',
    narr: join(`${L.practise}.`, L.tryIt, ctx.url),
    read: join(L.practise, L.tryIt, ctx.url),
    min: 8000,
    async run() {
      await showCard(page, { kicker: 'ARAW', heading: L.practise, line: L.tryIt, link: ctx.url });
    },
  });
}
