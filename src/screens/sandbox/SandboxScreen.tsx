// Chatbot Sandbox (#/sandbox): chat with a real, small AI model that runs on the player's own device, then judge each answer.
// Safety (src/sandbox/guard.ts): red flags get the "Magpatingin agad" card first, self-harm gets the hotline and never
// reaches the model, personal details get a nudge, and medicine doses are hidden from answers. Chats are not saved.
// Desktop: missions | chat | trust tips. Tablet and phone: the chat first, then missions and tips.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t, type StringKey } from '../../app/i18n';
import { language } from '../../app/language';
import { xpClaims } from '../../app/progress';
import { hrefFor, location$ } from '../../app/router';
import { sfx } from '../../app/sound';
import { getEngine, type Engine, type EngineStatus } from '../../sandbox/engine';
import { createDoseFilter, detectPersonalData, detectRedFlags, MAX_INPUT, type PersonalKind } from '../../sandbox/guard';
import { completeMission, isMissionDone, MISSION_XP, MISSIONS, missionsDone, RATINGS_NEEDED, type Mission } from '../../sandbox/missions';
import { pickModel } from '../../sandbox/model';
import { buildMessages, tidyAnswer, type ChatTurn } from '../../sandbox/prompt';
import { useReducedMotion } from '../../ui/Ara';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Dialog, Panel, ProgressBar, pushToast } from '../../ui/kit';
import '../../styles/chatbot.css';
import '../../styles/sandbox.css';

type Ruling = 'tama' | 'mali' | 'magpatingin';

const RULINGS: ReadonlyArray<{ id: Ruling; name: StringKey; label: StringKey; tip: StringKey; variant: 'fact' | 'fake' | 'gold' }> = [
  { id: 'tama', name: 'cb.tama', label: 'cb.tama.label', tip: 'sb.tip.tama', variant: 'fact' },
  { id: 'mali', name: 'cb.mali', label: 'cb.mali.label', tip: 'sb.tip.mali', variant: 'fake' },
  { id: 'magpatingin', name: 'cb.magpatingin', label: 'cb.magpatingin.label', tip: 'sb.tip.magpatingin', variant: 'gold' },
];

const STARTERS: readonly StringKey[] = ['sb.s1', 'sb.s2', 'sb.s3', 'sb.s4', 'sb.s5', 'sb.s6'];

type Msg =
  | { id: number; kind: 'user'; text: string }
  | { id: number; kind: 'bot'; text: string; done: boolean; stopped?: boolean; failed?: boolean; dosed?: boolean; rating?: Ruling }
  | { id: number; kind: 'redflag'; pending: string; asked: boolean }
  | { id: number; kind: 'selfharm' };

const MB = 1024 * 1024;
const mb = (bytes: number): string => String(Math.round(bytes / MB));

/* ---------- Loading, unsupported and error states ---------- */

function LoadState({ engine, status }: { engine: Engine; status: EngineStatus }) {
  const size = String(engine.model.sizeMB);
  switch (status.kind) {
    case 'downloading':
      return (
        <div class="sb-state stack">
          <h2 class="sb-state__title">{t('sb.load.downloading')}</h2>
          <ProgressBar value={Math.round(status.loaded / MB)} max={Math.max(1, Math.round(status.total / MB))} text={t('sb.load.progress', { done: mb(status.loaded), total: mb(status.total) })} label={t('sb.load.downloading')} />
          <p>{t('sb.load.once', { size })}</p>
          <p class="px-text-muted">{t('sb.load.wifi')}</p>
        </div>
      );
    case 'unsupported':
      return (
        <div class="sb-state stack">
          <h2 class="sb-state__title">{t('sb.unsupported.title')}</h2>
          <p>{t(status.reason === 'memory' ? 'sb.unsupported.memory' : status.reason === 'storage' ? 'sb.unsupported.storage' : 'sb.unsupported.browser', { size })}</p>
          <p>{t('sb.unsupported.game')}</p>
          <div>
            <Button variant="gold" href={hrefFor('/learn/m03')}>
              {t('sb.unsupported.link')}
              <Icon name="arrow-right" />
            </Button>
          </div>
        </div>
      );
    case 'error':
      return (
        <div class="sb-state stack" role="alert">
          <p>{t('sb.error.load')}</p>
          <div>
            <Button variant="secondary" onClick={() => void engine.load()}>
              <Icon name="reload" />
              {t('sb.retry')}
            </Button>
          </div>
        </div>
      );
    default:
      // idle, checking, loading
      return (
        <div class="sb-state stack">
          <p class="sb-wait" role="status">
            {t(status.kind === 'loading' ? 'sb.load.loading' : 'sb.load.checking')}
          </p>
        </div>
      );
  }
}

/* ---------- Chat pieces ---------- */

function TrustRow({ msg, onRate }: { msg: Extract<Msg, { kind: 'bot' }>; onRate: (r: Ruling) => void }) {
  const picked = RULINGS.find((r) => r.id === msg.rating);
  if (picked) {
    return (
      <div class="sb-trust-row sb-trust-row--done">
        <p class="sb-trust-row__yours">{t('sb.trust.yours', { r: t(picked.name) })}</p>
        <p class="sb-tip">
          <Icon name="info" size={20} />
          <span>{t(picked.tip)}</span>
        </p>
      </div>
    );
  }
  return (
    <div class="sb-trust-row" role="group" aria-label={t('sb.trust.q')}>
      <p class="sb-trust-row__q">{t('sb.trust.q')}</p>
      <div class="sb-trust-row__btns">
        {RULINGS.map((r) => (
          <Button key={r.id} variant={r.variant} aria-label={t(r.label)} data-sfx="none" onClick={() => onRate(r.id)}>
            {t(r.name)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RedFlagCard({ msg, onAsk }: { msg: Extract<Msg, { kind: 'redflag' }>; onAsk: () => void }) {
  return (
    <div class="sb-card sb-card--flag" role="alert">
      <p class="sb-card__title">
        <Icon name="warning" size={24} />
        {t('sb.rf.title')}
      </p>
      <p>{t('sb.rf.text')}</p>
      {!msg.asked && (
        <div class="sb-card__more">
          <p class="px-text-muted">{t('sb.rf.general')}</p>
          <Button variant="secondary" onClick={onAsk}>
            {t('sb.rf.ask')}
          </Button>
        </div>
      )}
    </div>
  );
}

function SelfHarmCard() {
  return (
    <div class="sb-card sb-card--care" role="alert">
      <p class="sb-card__title">
        <Icon name="heart" size={24} />
        {t('sb.sh.title')}
      </p>
      <p>{t('sb.sh.text')}</p>
    </div>
  );
}

/** Witty "thinking" lines while the model works on its first words (in the app language through t()). */
const THINKING: readonly StringKey[] = [
  'sb.think.1', 'sb.think.2', 'sb.think.3', 'sb.think.4', 'sb.think.5', 'sb.think.6', 'sb.think.7',
  'sb.think.8', 'sb.think.9', 'sb.think.10', 'sb.think.11', 'sb.think.12', 'sb.think.13', 'sb.think.14',
];
const THINK_MS = 2200;

/** Typing dots plus a rotating funny line. Reduced motion: one line, no rotation. Screen readers hear one plain status. */
function Thinking() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(() => Math.floor(Math.random() * THINKING.length));
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1 + Math.floor(Math.random() * (THINKING.length - 1))) % THINKING.length), THINK_MS);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <div class="sb-typing">
      <span class="sr-only">{t('sb.thinking')}</span>
      <span class="sb-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span class="sb-think" aria-hidden="true" key={i}>
        {t(THINKING[i] as StringKey)}
      </span>
    </div>
  );
}

function BotBubble({ msg, onRate }: { msg: Extract<Msg, { kind: 'bot' }>; onRate: (r: Ruling) => void }) {
  const text = tidyAnswer(msg.text);
  return (
    <div class="cb-msg cb-msg--bot sb-msg">
      <span class="cb-msg__who">
        <Icon name="robot" size={16} />
        {t('sb.bot')}
      </span>
      <div class="cb-bubble cb-bubble--bot sb-bubble" aria-busy={!msg.done}>
        {text ? (
          <p class="sb-text" data-no-tx>
            {text}
          </p>
        ) : !msg.failed ? (
          <Thinking />
        ) : null}
        {msg.stopped && <p class="sb-note">{t('sb.stopped')}</p>}
        {msg.failed && <p class="sb-note sb-note--error">{t('sb.error.chat')}</p>}
        {msg.dosed && msg.done && <p class="sb-note">{t('sb.doseNote')}</p>}
      </div>
      <span class="sb-label">{t('sb.label')}</span>
      {msg.done && !msg.failed && text && <TrustRow msg={msg} onRate={onRate} />}
    </div>
  );
}

/* ---------- Chat panel ---------- */

function Chat({ engine }: { engine: Engine }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [privacy, setPrivacy] = useState<{ text: string; kinds: PersonalKind[] } | null>(null);
  const [announce, setAnnounce] = useState('');
  const msgsRef = useRef<Msg[]>([]);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const generating = engine.generating.value;
  const lang = language.value ?? 'en';

  const update = (next: Msg[]) => {
    msgsRef.current = next;
    setMsgs(next);
  };
  const patch = (id: number, change: Partial<Extract<Msg, { kind: 'bot' }>>) =>
    update(msgsRef.current.map((m) => (m.id === id && m.kind === 'bot' ? { ...m, ...change } : m)));

  // keep the newest message in view while the answer streams in
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [msgs]);

  // leaving the page stops an answer that is still being written
  useEffect(() => () => engine.stop(), [engine]);

  const ask = async () => {
    const history: ChatTurn[] = [];
    for (const m of msgsRef.current) {
      if (m.kind === 'user') history.push({ role: 'user', content: m.text });
      else if (m.kind === 'bot' && m.done && !m.failed && m.text) history.push({ role: 'assistant', content: m.text });
    }
    const id = nextId.current++;
    update([...msgsRef.current, { id, kind: 'bot', text: '', done: false }]);
    const filter = createDoseFilter(t('sb.doseHidden'));
    try {
      const { stopped } = await engine.chat(buildMessages(history, lang), (piece) => patch(id, { text: filter.push(piece) }));
      const text = filter.end();
      patch(id, { text, done: true, stopped, dosed: filter.hidDose });
      if (text) setAnnounce(t('sb.announce', { text: tidyAnswer(text) }));
      if (text && !stopped) award(MISSIONS[0] as Mission);
    } catch {
      patch(id, { text: filter.end(), done: true, failed: true });
    }
  };

  const award = (mission: Mission) => {
    const xp = completeMission(mission.id);
    if (xp > 0) pushToast({ kind: 'xp', title: t('sb.m.xp', { n: xp }), text: t(mission.title) });
  };

  const send = (raw: string, opts: { checked?: boolean } = {}) => {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text || generating) return;
    if (!opts.checked) {
      const kinds = detectPersonalData(text);
      if (kinds.length > 0) {
        setPrivacy({ text, kinds });
        return;
      }
    }
    setDraft('');
    const user: Msg = { id: nextId.current++, kind: 'user', text };
    const flags = detectRedFlags(text);
    if (flags.selfHarm) {
      update([...msgsRef.current, user, { id: nextId.current++, kind: 'selfharm' }]);
      return;
    }
    if (flags.ids.length > 0) {
      sfx('hint');
      update([...msgsRef.current, user, { id: nextId.current++, kind: 'redflag', pending: text, asked: false }]);
      return;
    }
    update([...msgsRef.current, user]);
    void ask();
  };

  const askAnyway = (id: number) => {
    update(msgsRef.current.map((m) => (m.id === id && m.kind === 'redflag' ? { ...m, asked: true } : m)));
    void ask();
  };

  const rate = (id: number, rating: Ruling) => {
    sfx('select'); // no right or wrong here: the answer was generated, the player's judgement is what counts
    patch(id, { rating });
    const rated = msgsRef.current.filter((m) => m.kind === 'bot' && m.rating).length;
    if (rated >= RATINGS_NEEDED) award(MISSIONS.find((m) => m.id === 'rate') as Mission);
  };

  const clear = () => {
    engine.stop();
    update([]);
    setAnnounce('');
    inputRef.current?.focus();
  };

  const kindsText = privacy ? privacy.kinds.map((k) => t(`sb.pii.${k}` as StringKey)).join(', ') : '';

  return (
    <div class="sb-chat">
      <div class="cb-chat px-box sb-log" ref={logRef} role="log" aria-label={t('sb.chatLabel')} aria-live="off" tabIndex={0}>
        {msgs.length === 0 && <p class="sb-empty">{t('sb.empty')}</p>}
        {msgs.map((m) => {
          if (m.kind === 'user') {
            return (
              <div key={m.id} class="cb-msg cb-msg--bea sb-msg">
                <span class="cb-msg__who">{t('sb.you')}</span>
                <p class="cb-bubble cb-bubble--bea sb-text" data-no-tx>
                  {m.text}
                </p>
              </div>
            );
          }
          if (m.kind === 'bot') return <BotBubble key={m.id} msg={m} onRate={(r) => rate(m.id, r)} />;
          if (m.kind === 'redflag') return <RedFlagCard key={m.id} msg={m} onAsk={() => askAnyway(m.id)} />;
          return <SelfHarmCard key={m.id} />;
        })}
      </div>
      <p class="sr-only" role="status" data-no-tx>
        {announce}
      </p>

      <div class="sb-starters">
        <p class="sb-starters__title" id="sb-starters-h">
          {t('sb.starters')}
        </p>
        <ul class="sb-starters__list" aria-labelledby="sb-starters-h">
          {STARTERS.map((key) => (
            <li key={key}>
              <button type="button" class="sb-starter" disabled={generating} onClick={() => send(t(key))}>
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        class="sb-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label class="sb-composer__label" for="sb-input">
          {t('sb.input')}
        </label>
        <textarea
          id="sb-input"
          ref={inputRef}
          class="sb-input"
          rows={2}
          maxLength={MAX_INPUT}
          placeholder={t('sb.placeholder')}
          value={draft}
          aria-describedby="sb-count"
          onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <div class="sb-composer__bar">
          <span class="sb-count" id="sb-count">
            {t('sb.count', { n: draft.length, max: MAX_INPUT })}
          </span>
          <div class="sb-composer__btns">
            {msgs.length > 0 && (
              <Button variant="secondary" onClick={clear}>
                <Icon name="delete" />
                {t('sb.clear')}
              </Button>
            )}
            {generating ? (
              <Button variant="fake" onClick={() => engine.stop()}>
                <Icon name="close" />
                {t('sb.stop')}
              </Button>
            ) : (
              <Button type="submit" variant="gold" disabled={!draft.trim()}>
                <Icon name="send" />
                {t('sb.send')}
              </Button>
            )}
          </div>
        </div>
      </form>

      <Dialog
        open={privacy !== null}
        title={t('sb.pii.title')}
        onClose={() => setPrivacy(null)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPrivacy(null);
                inputRef.current?.focus();
              }}
            >
              {t('sb.pii.edit')}
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                const text = privacy?.text ?? '';
                setPrivacy(null);
                send(text, { checked: true });
              }}
            >
              {t('sb.pii.send')}
            </Button>
          </>
        }
      >
        <div class="stack">
          <p>{t('sb.pii.text', { kinds: kindsText })}</p>
          <p class="px-text-muted">{t('sb.pii.local')}</p>
        </div>
      </Dialog>
    </div>
  );
}

/* ---------- Side panels ---------- */

function Missions() {
  const claims = xpClaims.value;
  const done = missionsDone(claims);
  return (
    <Panel class="sb-missions" aria-labelledby="sb-missions-h">
      <div class="stack">
        <div class="sb-panel-head">
          <h2 class="panel-title" id="sb-missions-h">
            {t('sb.missions')}
          </h2>
          <Chip kind={done === MISSIONS.length ? 'fact' : undefined}>{t('sb.missionsDone', { done, total: MISSIONS.length })}</Chip>
        </div>
        <ul class="sb-mission-list">
          {MISSIONS.map((m) => {
            const isDone = isMissionDone(m.id, claims);
            return (
              <li key={m.id} class={`sb-mission${isDone ? ' sb-mission--done' : ''}`}>
                <span class="sb-mission__icon" aria-hidden="true">
                  <Icon name={isDone ? 'check' : 'search'} size={20} />
                </span>
                <div class="sb-mission__body">
                  <p class="sb-mission__title">
                    {t(m.title)}
                    {isDone && <span class="sr-only"> ({t('sb.m.done')})</span>}
                  </p>
                  <p class="sb-mission__hint">{t(m.hint)}</p>
                  {!isDone && !m.auto && (
                    <Button
                      variant="secondary"
                      class="sb-mission__tick"
                      aria-label={t('sb.m.tickLabel', { mission: t(m.title) })}
                      onClick={() => {
                        const xp = completeMission(m.id);
                        if (xp > 0) pushToast({ kind: 'xp', title: t('sb.m.xp', { n: xp }), text: t(m.title) });
                      }}
                    >
                      <Icon name="check" />
                      {t('sb.m.tick')}
                    </Button>
                  )}
                </div>
                {!isDone && <Chip kind="xp">{t('sb.m.xp', { n: MISSION_XP })}</Chip>}
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

function TrustTips({ engine }: { engine: Engine }) {
  const m = engine.model;
  return (
    <Panel class="sb-tips" aria-labelledby="sb-tips-h">
      <div class="stack">
        <h2 class="panel-title" id="sb-tips-h">
          {t('sb.trustTitle')}
        </h2>
        <ul class="sb-tip-list">
          <li class="sb-tip-item sb-tip-item--ok">
            <Icon name="check" size={20} />
            <span>{t('sb.trust.ok')}</span>
          </li>
          <li class="sb-tip-item sb-tip-item--check">
            <Icon name="search" size={20} />
            <span>{t('sb.trust.check')}</span>
          </li>
          <li class="sb-tip-item sb-tip-item--never">
            <Icon name="warning" size={20} />
            <span>{t('sb.trust.never')}</span>
          </li>
        </ul>
        <p class="sb-lang-note">{t('sb.langNote')}</p>
        <p class="sb-private">
          <Icon name="shield" size={20} />
          <span>{t('sb.private')}</span>
        </p>
        <h3 class="sb-about__title">{t('sb.about')}</h3>
        <p class="px-text-muted">{t('sb.aboutText', { model: m.label, size: m.sizeMB, license: m.license })}</p>
      </div>
    </Panel>
  );
}

export default function SandboxScreen() {
  const requested = location$.value.query.model;
  const model = useMemo(() => pickModel(requested), [requested]);
  const engine = getEngine(model);
  const status = engine.status.value;

  useEffect(() => {
    void engine.init();
  }, [engine]);

  return (
    <div class="sb">
      <Panel class="sb-main" aria-labelledby="sb-main-h">
        <div class="stack">
          <div class="sb-panel-head">
            <h2 id="sb-main-h" class="sb-title">
              <Icon name="robot" size={24} />
              {t('sb.chatLabel')}
            </h2>
            <Chip>{t('sb.kicker')}</Chip>
          </div>
          <p>{t('sb.intro')}</p>
          {status.kind === 'ready' ? <Chat engine={engine} /> : <LoadState engine={engine} status={status} />}
        </div>
      </Panel>

      <div class="sb-left">
        <Panel class="sb-ara" aria-labelledby="sb-ara-h">
          <h2 class="sr-only" id="sb-ara-h">
            {t('sb.kicker')}
          </h2>
          <AraSays mood="happy" scale={3} side="top">
            <p>{t('sb.ara')}</p>
          </AraSays>
        </Panel>
        <Missions />
      </div>

      <div class="sb-right">
        <TrustTips engine={engine} />
      </div>
    </div>
  );
}
