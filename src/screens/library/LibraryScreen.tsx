// Library: segmented tabs for Myths, Diksyunaryo, Komiks and the how-to Videos, each one a route (`#/library/<tab>`).
import { useEffect, useRef } from 'preact/hooks';
import { t, type StringKey } from '../../app/i18n';
import { LIBRARY_TABS, parseTab, type LibraryTab } from '../../app/library';
import { location$, navigate } from '../../app/router';
import { Tabs } from '../../ui/kit';
import { Glossary } from './Glossary';
import { Komiks } from './Komiks';
import { Myths } from './Myths';
import { Videos } from './Videos';

const TAB_LABEL: Record<LibraryTab, StringKey> = {
  myths: 'library.tab.myths',
  glossary: 'library.tab.glossary',
  komiks: 'library.tab.komiks',
  videos: 'library.tab.videos',
};

export function LibraryScreen() {
  const tab = parseTab(location$.value.segments[1]);
  const first = useRef(true);

  // The shell keeps this screen mounted between tabs, so a new tab starts at the top.
  useEffect(() => {
    if (first.current) first.current = false;
    else window.scrollTo?.(0, 0);
  }, [tab]);

  return (
    <div class="library">
      <Tabs
        label={t('library.tabs')}
        value={tab}
        items={LIBRARY_TABS.map((id) => ({ id, label: t(TAB_LABEL[id]) }))}
        onChange={(id) => navigate(`/library/${id}`)}
      />
      <div class="library__body" role="tabpanel" aria-label={t(TAB_LABEL[tab])}>
        {tab === 'myths' ? <Myths /> : tab === 'glossary' ? <Glossary /> : tab === 'komiks' ? <Komiks /> : <Videos />}
      </div>
    </div>
  );
}
