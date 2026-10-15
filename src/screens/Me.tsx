import { useState } from 'preact/hooks';
import { t, type StringKey } from '../app/i18n';
import { SETTING_KEYS, setSetting, settings, type SettingKey } from '../app/settings';
import { profile, streak, xp } from '../app/state';
import { resetAll, storage } from '../app/store';
import { hrefFor } from '../app/router';
import { Button, Dialog, Panel, SwitchRow, pushToast } from '../ui/kit';

export function Me() {
  const [confirming, setConfirming] = useState(false);

  const doReset = () => {
    resetAll();
    setConfirming(false);
    pushToast({ kind: 'success', title: t('me.resetDone'), text: t('me.resetDoneText') });
  };

  return (
    <div class="grid-12">
      <Panel class="span-4" aria-labelledby="profile-h">
        <div class="stack">
          <h3 class="panel-title" id="profile-h">
            {profile.value.nickname}
          </h3>
          <p>{t('me.intro')}</p>
          <dl class="stat-list">
            <div>
              <dt>{t('hud.xp')}</dt>
              <dd>{xp.value}</dd>
            </div>
            <div>
              <dt>{t('home.streak')}</dt>
              <dd>{streak.value.current}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel class="span-8" aria-labelledby="a11y-h">
        <div class="stack">
          {!storage.isPersistent() && (
            <p class="store-warning px-box" role="note">
              {t('me.storageBlocked')}
            </p>
          )}
          <h2 id="a11y-h">{t('me.settings')}</h2>
          <p class="px-text-muted">{t('me.settingsHint')}</p>
          <div>
            {SETTING_KEYS.map((key) => (
              <SwitchRow
                key={key}
                label={t(`setting.${key}` as StringKey)}
                hint={t(`setting.${key}.hint` as StringKey)}
                srHint={key === 'srHints' ? t('setting.srExtra') : undefined}
                checked={settings.value[key as SettingKey]}
                onChange={(next) => setSetting(key, next)}
              />
            ))}
          </div>
          <div class="stack">
            <Button href={hrefFor('/report', { screen: 'me' })} variant="secondary">
              {t('report.open')}
            </Button>
            <Button href={hrefFor('/about')} variant="secondary">
              {t('title.about')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              {t('me.reset')}
            </Button>
          </div>
        </div>
      </Panel>

      <Dialog
        open={confirming}
        title={t('me.resetTitle')}
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t('me.resetCancel')}
            </Button>
            <Button variant="fake" onClick={doReset}>
              {t('me.resetConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('me.resetText')}</p>
      </Dialog>
    </div>
  );
}
