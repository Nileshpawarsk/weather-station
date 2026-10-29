const $ = (id) => document.getElementById(id);
const ICONS = { clear:["☀️","🌙"], cloudy:["⛅","☁️"], fog:["🌫️","🌫️"], rain:["🌧️","🌧️"], snow:["❄️","❄️"], storm:["⛈️","⛈️"] };
const icon = (mood, isDay) => (ICONS[mood] || ICONS.cloudy)[isDay ? 0 : 1];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

async function api(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// ---- current weather ----
$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = $("cityInput").value.trim();
  if (!city) return;
  $("current").innerHTML = '<p class="empty">Checking the sky over ' + esc(city) + '…</p>';
  try {
    const w = await api("/api/weather?city=" + encodeURIComponent(city));
    document.body.dataset.sky = w.mood + (w.isDay ? "-day" : "-night");
    $("current").innerHTML = `
      <p class="place">${esc(w.city)}${w.country ? ", " + esc(w.country) : ""}</p>
      <div class="hero">
        <div class="big-temp">${Math.round(w.temperature)}<small>°C</small></div>
        <p class="cond"><span>${icon(w.mood, w.isDay)}</span>${esc(w.condition)}</p>
      </div>
      <div class="facts">
        <div class="fact"><b>${Math.round(w.feelsLike)}°C</b><span>Feels like</span></div>
        <div class="fact"><b>${w.humidity}%</b><span>Humidity</span></div>
        <div class="fact"><b>${w.windSpeed} km/h</b><span>Wind</span></div>
        <div class="fact"><b>${w.pressure} hPa</b><span>Pressure</span></div>
        <div class="fact"><b>${Math.round(w.low)}° / ${Math.round(w.high)}°</b><span>Low / High today</span></div>
      </div>`;
    loadReports();
  } catch (err) {
    $("current").innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
});

// ---- report history ----
async function loadReports() {
  const city = $("filterCity").value.trim();
  const limit = $("limit").value;
  try {
    const rows = await api(`/api/reports?limit=${limit}&city=${encodeURIComponent(city)}`);
    $("count").textContent = rows.length ? `${rows.length} report${rows.length > 1 ? "s" : ""} found.` : "";
    $("reports").innerHTML = rows.length
      ? rows.map((r) => `
        <tr>
          <td class="city">${esc(r.city)} <small>${esc(r.country)}</small></td>
          <td class="t">${r.temperature} °C</td>
          <td>${r.humidity}%</td>
          <td>${r.windSpeed} km/h</td>
          <td>${icon(r.mood, r.isDay)} ${esc(r.condition)}</td>
          <td class="when">${new Date(r.savedAt).toLocaleString()}</td>
        </tr>`).join("")
      : '<tr><td colspan="6" class="rowempty">No reports yet. Check a city above to save your first one.</td></tr>';
  } catch (err) {
    $("reports").innerHTML = `<tr><td colspan="6" class="rowempty">${esc(err.message)}</td></tr>`;
  }
}
$("filterForm").addEventListener("submit", (e) => { e.preventDefault(); loadReports(); });
$("clearBtn").addEventListener("click", async () => {
  if (!confirm("Delete all saved reports?")) return;
  await api("/api/reports", { method: "DELETE" });
  loadReports();
});

// ---- knowledge base ----
async function loadArticles(q = "") {
  const list = await api("/api/articles?q=" + encodeURIComponent(q));
  $("articles").innerHTML = list.length
    ? list.map((a) => `
      <article>
        <h3>${esc(a.title)}</h3>
        <p class="cat">${esc(a.category)}</p>
        <p>${esc(a.body)}</p>
        <p class="tags">${a.tags.map((t) => "#" + esc(t)).join(" ")}</p>
        <a href="${esc(a.source)}" target="_blank" rel="noopener">Read the source</a>
      </article>`).join("")
    : '<p class="muted">No articles match that search. Try "rain" or "safety".</p>';
}
$("kbForm").addEventListener("submit", (e) => { e.preventDefault(); loadArticles($("kbSearch").value.trim()); });
$("kbAll").addEventListener("click", () => { $("kbSearch").value = ""; loadArticles(); });

loadReports();
loadArticles();
