// Daily Challenge (docs/SPEC.md section 7): today's featured game with the day's seed, plus 3 date-seeded Fact or Fake items.
// One scored try a day, a Wordle-style share text and the streak with its weekly freeze.
import { useMemo, useState } from 'preact/hooks';
import { dailyGame, manilaDate, manilaDayLabel } from '../../app/daily';
import { DAILY_BONUS_XP, DAILY_ITEM_COUNT, dailyRecord, isComplete, recordDailyFof, recordFor, shareText } from '../../app/dailyChallenge';
import { t } from '../../app/i18n';
import { modulesDone } from '../../app/progress';
import { hrefFor } from '../../app/router';
import { streak } from '../../app/state';
import { activeStreak, weekStart } from '../../app/streak';
import { MODULES } from '../../content/modules';
import { dailyItems } from '../../games/fact-or-fake/rounds';
import { FofRound } from '../../games/fact-or-fake/FofRound';
import { AraSays } from '../../ui/AraBubble';
import { Confetti } from '../../ui/Confetti';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Panel } from '../../ui/kit';
import '../../styles/daily.css';

function StatusChip({ done }: { done: boolean }) {
  return <Chip kind={done ? 'fact' : undefined}>{done ? t('daily.done') : t('daily.todo')}</Chip>;
}

/** Copy text: the async clipboard API, then the old select-and-copy way (some phone browsers only allow that). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function ResultPanel({ text, complete, stepsDone }: { text: string; complete: boolean; stepsDone: number }) {
  const [status, setStatus] = useState('');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => setStatus((await copyText(text)) ? t('daily.copied') : t('daily.copyFail'));
  const share = async () => {
    try {
      await navigator.share({ title: 'ARAW Daily', text });
    } catch {
      /* the player closed the share sheet: nothing to report */
    }
  };

  if (!complete) {
    return (
      <Panel class="daily-result" aria-labelledby="daily-result-h">
        <div class="stack">
          <h2 class="panel-title" id="daily-result-h">
            {t('daily.resultTitle')}
          </h2>
          <AraSays mood="idle" scale={3} side="left">
            <p>{t('daily.resultWait')}</p>
            <p class="px-text-muted">{t('daily.stepsDone', { n: stepsDone })}</p>
          </AraSays>
        </div>
      </Panel>
    );
  }
  return (
    <Panel class="daily-result" aria-labelledby="daily-result-h">
      <Confetti count={40} />
      <div class="stack">
        <h2 class="panel-title" id="daily-result-h">
          {t('daily.resultTitle')}
        </h2>
        <AraSays mood="wow" scale={3} side="left">
          <p class="daily-result__head">{t('daily.resultHeading')}</p>
          <Chip kind="xp">
            <Icon name="xp-star" size={16} />
            {t('daily.xp', { n: DAILY_BONUS_XP })}
          </Chip>
        </AraSays>
        <pre class="daily-share px-box" aria-label={t('daily.shareLabel')} data-testid="daily-share">
          {text}
        </pre>
        <div class="daily-actions">
          <Button variant="gold" onClick={copy}>
            {t('daily.copy')}
          </Button>
          {canShare && (
            <Button variant="secondary" onClick={share}>
              {t('daily.share')}
            </Button>
          )}
        </div>
        <p class="daily-status" role="status">
          {status}
        </p>
        <p class="px-text-muted">{t('daily.shareHint')}</p>
        <p class="px-text-muted">{t('daily.comeBack')}</p>
      </div>
    </Panel>
  );
}

function StreakPanel({ date }: { date: string }) {
  const s = streak.value;
  const days = activeStreak(s, date);
  const used = s.freezeWeek === weekStart(date);
  return (
    <Panel class="daily-streak" aria-labelledby="daily-streak-h">
      <div class="stack">
        <h2 class="panel-title" id="daily-streak-h">
          {t('daily.streakTitle')}
        </h2>
        <p class="daily-streak__days">
          <Icon name="flame" size={24} /> {t('daily.streakDays', { n: days })}
        </p>
        <p class="px-text-muted">{t('daily.streakBest', { n: s.best })}</p>
        <p class="daily-freeze">{used ? t('daily.freezeUsed') : t('daily.freezeReady')}</p>
        <p class="px-text-muted">{t('daily.streakNote')}</p>
      </div>
    </Panel>
  );
}

export default function DailyScreen() {
  const date = useMemo(() => manilaDate(), []);
  const game = dailyGame(date);
  const items = useMemo(() => dailyItems(date), [date]);
  const record = recordFor(date, dailyRecord.value);
  const [playing, setPlaying] = useState(false);

  const locked = !!game.module && !modulesDone.value.includes(game.module);
  const moduleN = MODULES.find((m) => m.id === game.module)?.n ?? 0;
  const gameHref = hrefFor(`/arcade/${game.slug}`, { seed: 'daily' });
  const complete = isComplete(record);
  const stepsDone = (record.game ? 1 : 0) + (record.fof ? 1 : 0);
  const fofRight = record.fof?.filter(Boolean).length ?? 0;

  return (
    <div class="grid-12 daily-grid">
      <Panel class="daily-main" aria-labelledby="daily-main-h">
        <div class="card-band px-sunrise" aria-hidden="true" />
        <div class="stack">
          <p class="panel-title">{t('daily.kicker', { date: manilaDayLabel() })}</p>
          <h2 id="daily-main-h">{t('daily.title')}</h2>
          <p>{t('daily.intro')}</p>

          <ol class="daily-steps">
            <li class="daily-step">
              <div class="daily-step__head">
                <h3>{t('daily.step1')}</h3>
                <StatusChip done={!!record.game} />
              </div>
              <p class="card-title">{game.name}</p>
              <p class="px-text-muted">{game.topic}</p>
              {record.game ? (
                <>
                  <p class="daily-step__result">{t('daily.gameDone', { score: record.game.score.toLocaleString('en-US') })}</p>
                  <div class="daily-actions">
                    <Button variant="secondary" href={gameHref}>
                      <Icon name="play" />
                      {t('daily.again')}
                    </Button>
                  </div>
                  <p class="px-text-muted">{t('daily.againNote')}</p>
                </>
              ) : game.playable ? (
                <>
                  {locked && <p class="px-text-muted">{t('daily.trialNote', { n: moduleN })}</p>}
                  <div class="daily-actions">
                    <Button variant="gold" large href={gameHref}>
                      <Icon name="play" />
                      {locked ? t('daily.trial') : t('daily.play')}
                    </Button>
                  </div>
                </>
              ) : (
                <p class="px-text-muted">{t('daily.gameSoon')}</p>
              )}
            </li>

            <li class="daily-step">
              <div class="daily-step__head">
                <h3>{t('daily.step2')}</h3>
                <StatusChip done={!!record.fof} />
              </div>
              {record.fof ? (
                <>
                  <p class="daily-step__result">{t('daily.itemsDone', { n: fofRight })}</p>
                  <p class="px-text-muted">{t('daily.itemsOnce')}</p>
                </>
              ) : playing ? (
                <FofRound
                  items={items}
                  mode="free"
                  compact
                  finishLabel={t('daily.itemsFinish')}
                  onFinish={(answers) => {
                    recordDailyFof(answers.map((a) => a.correct));
                    setPlaying(false);
                  }}
                />
              ) : (
                <>
                  <p>{t('daily.itemsText')}</p>
                  <div class="daily-actions">
                    <Button variant="gold" large onClick={() => setPlaying(true)} disabled={items.length !== DAILY_ITEM_COUNT}>
                      <Icon name="play" />
                      {t('daily.itemsStart')}
                    </Button>
                  </div>
                </>
              )}
            </li>
          </ol>
        </div>
      </Panel>

      <div class="daily-side">
        <ResultPanel text={shareText(record, activeStreak(streak.value, date))} complete={complete} stepsDone={stepsDone} />
        <StreakPanel date={date} />
      </div>
    </div>
  );
}
