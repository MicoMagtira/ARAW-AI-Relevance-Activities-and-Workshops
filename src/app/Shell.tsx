import type { ComponentType } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Button, Chip, SrHint, ToastHost, srDescribedBy } from '../ui/kit';
import { t } from './i18n';
import { hrefFor, location$, matchRoute } from './router';
import { TABS, type RouteName } from './routes';
import { displayName, profile, streak, xp } from './state';
import { Home } from '../screens/Home';
import { Learn } from '../screens/Learn';
import { Lesson } from '../screens/Lesson';
import { LazyFactOrFake } from '../games/fact-or-fake/LazyFactOrFake';
import { Arcade } from '../screens/Arcade';
import { Library } from '../screens/Library';
import { Me } from '../screens/Me';
import { Report } from '../screens/Report';
import { About } from '../screens/About';
import { NotFound } from '../screens/NotFound';

const SCREENS: Record<Exclude<RouteName, 'lesson' | 'fof' | 'assess'>, ComponentType> = {
  home: Home,
  learn: Learn,
  arcade: Arcade,
  library: Library,
  me: Me,
  report: Report,
  about: About,
  notFound: NotFound,
};

export function Shell() {
  const match = matchRoute(location$.value);
  const lessonId = match.def.name === 'lesson' ? match.params.id : undefined;
  const focusName = match.def.name;
  const title = t(match.def.titleKey);
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
  }, [match.def.name, match.location.path]);

  // Focus mode: the module runner and Fact or Fake replace the sidebar, banner and tab bar with its own top bar.
  if (lessonId !== undefined || focusName === 'fof' || focusName === 'assess') {
    return (
      <div class="shell shell--focus">
        {lessonId !== undefined ? (
          <Lesson id={lessonId} key={lessonId} />
        ) : focusName === 'fof' ? (
          <LazyFactOrFake mode="free" seed={match.location.query.seed} key={match.location.path} />
        ) : (
          <LazyFactOrFake mode="assess" form={match.params.form} key={match.location.path} />
        )}
        <ToastHost />
      </div>
    );
  }
  const Screen = SCREENS[match.def.name as Exclude<RouteName, 'lesson' | 'fof' | 'assess'>];

  const reportHref = hrefFor('/report', { screen: match.def.name === 'report' ? undefined : match.def.name });
  const activeTab = match.def.tab;

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
        <Chip class="banner__beta brand--compact">
          {t('app.beta')}
        </Chip>
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
              {streak.value.current}
              <span class="chip-long"> {t('hud.days')}</span>
            </span>
            <span class="sr-only">{t('hud.streakLabel', { n: streak.value.current })}</span>
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
          <Chip>{t('app.beta')}</Chip>
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
            {t('app.betaNote')}
          </p>
        </div>
      </div>

      <main class="main" id="main" tabIndex={-1} ref={mainRef}>
        <div class="content screen" key={match.location.path}>
          <Screen />
        </div>
        <footer class="beta-note">{t('app.betaNote')}</footer>
      </main>

      <ToastHost />
    </div>
  );
}

function skipToContent(e: MouseEvent) {
  e.preventDefault(); // hash links would change the route
  document.getElementById('main')?.focus();
}
