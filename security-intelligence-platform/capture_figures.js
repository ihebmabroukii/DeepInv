// Capture Chapter 5 dashboard figures as full-page PNGs using the system Chrome.
// Run:  node capture_figures.js
const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.resolve(__dirname, "..", "chapter5_figures");

// Authenticated session injected into localStorage so RequireAuth passes and
// gated pages (audit, users) load real data. Token minted from the backend.
const SESSION = {
  id: "user-001", email: "admin@attijari.tn", username: "admin",
  role: "super_admin", region: "global", department: "security",
  full_name: "Super Admin",
  token: "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJzdWIiOiAidXNlci0wMDEiLCAiZW1haWwiOiAiYWRtaW5AYXR0aWphcmkudG4iLCAicm9sZSI6ICJzdXBlcl9hZG1pbiIsICJpYXQiOiAxNzgxOTk3NjM3LCAiZXhwIjogMTc4MjAyNjQzN30.I0kuKrR8paloXWzfQUGB4rzQ7jrNLyvrpYdkgXaWUKg",
  exp: Date.now() + 8 * 60 * 60 * 1000,
};

// route -> output filename (full-page captures)
const PAGES = [
  ["/dashboard", "dashboard_overview.png", 5000],
  ["/events", "page_security_events.png", 3500],
  ["/alerts", "page_raw_alerts.png", 3500],
  ["/ai-insights", "page_ai_insights.png", 3500],
  ["/copilot", "page_soc_copilot.png", 3000],
  ["/timeline", "page_timeline.png", 3500],
  ["/audit", "page_audit_log.png", 4000],
  ["/reports", "page_reports.png", 4000],
  ["/settings/users", "page_users.png", 3500],
  ["/admin/roles", "page_roles.png", 3500],
  ["/settings", "page_settings.png", 3000],
  ["/assets", "page_assets_trust.png", 3500],
  ["/rules", "page_rules_automation.png", 3500],
  ["/reports/inc-1781910823.479833", "ai_report_bruteforce.png", 4500],
];

// dashboard panels captured as element shots (heading text -> filename)
const PANELS = [
  ["MITRE ATT&CK", "mitre_tactics_panel.png"],
  ["UEBA — User Behavior Analytics", "ueba_panel.png"],
  ["Report Center", "report_center.png"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  // Inject auth + dark theme before any app script runs.
  await ctx.addInitScript(
    ([sess]) => {
      localStorage.setItem("attijari_cyberguard_session", JSON.stringify(sess));
      localStorage.setItem("deepinv-theme", "dark");
    },
    [SESSION]
  );

  const page = await ctx.newPage();
  const done = [];

  for (const [route, file, wait] of PAGES) {
    try {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(wait);
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      done.push(file);
      console.log("OK   " + file + "  <- " + route);

      if (route === "/dashboard") {
        for (const [heading, pfile] of PANELS) {
          try {
            const card = page
              .locator(`xpath=//*[contains(normalize-space(text()),"${heading}")]/ancestor::div[contains(@class,"rounded")][1]`)
              .first();
            await card.scrollIntoViewIfNeeded();
            await sleep(800);
            await card.screenshot({ path: path.join(OUT, pfile) });
            done.push(pfile);
            console.log("OK   " + pfile + "  <- dashboard panel '" + heading + "'");
          } catch (e) {
            console.log("FAIL " + pfile + "  (" + e.message.split("\n")[0] + ")");
          }
        }
      }
    } catch (e) {
      console.log("FAIL " + file + "  (" + e.message.split("\n")[0] + ")");
    }
  }

  await browser.close();
  console.log("\nCaptured " + done.length + " figures into " + OUT);
})();
