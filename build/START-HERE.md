# Start the overnight build (one command)

1. Plug in the laptop, connect to stable internet, close other heavy apps.
2. Open **PowerShell** and run:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\mjmag\Desktop\ARAW\app\build\run-overnight.ps1"
```

3. Stay for the **preflight** (about 2 to 5 minutes). It installs Node.js if needed (click **Yes** on the Windows prompt),
   checks your Claude login, sets up git and keeps the PC awake (OneDrive is only closed if the project is inside it).
   When you see **"Preflight complete: you can leave now"**, leave the window open and go.

In the morning, open `build/MORNING_REPORT.md`. To continue or retry anything, run the same command again.
Options: `-BudgetUsd 150` (total cap across runs), `-Only T15` (run one task), `-AttemptMinutes 120`.
To stop early: press Ctrl+C in the window. The repo stays at the last green commit, and OneDrive restarts automatically.
