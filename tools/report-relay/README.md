# ARAW report relay (Google Apps Script)

The ARAW app is a static site, so it cannot send email by itself. This small Google Apps Script web app does it:
the app's **Send report** button posts the report here, and the script emails it to **AIKasalig@gmail.com** and adds a
row to a Google Sheet called **ARAW Reports**. It is free and runs on the AIKasalig Google account.

Without it, the app still works: the Send button is hidden and players use **Open in Gmail**, **Use my email app** or
**Copy report** instead.

## What it does and does not keep

- Each report has only what the player typed, the kind of problem, the screen and item, the app version and the device
  type (for example "Android, Chrome"). The app adds no name, email or IP address.
- Limits for everyone together: 5 reports a minute and 90 a day (a free Gmail account can send about 100 emails a day
  from Apps Script). Extra reports get a friendly "try another way" message in the app.
- A hidden "website" field catches simple spam bots.
- `Code.gs` holds no passwords or keys, so it is safe in the public repository.

## Deploy it (once, about 10 minutes)

1. Sign in to Google as **AIKasalig@gmail.com** (only that account; sign out of others or use a private window).
2. Go to <https://script.google.com> and click **New project**.
3. Click the title "Untitled project" and rename it to **ARAW report relay**.
4. Delete everything in the `Code.gs` editor, then paste the whole content of `tools/report-relay/Code.gs` from this repo.
   Click the save icon (or press Ctrl+S).
5. In the toolbar, pick **setup** in the function list and click **Run**.
   - Google asks for permission. Click **Review permissions**, pick AIKasalig@gmail.com.
   - You will see "Google hasn't verified this app". This is normal for your own script: click **Advanced**, then
     **Go to ARAW report relay (unsafe)**, then **Allow**. (It asks to send email as you and to manage the sheet it creates.)
   - The log at the bottom says "Done. Log sheet: https://docs.google.com/..." The **ARAW Reports** sheet is now in your Drive.
6. Optional check: pick **sendTestReport** and click **Run**. A test email arrives in AIKasalig@gmail.com within a minute.
7. Click **Deploy** (top right), then **New deployment**.
   - Click the gear next to "Select type" and choose **Web app**.
   - Description: `ARAW report relay v1`.
   - **Execute as: Me (AIKasalig@gmail.com)**.
   - **Who has access: Anyone**. (Players are not signed in to Google, so it must be "Anyone". They can only send a
     report; they cannot see the sheet or your mail.)
   - Click **Deploy**, then copy the **Web app URL**. It looks like
     `https://script.google.com/macros/s/AKfy..../exec` and must end in `/exec`.

## Test it

Open the `/exec` URL in a browser. You should see:

```json
{"ok":true,"service":"araw-report-relay"}
```

If you see a Google sign-in page instead, "Who has access" is not set to **Anyone**: fix it under
**Deploy > Manage deployments**.

## Put the URL in the app and rebuild

1. In the ARAW project folder, create a file named `.env.production` (copy `.env.example`) with one line:

   ```
   VITE_REPORT_ENDPOINT=https://script.google.com/macros/s/AKfy..../exec
   ```

   This URL is not a secret (anyone who opens the app can see it), so it is fine to commit `.env.production`. That is how
   the Hugging Face Space and GitHub Pages builds pick it up. For a test on your own computer only, use `.env.local`
   instead (it is not committed).
2. Rebuild: `npm run build` (or push to the Space / GitHub, which rebuilds by itself).
3. Open the app, go to **Report**, type a test message and press **Send report**. You should see "Report sent!", an
   email in AIKasalig@gmail.com and a new row in the **ARAW Reports** sheet.

## After you change Code.gs (redeploy, same URL)

1. Paste the new code into the Apps Script editor and save.
2. Click **Deploy > Manage deployments**, select the active deployment, click the pencil (**Edit**).
3. Under **Version**, choose **New version**, then click **Deploy**.

The URL stays the same, so the app needs no change. (Do **not** use "New deployment" for updates: that makes a new URL.)
If you add new kinds of Google access, run `setup` once more to approve them.

## Troubleshooting

- **App says "the report did not go through"**: open the `/exec` URL to check the health message; open
  **Executions** in the Apps Script sidebar to see errors (for example `daily_limit` when the 90 a day limit is reached).
- **No row in the sheet but the email came**: run `setup` again; it reconnects or recreates the sheet.
- **To turn sending off**: in **Deploy > Manage deployments** click **Archive**. The app then shows the fallbacks after a
  failed send. To hide the Send button too, empty `VITE_REPORT_ENDPOINT` and rebuild.
