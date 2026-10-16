// "Hati Tayo!": the Module 6 game. Kuya Jun's first day with the AI helper: eight tasks, one at a time, each sent to the AI
// helper or to a person, with the Service meter showing how the barangay feels. No timer here (the Arcade game adds time
// pressure and many days). It always completes after the last task; stars come from how many splits were right.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { randomSeed } from '../../games/engine/rng';
import { SERVICE_MAX, buildModulePlay, judge, starsFor, type Verdict } from '../../games/hati-tayo/rules';
import type { Lane, Task } from '../../games/hati-tayo/tasks';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Meter, ProgressBar } from '../../ui/kit';
import '../../styles/hati.css';
import type { ModuleGameProps } from '../types';

interface Pick {
  lane: Lane;
  verdict: Verdict;
}

const laneName = (lane: Lane): string => (lane === 'ai' ? t('hati.lane.ai') : t('hati.lane.person'));
const verdictName = (v: Verdict): string => t(v === 'good' ? 'hati.verdict.good' : v === 'slow' ? 'hati.verdict.slow' : 'hati.verdict.fail');

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div class="hati">
      <section class="hati-intro px-box" aria-labelledby="hati-intro-title">
        <h3 class="hati-title" id="hati-intro-title" tabIndex={-1} data-hati-focus>
          {t('hati.introTitle')}
        </h3>
        <p>{t('hati.introText')}</p>
        <div>
          <Button variant="gold" large onClick={onStart}>
            {t('hati.start')}
            <Icon name="arrow-right" />
          </Button>
        </div>
        <details>
          <summary>{t('hati.how.title')}</summary>
          <ul class="hati-how">
            <li>{t('hati.how.ai')}</li>
            <li>{t('hati.how.person')}</li>
            <li>{t('hati.how.meter')}</li>
          </ul>
        </details>
      </section>
    </div>
  );
}

function Feedback({ task, pick, last, onNext }: { task: Task; pick: Pick; last: boolean; onNext: () => void }) {
  const better: Lane = task.needs;
  return (
    <section class={`hati-feedback px-box hati-feedback--${pick.verdict}`} aria-labelledby="hati-fb-title" role="status">
      <div class="hati-feedback__head">
        <Chip kind={pick.verdict === 'good' ? 'fact' : pick.verdict === 'fail' ? 'fake' : undefined}>
          <span id="hati-fb-title">{verdictName(pick.verdict)}</span>
        </Chip>
        <span>{t('hati.sentTo', { lane: laneName(pick.lane) })}</span>
      </div>
      <p>{pick.verdict === 'good' ? task.why : task.wrong}</p>
      {pick.verdict !== 'good' && <p>{t('hati.better', { lane: laneName(better), why: task.why })}</p>}
      <div>
        <Button variant="gold" onClick={onNext} data-hati-focus>
          {last ? t('hati.seeResult') : t('hati.next')}
          <Icon name="arrow-right" />
        </Button>
      </div>
    </section>
  );
}

function Result({ tasks, picks, onFinish }: { tasks: readonly Task[]; picks: readonly Pick[]; onFinish: () => void }) {
  const verdicts = picks.map((p) => p.verdict);
  const count = (v: Verdict) => verdicts.filter((x) => x === v).length;
  const stars = starsFor(verdicts);
  return (
    <div class="hati">
      <section class="hati-result px-box" aria-labelledby="hati-end-title">
        <h3 class="hati-title" id="hati-end-title" tabIndex={-1} data-hati-focus>
          {t('hati.endTitle')}
        </h3>
        <AraSays mood={stars === 3 ? 'wow' : 'happy'}>
          <p>{t(stars === 3 ? 'hati.end.great' : stars === 2 ? 'hati.end.good' : 'hati.end.some')}</p>
        </AraSays>
        <p>{t('hati.endScore', { good: count('good'), total: tasks.length, slow: count('slow'), fail: count('fail') })}</p>
        <h4>{t('hati.end.tasks')}</h4>
        <ul class="hati-results">
          {tasks.map((task, i) => {
            const pick = picks[i] as Pick;
            return (
              <li key={task.id} class="hati-results__item px-box">
                <strong>{t('hati.end.task', { task: task.text, result: verdictName(pick.verdict) })}</strong>
                <span class="px-text-muted">{pick.verdict === 'good' ? task.why : task.wrong}</span>
              </li>
            );
          })}
        </ul>
        <p>{t('hati.end.lesson')}</p>
        <div>
          <Button variant="gold" large onClick={onFinish}>
            {t('hati.finish')}
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function HatiTayo({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the task mix repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  const tasks = useMemo(() => buildModulePlay(seed), [seed]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [service, setService] = useState(SERVICE_MAX);
  const [finished, setFinished] = useState(false);
  const later = useLater();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Moving between screens puts focus on the new heading; a pick puts it on the Next button.
  const focusKey = `${started}:${finished}:${index}:${picked ? 'fb' : 'ask'}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>('[data-hati-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  if (!started) return <Intro onStart={() => setStarted(true)} />;
  if (finished) return <Result tasks={tasks} picks={picks} onFinish={() => onComplete(starsFor(picks.map((p) => p.verdict)))} />;

  const task = tasks[index] as Task;
  const last = index + 1 >= tasks.length;

  const choose = (lane: Lane) => {
    if (picked) return;
    const result = judge(task, lane, 0.5);
    sfx(lane === 'ai' ? 'toAI' : 'toPerson');
    later(300, () => sfx(result.verdict === 'good' ? 'correct' : result.verdict === 'slow' ? 'hint' : 'wrong'));
    setPicked({ lane, verdict: result.verdict });
    setService(Math.min(SERVICE_MAX, Math.max(0, service + result.service)));
  };

  const next = () => {
    if (!picked) return;
    setPicks([...picks, picked]);
    setPicked(null);
    if (last) setFinished(true);
    else setIndex(index + 1);
  };

  return (
    <div class="hati" ref={rootRef}>
      <div class="hati-hud">
        <ProgressBar value={index + (picked ? 1 : 0)} max={tasks.length} text={t('hati.task', { n: index + 1, total: tasks.length })} label={t('hati.progress')} />
        <Meter value={service} label={t('hati.service')} />
      </div>
      <div class="hati-round" key={task.id}>
        <section class="hati-task px-box" aria-labelledby="hati-task-label">
          <h4 class="hati-task__label" id="hati-task-label">
            {t('hati.task', { n: index + 1, total: tasks.length })}
          </h4>
          <p class="hati-task__text">{task.text}</p>
        </section>
        {picked ? (
          <Feedback task={task} pick={picked} last={last} onNext={next} />
        ) : (
          <section class="hati-ask" aria-labelledby="hati-ask-title">
            <h4 class="hati-ask__title" id="hati-ask-title">
              {t('hati.where')}
            </h4>
            <div class="hati-lanes">
              <Button variant="secondary" class="hati-lane" data-sfx="none" onClick={() => choose('ai')}>
                <Icon name="ai-scan" size={24} />
                {t('hati.ai')}
                <span class="hati-lane__hint">{t('hati.aiHint')}</span>
              </Button>
              <Button variant="secondary" class="hati-lane" data-sfx="none" onClick={() => choose('human')}>
                <Icon name="me" size={24} />
                {t('hati.person')}
                <span class="hati-lane__hint">{t('hati.personHint')}</span>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
