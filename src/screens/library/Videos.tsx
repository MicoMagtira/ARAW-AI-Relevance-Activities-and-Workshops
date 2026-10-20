// Library > Videos: every how-to clip (the tour first, then the games). A card opens the shared video dialog.
import { t } from '../../app/i18n';
import { ALL_LANGUAGES } from '../../app/language';
import { hasTutorial, openTutorial, tutorialLangs } from '../../app/tutorials';
import { TUTORIALS } from '../../content/tutorials';
import { Icon } from '../../ui/Icon';
import { Panel } from '../../ui/kit';
import { tutorialLength, tutorialTitle } from '../../ui/tutorial/Tutorial';

export function Videos() {
  const clips = TUTORIALS.filter((tut) => hasTutorial(tut.id));
  return (
    <div class="stack videos">
      <Panel class="videos__intro" aria-labelledby="videos-h">
        <div class="stack">
          <h2 id="videos-h">{t('library.videos.title')}</h2>
          <p>{clips.length > 0 ? t('library.videos.text') : t('library.videos.none')}</p>
        </div>
      </Panel>
      {clips.length > 0 && (
        <ul class="video-grid" aria-labelledby="videos-h">
          {clips.map((tut) => {
            const title = tutorialTitle(tut.id);
            const length = tutorialLength(tut.id);
            const tags = ALL_LANGUAGES.filter((l) => tutorialLangs(tut.id).includes(l.code));
            return (
              <li key={tut.id}>
                <button type="button" class={`video-card px-box${tut.kind === 'tour' ? ' video-card--tour' : ''}`} onClick={() => openTutorial(tut.id)}>
                  <span class="video-card__art px-sunrise" aria-hidden="true">
                    <span class="video-card__icon">
                      <Icon name={tut.icon} size={48} />
                    </span>
                    <span class="video-card__play">
                      <Icon name="play" size={24} />
                    </span>
                  </span>
                  <span class="video-card__title">{title}</span>
                  <span class="video-card__meta">
                    {length && <span>{t('tutorial.length', { time: length })}</span>}
                    <span class="video-card__langs" aria-hidden="true">
                      {tags.map((l) => (
                        <span key={l.code}>{l.tag}</span>
                      ))}
                    </span>
                    <span class="sr-only">{tags.map((l) => l.name).join(', ')}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
