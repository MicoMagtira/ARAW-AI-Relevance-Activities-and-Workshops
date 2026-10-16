/**
 * ARAW report relay (Google Apps Script web app).
 *
 * The ARAW web app POSTs a small JSON report here (sent as text/plain so the browser skips the CORS preflight).
 * This script checks it, emails it to the ARAW team and logs it in the "ARAW Reports" Google Sheet.
 * Deploy steps: tools/report-relay/README.md. This file is public: never put passwords, keys or tokens in it.
 */

var TO_EMAIL = 'AIKasalig@gmail.com';
var SHEET_NAME = 'ARAW Reports';
var SHEET_ID_KEY = 'SHEET_ID';

/** Must match REPORT_CATEGORIES in src/app/report.ts. */
var CATEGORIES = {
  bug: 'Something broke',
  content: 'Wrong or unsafe info',
  suggestion: 'Suggestion',
  other: 'Other',
};

/** Longest value accepted for each field (the app trims to these already). */
var LIMITS = { screen: 60, item: 60, details: 1500, device: 60, version: 60 };
var MAX_BODY = 8000;

/** Overall limits for everyone together. A free Gmail account can send about 100 emails a day from Apps Script. */
var PER_MINUTE = 5;
var PER_DAY = 90;
var TIME_ZONE = 'Asia/Manila';

/** Health check: open the /exec URL in a browser and you should see {"ok":true,"service":"araw-report-relay"}. */
function doGet() {
  return json_({ ok: true, service: 'araw-report-relay' });
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > MAX_BODY) return json_({ ok: false, error: 'bad_request' });

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return json_({ ok: false, error: 'bad_json' });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json_({ ok: false, error: 'bad_request' });

    // Honeypot: the app hides the "website" field from people, so only bots fill it in.
    if (data.website !== undefined && String(data.website).trim() !== '') return json_({ ok: false, error: 'rejected' });

    var report = validate_(data);
    if (report.error) return json_({ ok: false, error: report.error });

    var limit = takeSlot_();
    if (limit) return json_({ ok: false, error: limit });

    logRow_(report);

    try {
      MailApp.sendEmail({
        to: TO_EMAIL,
        subject: '[ARAW report] ' + CATEGORIES[report.category] + ' - ' + report.screen,
        body: emailBody_(report),
        name: 'ARAW report relay',
      });
    } catch (err) {
      console.error('sendEmail failed: ' + err);
      return json_({ ok: false, error: 'mail_failed' });
    }
    return json_({ ok: true });
  } catch (err) {
    console.error('doPost failed: ' + err);
    return json_({ ok: false, error: 'server_error' });
  }
}

/** Run ONCE from the editor (select "setup", press Run, approve the permissions). Creates the log sheet. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SHEET_ID_KEY);
  if (id) {
    try {
      var existing = SpreadsheetApp.openById(id);
      console.log('Already set up. Log sheet: ' + existing.getUrl());
      return;
    } catch (err) {
      console.log('Saved sheet not found, making a new one.');
    }
  }
  var ss = SpreadsheetApp.create(SHEET_NAME);
  var sheet = ss.getSheets()[0];
  sheet.setName('Reports');
  sheet.appendRow(['Received', 'Category', 'Screen', 'Item', 'Details', 'Device', 'App version']);
  sheet.setFrozenRows(1);
  props.setProperty(SHEET_ID_KEY, ss.getId());
  console.log('Done. Log sheet: ' + ss.getUrl() + ' . Emails left today: ' + MailApp.getRemainingDailyQuota());
}

/** Optional: run from the editor to send yourself one test report (skips the web app and the rate limit). */
function sendTestReport() {
  var report = { category: 'other', screen: 'test', item: '', details: 'Test report from the Apps Script editor.', device: 'editor', version: 'test' };
  logRow_(report);
  MailApp.sendEmail({ to: TO_EMAIL, subject: '[ARAW report] Test - editor', body: emailBody_(report), name: 'ARAW report relay' });
  console.log('Test email sent to ' + TO_EMAIL);
}

/* ---------- helpers ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Text field: must be a string (or missing when optional), control characters become spaces, length is capped. */
function text_(value, max, keepNewlines) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  var cleaned = keepNewlines ? value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ') : value.replace(/[\u0000-\u001f\u007f]+/g, ' ');
  cleaned = cleaned.trim();
  return cleaned.length > max ? null : cleaned;
}

function validate_(data) {
  if (typeof data.category !== 'string' || !Object.prototype.hasOwnProperty.call(CATEGORIES, data.category)) return { error: 'invalid_category' };
  var report = { category: data.category };
  var fields = ['screen', 'item', 'details', 'device', 'version'];
  for (var i = 0; i < fields.length; i++) {
    var name = fields[i];
    var value = text_(data[name], LIMITS[name], name === 'details');
    if (value === null) return { error: 'invalid_' + name };
    report[name] = value;
  }
  if (!report.screen) return { error: 'invalid_screen' };
  return report;
}

/** Returns '' when the report may go out, or an error code. Counts are shared by everyone using the app. */
function takeSlot_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'busy';
  try {
    var cache = CacheService.getScriptCache();
    var minuteKey = 'min_' + Math.floor(Date.now() / 60000);
    var perMinute = Number(cache.get(minuteKey) || 0);
    if (perMinute >= PER_MINUTE) return 'rate_limited';

    // The day count lives in Script Properties because the cache forgets after at most 6 hours.
    var props = PropertiesService.getScriptProperties();
    var today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    var day = { d: today, n: 0 };
    try {
      var saved = JSON.parse(props.getProperty('DAY_COUNT') || '{}');
      if (saved.d === today) day.n = Number(saved.n) || 0;
    } catch (err) {
      // bad value: start the day again
    }
    if (day.n >= PER_DAY || MailApp.getRemainingDailyQuota() < 1) return 'daily_limit';

    cache.put(minuteKey, String(perMinute + 1), 120);
    day.n += 1;
    props.setProperty('DAY_COUNT', JSON.stringify(day));
    return '';
  } finally {
    lock.releaseLock();
  }
}

/** Sheets treats text starting with = + - @ as a formula; a leading apostrophe keeps it plain text. */
function cell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function logRow_(report) {
  var id = PropertiesService.getScriptProperties().getProperty(SHEET_ID_KEY);
  if (!id) {
    console.warn('No log sheet yet: run setup() once.');
    return;
  }
  try {
    SpreadsheetApp.openById(id)
      .getSheets()[0]
      .appendRow([new Date(), CATEGORIES[report.category], cell_(report.screen), cell_(report.item), cell_(report.details), cell_(report.device), cell_(report.version)]);
  } catch (err) {
    // A logging problem must not stop the email.
    console.error('Sheet append failed: ' + err);
  }
}

function emailBody_(report) {
  return [
    'A player sent a report from the ARAW app.',
    '',
    'Category: ' + CATEGORIES[report.category],
    'Screen: ' + report.screen,
    'Item: ' + (report.item || 'none'),
    'App: ARAW ' + (report.version || 'unknown'),
    'Device: ' + (report.device || 'unknown'),
    '',
    'What happened:',
    report.details || '(no details given)',
    '',
    '--',
    'Sent by the ARAW report relay (Google Apps Script). The player did not give an email address, so there is no one to reply to.',
  ].join('\n');
}
