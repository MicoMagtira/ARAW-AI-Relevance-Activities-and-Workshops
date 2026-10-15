import { useState } from 'preact/hooks';
import { t, type StringKey } from '../app/i18n';
import { badgesEarned, modulesDone } from '../app/progress';
import { hrefFor } from '../app/router';
import { SETTING_KEYS, setSetting, settings, type SettingKey } from '../app/settings';
import { NICKNAME_MAX, profile, setAvatar, setNickname, streak, xp, DEFAULT_NICKNAME } from '../app/state';
import { resetAll, storage } from '../app/store';
import { BADGES, BADGE_TOTAL } from '../content/badges';
import { MODULE_COUNT } from '../content/modules';
import { Avatar } from '../ui/Avatar';
import { AVATARS, safeAvatarIndex } from '../ui/avatars';
import { Medal } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Button, Dialog, Panel, SrHint, SwitchRow, pushToast, srDescribedBy } from '../ui/kit';

function ProfilePanel() {
  const current = safeAvatarIndex(profile.value.avatar);
  const label = AVATARS[current]?.label ?? '';
  return (
    <Panel class="me-profile" aria-labelledby="profile-h">
      <div class="stack">
        <h2 class="panel-title" id="profile-h">
          {t('me.profile')}
        </h2>
        <div class="me-id">
          <span class="me-id__tile">
            <Avatar index={current} size={64} label={t('me.avatarCurrent', { label })} />
          </span>
          <div class="field me-id__field">
            <label class="px-label" for="nickname">
              {t('me.nickname')}
            </label>
            <input
              id="nickname"
              class="px-input"
              type="text"
              maxLength={NICKNAME_MAX}
              autoComplete="off"
              spellcheck={false}
              aria-describedby="nickname-hint"
              value={profile.value.nickname}
              onInput={(e) => setNickname((e.target as HTMLInputElement).value)}
              onBlur={() => setNickname(profile.value.nickname.trim() || DEFAULT_NICKNAME)}
            />
          </div>
        </div>
        <p class="px-text-muted" id="nickname-hint">
          {t('me.nicknameHint')}
        </p>

        <div class="stack" role="group" aria-labelledby="avatar-h">
          <p class="px-label" id="avatar-h">
            {t('me.avatar')}
          </p>
          <SrHint id="sr-avatar">{t('sr.avatar')}</SrHint>
          <div class="avatar-grid">
            {AVATARS.map((a, i) => (
              <button
                key={a.id}
                type="button"
                class="avatar-pick"
                aria-label={a.label}
                aria-pressed={i === current}
                aria-describedby={srDescribedBy('sr-avatar')}
                onClick={() => setAvatar(i)}
              >
                <Avatar index={i} size={48} />
                {i === current && (
                  <span class="avatar-pick__check" aria-hidden="true">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Stats />
      </div>
    </Panel>
  );
}

function Stats() {
  const rows: Array<[string, string]> = [
    [t('me.statXp'), String(xp.value)],
    [t('me.statStreak'), String(streak.value.current)],
    [t('me.statBest'), String(streak.value.best)],
    [t('me.statModules'), `${modulesDone.value.length} / ${MODULE_COUNT}`],
    [t('me.statBadges'), `${badgesEarned.value.length} / ${BADGE_TOTAL}`],
    [t('me.statRadar'), t('me.statRadarNone')],
  ];
  return (
    <div class="stack">
      <h3 class="panel-title">{t('me.stats')}</h3>
      <dl class="stat-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CabinetPanel() {
  const earned = badgesEarned.value;
  const [picked, setPicked] = useState(BADGES[0]?.id ?? '');
  const badge = BADGES.find((b) => b.id === picked) ?? BADGES[0];
  const has = badge ? earned.includes(badge.id) : false;
  return (
    <Panel class="me-cabinet" aria-labelledby="cabinet-h">
      <div class="stack">
        <h2 class="panel-title" id="cabinet-h">
          {t('me.cabinet')}
        </h2>
        <p class="px-text-muted">{t('me.cabinetHint')}</p>
        <div class="badge-grid">
          {BADGES.map((b) => {
            const got = earned.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                class="badge-pick"
                aria-pressed={b.id === picked}
                onClick={() => setPicked(b.id)}
              >
                <Medal earned={got} size={56} />
                <span class="badge-pick__name">{b.name}</span>
                <span class="sr-only">{got ? t('me.badgeEarned') : t('me.badgeLocked')}</span>
              </button>
            );
          })}
        </div>
        {badge && (
          <div class="badge-info px-box" aria-live="polite">
            <p class="badge-info__name">
              {badge.name} <span class="px-text-muted">({badge.english})</span>
            </p>
            <p>{has ? t('me.badgeEarned') : `${t('me.badgeLocked')}: ${badge.howTo}`}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function SettingsPanel({ onReset }: { onReset: () => void }) {
  return (
    <Panel class="me-settings" aria-labelledby="a11y-h">
      <div class="stack">
        {!storage.isPersistent() && (
          <p class="store-warning px-box" role="note">
            {t('me.storageBlocked')}
          </p>
        )}
        <h2 class="panel-title" id="a11y-h">
          {t('me.settings')}
        </h2>
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
        <h2 class="panel-title">{t('me.more')}</h2>
        <ul class="menu-list">
          <li class="menu-row">
            <span class="menu-row__label">{t('me.language')}</span>
            <span class="menu-row__value">{t('me.languageValue')}</span>
          </li>
          <li>
            <a class="menu-row" href={hrefFor('/report', { screen: 'me' })}>
              <span class="menu-row__label">{t('report.open')}</span>
              <Icon name="chevron-right" />
            </a>
          </li>
          <li>
            <a class="menu-row" href={hrefFor('/about')}>
              <span class="menu-row__label">{t('me.about')}</span>
              <span class="menu-row__value">{t('me.aboutValue')}</span>
              <Icon name="chevron-right" />
            </a>
          </li>
        </ul>
        <div>
          <Button variant="secondary" onClick={onReset}>
            {t('me.reset')}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function Me() {
  const [confirming, setConfirming] = useState(false);

  const doReset = () => {
    resetAll();
    setConfirming(false);
    pushToast({ kind: 'success', title: t('me.resetDone'), text: t('me.resetDoneText') });
  };

  return (
    <div class="grid-12 me-grid">
      <ProfilePanel />
      <CabinetPanel />
      <SettingsPanel onReset={() => setConfirming(true)} />

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
