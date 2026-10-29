# Weather Station

Live weather (Open-Meteo), saved report history and a weather knowledge base.

## Run in VS Code
1. Install Node.js 18+ from https://nodejs.org
2. Open this folder in VS Code (File → Open Folder)
3. Terminal → New Terminal, then:
   ```
   npm install
   npm start
   ```
4. Open http://localhost:3000

## Deploy on Render (gets a public onrender.com link)
1. Create a GitHub repo and push this folder.
2. On https://render.com → New → Web Service → connect the repo.
3. Build command: `npm install`   Start command: `npm start`   Plan: Free
4. After deploy, open the `https://<name>.onrender.com` link and share it.

Note: on the free plan the saved reports file resets whenever the service restarts.
