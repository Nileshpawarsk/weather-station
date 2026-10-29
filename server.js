const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------
const WEATHER_CODES = {
  0: ["Clear sky", "clear"], 1: ["Mainly clear", "clear"], 2: ["Partly cloudy", "cloudy"],
  3: ["Overcast", "cloudy"], 45: ["Fog", "fog"], 48: ["Rime fog", "fog"],
  51: ["Light drizzle", "rain"], 53: ["Drizzle", "rain"], 55: ["Dense drizzle", "rain"],
  61: ["Light rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy rain", "rain"],
  71: ["Light snow", "snow"], 73: ["Snow", "snow"], 75: ["Heavy snow", "snow"],
  80: ["Rain showers", "rain"], 81: ["Rain showers", "rain"], 82: ["Violent showers", "rain"],
  95: ["Thunderstorm", "storm"], 96: ["Thunderstorm, hail", "storm"], 99: ["Severe thunderstorm", "storm"]
};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) { console.error("write failed", e.message); }
}

// ---------- API ----------
app.get("/api/weather", async (req, res) => {
  const city = String(req.query.city || "").trim();
  if (!city) return res.status(400).json({ error: "Enter a city name." });
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geo = await geoRes.json();
    if (!geo.results || !geo.results.length)
      return res.status(404).json({ error: `Couldn't find "${city}". Check the spelling and try again.` });
    const place = geo.results[0];

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,pressure_msl` +
      `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
    const w = await (await fetch(url)).json();
    const c = w.current;
    const [condition, mood] = WEATHER_CODES[c.weather_code] || ["Unknown", "cloudy"];

    const report = {
      id: Date.now(),
      city: place.name,
      country: place.country || "",
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      pressure: Math.round(c.pressure_msl),
      high: w.daily.temperature_2m_max[0],
      low: w.daily.temperature_2m_min[0],
      condition,
      mood,
      isDay: c.is_day === 1,
      savedAt: new Date().toISOString()
    };

    const reports = readJSON(REPORTS_FILE, []);
    reports.unshift(report);
    writeJSON(REPORTS_FILE, reports.slice(0, 500));
    res.json(report);
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "Weather service is not reachable right now. Try again in a moment." });
  }
});

app.get("/api/reports", (req, res) => {
  const city = String(req.query.city || "").trim().toLowerCase();
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  let reports = readJSON(REPORTS_FILE, []);
  if (city) reports = reports.filter((r) => r.city.toLowerCase().includes(city));
  res.json(reports.slice(0, limit));
});

app.delete("/api/reports", (req, res) => {
  writeJSON(REPORTS_FILE, []);
  res.json({ ok: true });
});

app.get("/api/articles", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  let articles = readJSON(ARTICLES_FILE, []);
  if (q)
    articles = articles.filter((a) =>
      [a.title, a.category, a.body, ...(a.tags || [])].join(" ").toLowerCase().includes(q)
    );
  res.json(articles);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: Math.round(process.uptime()), time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Weather Station running → http://localhost:${PORT}`));
