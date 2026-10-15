// Realistic renderers per item format (feed post, GC message, sponsored picture ad, chatbot answer).
// Every card carries the small "ARAW GAME" watermark; a revealed fake also gets the FAKE stamp (docs/CONTENT_GUIDE.md section 8).
import { t } from '../../app/i18n';
import type { FofItem } from '../../content/factOrFake/schema';
import { Icon } from '../../ui/Icon';
import { Stamp, Watermark } from '../../ui/kit';
import { SceneArt } from './scenes';

const AVATAR_TONES = 4;

/** Stable tone 0..3 for an author, so the same page always has the same avatar colour. */
export function avatarTone(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % AVATAR_TONES;
}

export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span class={`fof-avatar fof-avatar--${avatarTone(name)}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function PostBody({ item, sponsored }: { item: FofItem; sponsored?: boolean }) {
  return (
    <>
      <header class="fof-post__head">
        <Avatar name={item.author} />
        <div class="fof-post__who">
          <strong class="fof-post__author">{item.author}</strong>
          <span class="fof-post__meta">{item.meta}</span>
        </div>
      </header>
      <p class="fof-post__text">{item.text}</p>
      {item.image && <SceneArt image={item.image} />}
      {sponsored && (
        <div class="fof-cta" aria-hidden="true">
          <span>{t('fof.cta')}</span>
        </div>
      )}
      <footer class="fof-post__actions" aria-hidden="true">
        <span>
          <Icon name="heart" size={16} /> {t('fof.like')}
        </span>
        <span>{t('fof.comment')}</span>
        <span>{t('fof.share')}</span>
      </footer>
    </>
  );
}

function Gc({ item }: { item: FofItem }) {
  return (
    <>
      <header class="fof-gc__bar">
        <Icon name="chevron-left" size={16} />
        <span class="fof-gc__title">{item.meta}</span>
      </header>
      <div class="fof-gc__body">
        <div class="fof-gc__row">
          <Avatar name={item.author} />
          <div class="fof-gc__bubble">
            <strong class="fof-gc__name">{item.author}</strong>
            <p>{item.text}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Chatbot({ item }: { item: FofItem }) {
  return (
    <>
      <header class="fof-bot__bar">
        <span class="fof-bot__icon" aria-hidden="true">
          AI
        </span>
        <strong>{item.author}</strong>
      </header>
      <div class="fof-bot__body">
        <div class="fof-bot__you">
          <span class="fof-bot__label">{t('fof.you')}</span>
          <p>{item.meta}</p>
        </div>
        <div class="fof-bot__them">
          <span class="fof-bot__label">{item.author}</span>
          <p>{item.text}</p>
        </div>
      </div>
    </>
  );
}

interface ItemCardProps {
  item: FofItem;
  /** The answer has been given: fakes get the stamp. */
  revealed?: boolean;
}

export function ItemCard({ item, revealed }: ItemCardProps) {
  const sponsored = item.format === 'image' && /sponsored/i.test(item.meta);
  const label = t(`fof.format.${item.format}` as const);
  return (
    <article class={`fof-card px-box fof-card--${item.format}`} aria-label={`${label}: ${item.author}`}>
      {item.format === 'gc_screenshot' && <Gc item={item} />}
      {item.format === 'chatbot_answer' && <Chatbot item={item} />}
      {(item.format === 'text' || item.format === 'image') && <PostBody item={item} sponsored={sponsored} />}
      <Watermark />
      {revealed && item.truth === 'fake' && <Stamp />}
    </article>
  );
}
