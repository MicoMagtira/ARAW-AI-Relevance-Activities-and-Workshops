// String catalog. English only for now; every user-facing string goes through t().
const en = {
  'app.name': 'ARAW',
  'app.tagline': 'AI Relevance Activities and Workshops',
  'app.beta': 'Beta',
  'app.betaNote': 'Beta: educational, not medical advice',
  'app.credit': 'An AIKasalig project · DOST-PCHRD · National University',
  'app.skip': 'Skip to content',
  'app.home': 'ARAW home',

  'nav.main': 'Main navigation',
  'nav.home': 'Home',
  'nav.learn': 'Learn',
  'nav.arcade': 'Arcade',
  'nav.library': 'Library',
  'nav.me': 'Me',

  'title.home': 'Home',
  'title.learn': 'Learn',
  'title.arcade': 'Arcade',
  'title.library': 'Library',
  'title.me': 'Me',
  'title.report': 'Report',
  'title.about': 'About',
  'title.notFound': 'Lost',

  'hud.xp': 'XP',
  'hud.xpLabel': '{n} experience points',
  'hud.days': 'DAYS',
  'hud.streakLabel': '{n} day streak',
  'hud.avatar': 'Open my profile',

  'report.open': 'Report a problem',
  'report.short': 'Report',
  'report.flag': 'Report a problem',

  'soon.kicker': 'Coming soon',
  'soon.text': 'This part of ARAW is being built. Check back soon, kaibigan!',

  'home.greeting': 'Magandang araw, {name}!',
  'home.intro': 'Welcome to ARAW. Learn how AI works, spot health misinformation, and decide when to trust.',
  'home.stats': 'Your stats',
  'home.streak': 'Streak',
  'home.badges': 'Badges',
  'home.modules': 'Modules done',
  'home.modulesText': '{done} / {total} modules',
  'home.soon': 'Your daily challenge, modules and badges will show up here.',
  'learn.intro': 'Ten short modules. Each one ends with: Kailan ako magtitiwala? (When should I trust?)',
  'arcade.intro': 'Quick pixel games to practise what you learn.',
  'library.intro': 'Myths, the Diksyunaryo and Komiks live here.',
  'me.intro': 'Your profile, badges and settings.',

  'me.settings': 'Accessibility',
  'me.settingsHint': 'All off by default. They apply across the whole app.',
  'setting.largeText': 'Larger text',
  'setting.largeText.hint': 'Makes all words bigger',
  'setting.highContrast': 'High contrast',
  'setting.highContrast.hint': 'Stronger colours for bright sun or low vision',
  'setting.xlButtons': 'Extra-large buttons',
  'setting.xlButtons.hint': 'Bigger tap areas',
  'setting.srHints': 'Screen-reader hints',
  'setting.srHints.hint': 'Extra spoken descriptions for TalkBack',
  'setting.reduceMotion': 'Reduce motion',
  'setting.reduceMotion.hint': 'Fewer bounces and no confetti',
  'setting.on': 'ON',
  'setting.off': 'OFF',
  'setting.srExtra': 'Turning this on adds extra spoken descriptions across the app.',

  'me.reset': 'Reset my progress',
  'me.resetTitle': 'Reset progress?',
  'me.resetText': 'This clears your XP, streak and settings on this device. It cannot be undone.',
  'me.resetConfirm': 'Reset',
  'me.resetCancel': 'Keep it',
  'me.resetDone': 'Progress reset',
  'me.resetDoneText': 'You are starting fresh. Bagong simula!',
  'me.storageBlocked': 'Your browser is blocking storage, so progress will not be saved after you close ARAW.',

  'dialog.close': 'Close',
  'toast.close': 'Dismiss message',

  'report.title': 'What kind of problem?',
  'report.cat.bug': 'Something broke',
  'report.cat.content': 'Wrong or unsafe info',
  'report.cat.suggestion': 'Suggestion',
  'report.cat.other': 'Other',
  'report.details': 'Details (optional)',
  'report.detailsHint': 'What happened? Please do not include personal health information.',
  'report.privacy':
    'This opens your email app with the details filled in. Nothing is sent until you press Send there. Please do not include personal health information.',
  'report.send': 'Open email',
  'report.auto': 'Added automatically',
  'report.screen': 'Screen',
  'report.item': 'Item',
  'report.app': 'App',
  'report.device': 'Device',
  'report.none': 'none',
  'report.thanks': 'Salamat for helping!',

  'about.title': 'About ARAW',
  'about.text': 'ARAW teaches AI literacy and how to resist health misinformation, with calibrated trust: not "trust less", but "trust wisely".',
  'about.licences': 'Code is MIT. Content is CC BY 4.0. Fonts are OFL. Pixel icons are MIT (pixelarticons).',

  'notFound.title': 'Hala! This page is lost.',
  'notFound.text': 'We could not find that page.',
  'notFound.home': 'Home',
} as const;

export type StringKey = keyof typeof en;

/** Look up a string, replacing {name} placeholders. Falls back to the key itself. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const raw: string = en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}
