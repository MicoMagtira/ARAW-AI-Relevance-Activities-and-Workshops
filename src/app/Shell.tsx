import type { ComponentType } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Button, Chip, SrHint, ToastHost, pushToast, srDescribedBy } from '../ui/kit';
import { t } from './i18n';
import { hrefFor, location$, matchRoute } from './router';
import { TABS, type RouteName } from './routes';
import { BADGES } from '../content/badges';
import { manilaDate } from './daily';
import { streakNotice } from './progress';
import { displayName, profile, streak, xp } from './state';
import { activeStreak } from './streak';
import { sfx } from './sound';
import { Home } from '../screens/Home';
import { Learn } from '../screens/Learn';
import { Lesson } from '../screens/Lesson';
import { LazyFactOrFake } from '../games/fact-or-fake/LazyFactOrFake';
import { LazyGame } from '../games/LazyGame';
import { Arcade } from '../screens/Arcade';
import { Library } from '../screens/Library';
import { Daily } from '../screens/Daily';
import { Certificate } from '../screens/Certificate';
import { Me } from '../screens/Me';
import { Report } from '../screens/Report';
import { About } from '../screens/About';
import { GuideRoute } from '../screens/GuideRoute';
import { NotFound } from '../screens/NotFound';

const SCREENS: Record<Exclude<RouteName, 'lesson' | 'fof' | 'assess' | 'game' | 'certificate'>, ComponentType> = {
  home: Home,
  learn: Learn,
  arcade: Arcade,
  library: Library,
  daily: Daily,
  me: Me,
  report: Report,
  about: About,
  guide: GuideRoute,
  notFound: NotFound,
};

/**
 * Tell the player about a streak freeze, a fresh start or a new streak badge (set by recordActivity). A streak that grows
 * rings the streak sound where its twin is on screen: the HUD flame (not in focus mode) or a streak badge toast.
 */
function useStreakToasts(hudShown: boolean) {
  const notice = streakNotice.value;
  useEffect(() => {
    if (!notice) return;
    streakNotice.value = null;
    if (notice.badges.length > 0 || (notice.event === 'next' && hudShown)) sfx('streak');
    if (notice.event === 'freeze') pushToast({ kind: 'success', title: t('streak.freeze.title'), text: t('streak.freeze.text', { n: notice.current }) });
    else if (notice.event === 'restart') pushToast({ kind: 'success', title: t('streak.restart.title'), text: t('streak.restart.text') });
    for (const id of notice.badges) {
      const badge = BADGES.find((b) => b.id === id);
      if (badge) pushToast({ kind: 'badge', title: t('streak.badge.title', { name: badge.name }) }, { quiet: true });
    }
  }, [notice]);
}

const FOCUS: ReadonlySet<RouteName> = new Set<RouteName>(['lesson', 'fof', 'assess', 'game', 'certificate']);

export function Shell() {
  const match = matchRoute(location$.value);
  useStreakToasts(!FOCUS.has(match.def.name));
  const lessonId = match.def.name === 'lesson' ? match.params.id : undefined;
  const focusName = match.def.name;
  const title = t(match.def.titleKey);
  // The Library's tabs and episodes are routes too, but moving between them keeps the screen (and the focus on the tab) in place.
  const screenKey = match.def.name === 'library' ? '/library' : match.location.path;
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // On navigation: update the document title, scroll to top and move focus to the content.
  useEffect(() => {
    document.title = `${title} · ${t('app.name')}`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    (mainRef.current ?? document.getElementById('main'))?.focus({ preventScroll: true });
  }, [match.def.name, screenKey]);

  // Focus mode: the module runner and Fact or Fake replace the sidebar, banner and tab bar with its own top bar.
  if (lessonId !== undefined || focusName === 'fof' || focusName === 'assess' || focusName === 'game' || focusName === 'certificate') {
    return (
      <div class="shell shell--focus">
        {lessonId !== undefined ? (
          <Lesson id={lessonId} key={lessonId} />
        ) : focusName === 'certificate' ? (
          <Certificate />
        ) : focusName === 'game' ? (
          <LazyGame slug={match.params.slug ?? ''} seed={match.location.query.seed} breakSeconds={match.location.query.break} key={match.location.path + (match.location.query.seed ?? '')} />
        ) : focusName === 'fof' ? (
          <LazyFactOrFake mode="free" seed={match.location.query.seed} key={match.location.path} />
        ) : (
          <LazyFactOrFake mode="assess" form={match.params.form} key={match.location.path} />
        )}
        <ToastHost />
      </div>
    );
  }
  const Screen = SCREENS[match.def.name as Exclude<RouteName, 'lesson' | 'fof' | 'assess' | 'game' | 'certificate'>];

  const reportHref = hrefFor('/report', { screen: match.def.name === 'report' ? undefined : match.def.name });
  const activeTab = match.def.tab;
  const shownStreak = activeStreak(streak.value, manilaDate());

  return (
    <div class="shell">
      <Button href="#main" class="skip-link" variant="gold" onClick={skipToContent}>
        {t('app.skip')}
      </Button>

      <header class="banner">
        <a class="brand brand--compact" href={hrefFor('/')} aria-label={t('app.home')}>
          <Icon name="sun" size={32} class="brand__sun" />
          <span class="brand__word">{t('app.name')}</span>
        </a>
        <h1 class="banner__title">{title}</h1>
        <svg class="banner__sun" viewBox="0 0 16 8" shape-rendering="crispEdges" aria-hidden="true">
          <path fill="currentColor" d="M5 0h6v1H5zM3 1h10v1H3zM2 2h12v1H2zM1 3h14v1H1zM0 4h16v4H0z" />
        </svg>
        <div class="banner__hud">
          <Chip kind="xp">
            <Icon name="xp-star" size={16} />
            <span aria-hidden="true">
              {xp.value}
              <span class="chip-long"> {t('hud.xp')}</span>
            </span>
            <span class="sr-only">{t('hud.xpLabel', { n: xp.value })}</span>
            <SrHint>{t('sr.xp')}</SrHint>
          </Chip>
          <Chip kind="streak">
            <Icon name="flame" size={16} />
            <span aria-hidden="true">
              {shownStreak}
              <span class="chip-long"> {t('hud.days')}</span>
            </span>
            <span class="sr-only">{t('hud.streakLabel', { n: shownStreak })}</span>
            <SrHint>{t('sr.streak')}</SrHint>
          </Chip>
          <a class="avatar-link" href={hrefFor('/me')} aria-label={t('hud.avatar')}>
            <span class="avatar-link__tile">
              <Avatar index={profile.value.avatar} size={32} />
            </span>
            <span class="avatar-link__name">{displayName()}</span>
          </a>
          <Button href={reportHref} icon variant="secondary" class="report-flag" aria-label={t('report.flag')}>
            <Icon name="flag" />
          </Button>
        </div>
      </header>

      <div class="sidebar">
        <div class="sidebar__brand">
          <a class="brand" href={hrefFor('/')} aria-label={t('app.home')}>
            <Icon name="sun" size={32} class="brand__sun" />
            <span class="brand__word">{t('app.name')}</span>
          </a>
        </div>
        <nav class="nav" aria-label={t('nav.main')}>
          <ul>
            {TABS.map((tab) => (
              <li key={tab.id}>
                <a
                  class="nav-item"
                  href={hrefFor(tab.path)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  aria-describedby={srDescribedBy(`sr-nav-${tab.id}`)}
                >
                  <span class="nav-item__icon">
                    <Icon name={tab.icon} />
                  </span>
                  <span class="nav-item__label">{t(tab.labelKey)}</span>
                  <SrHint id={`sr-nav-${tab.id}`}>{t(`sr.nav.${tab.id}`)}</SrHint>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div class="sidebar__foot">
          <Button href={reportHref} variant="secondary">
            <Icon name="flag" />
            {t('report.short')}
          </Button>
          <p class="sidebar__note">
            {t('app.credit')}
            <br />
            {t('app.createdBy')}
          </p>
        </div>
      </div>

      <main class="main" id="main" tabIndex={-1} ref={mainRef}>
        <div class="content screen" key={screenKey}>
          <Screen />
        </div>
        <footer class="credit-note">{t('app.createdBy')}</footer>
      </main>

      <ToastHost />
    </div>
  );
}

function skipToContent(e: MouseEvent) {
  e.preventDefault(); // hash links would change the route
  document.getElementById('main')?.focus();
}
