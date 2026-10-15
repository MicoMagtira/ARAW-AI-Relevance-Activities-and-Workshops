import type { StringKey } from './i18n';
import type { IconName } from '../ui/icons';

export type TabId = 'home' | 'learn' | 'arcade' | 'library' | 'me';
export type RouteName = 'home' | 'learn' | 'arcade' | 'library' | 'me' | 'lesson' | 'fof' | 'assess' | 'game' | 'report' | 'about' | 'notFound';

export interface TabDef {
  id: TabId;
  path: string;
  labelKey: StringKey;
  icon: IconName;
}

export interface RouteDef {
  name: RouteName;
  /** Static segments or `:param` segments, e.g. `/learn/:id`. */
  pattern: string;
  titleKey: StringKey;
  /** Which bottom/top/sidebar tab is highlighted. */
  tab?: TabId;
}

export const TABS: readonly TabDef[] = [
  { id: 'home', path: '/', labelKey: 'nav.home', icon: 'home' },
  { id: 'learn', path: '/learn', labelKey: 'nav.learn', icon: 'learn' },
  { id: 'arcade', path: '/arcade', labelKey: 'nav.arcade', icon: 'arcade' },
  { id: 'library', path: '/library', labelKey: 'nav.library', icon: 'library' },
  { id: 'me', path: '/me', labelKey: 'nav.me', icon: 'me' },
];

export const ROUTES: readonly RouteDef[] = [
  { name: 'home', pattern: '/', titleKey: 'title.home', tab: 'home' },
  { name: 'learn', pattern: '/learn', titleKey: 'title.learn', tab: 'learn' },
  { name: 'lesson', pattern: '/learn/:id', titleKey: 'title.lesson', tab: 'learn' },
  { name: 'fof', pattern: '/play/fact-or-fake', titleKey: 'title.fof', tab: 'arcade' },
  { name: 'assess', pattern: '/assess/:form', titleKey: 'title.assess' },
  { name: 'arcade', pattern: '/arcade', titleKey: 'title.arcade', tab: 'arcade' },
  { name: 'game', pattern: '/arcade/:slug', titleKey: 'title.game', tab: 'arcade' },
  { name: 'library', pattern: '/library', titleKey: 'title.library', tab: 'library' },
  { name: 'library', pattern: '/library/:tab', titleKey: 'title.library', tab: 'library' },
  { name: 'library', pattern: '/library/komiks/:n', titleKey: 'title.library', tab: 'library' },
  { name: 'me', pattern: '/me', titleKey: 'title.me', tab: 'me' },
  { name: 'report', pattern: '/report', titleKey: 'title.report' },
  { name: 'about', pattern: '/about', titleKey: 'title.about' },
];

export const NOT_FOUND: RouteDef = { name: 'notFound', pattern: '*', titleKey: 'title.notFound' };
