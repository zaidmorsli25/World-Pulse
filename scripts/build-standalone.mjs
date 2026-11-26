// Builds the server-less demo (static export, in-browser game engine, demo content only).
// API route handlers can't be statically exported, so they are moved aside during the build
// and always restored afterwards.
import { execSync } from "node:child_process";
import fs from "node:fs";

const api = "src/app/api";
const parked = "artifact-build/_api-parked";
fs.mkdirSync("artifact-build", { recursive: true });
if (fs.existsSync(parked)) throw new Error(`${parked} exists: restore it to ${api} first.`);
fs.renameSync(api, parked);
try {
  execSync("next build", { stdio: "inherit", env: { ...process.env, WORLDPULSE_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" } });
} finally {
  fs.renameSync(parked, api);
}

// With a relative asset prefix, CSS font URLs must be relative to the CSS file itself.
const cssDir = "artifact-build/.next/_next/static/css";
for (const f of fs.readdirSync(cssDir)) {
  const p = `${cssDir}/${f}`;
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replaceAll("url(_next/static/media/", "url(../media/").replaceAll("url(./_next/static/media/", "url(../media/"));
}
// Package for static hosts that reserve "_"-prefixed names (such as Claude Artifacts):
// artifact-build/site/ holds the assets under "wp/" and page.html is the body-only page.
const out = "artifact-build/.next";
const site = "artifact-build/site";
fs.rmSync(site, { recursive: true, force: true });
fs.cpSync(out, site, { recursive: true });
fs.renameSync(`${site}/_next`, `${site}/wp`);
// The literal U+FFFD in a polyfill is written as its JS escape so strict hosts accept the file.
const rewrite = (t) => t.replaceAll("./_next/", "./wp/").replaceAll("_next/static/", "wp/static/").replaceAll("\uFFFD", "\\uFFFD");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
for (const f of walk(site)) if (/\.(js|css|html|txt)$/.test(f)) fs.writeFileSync(f, rewrite(fs.readFileSync(f, "utf8")));
let page = fs.readFileSync(`${site}/index.html`, "utf8");
page = page
  .replace(/^<!DOCTYPE html>(<!--[^>]*-->)?/, "")
  .replace(/<html[^>]*>|<\/html>|<head>|<\/head>|<\/body>|<body[^>]*>/g, "")
  .replace(/<meta charSet="utf-8"\/>|<meta name="viewport"[^>]*\/>|<title>[^<]*<\/title>/g, "")
  .replace('href="/favicon.svg"', 'href="./favicon.svg"');
fs.writeFileSync(`${site}/page.html`, "<title>WorldPulse</title><style>html,body{background:#0d1a2e;height:100%}</style>" + page);
for (const f of ["index.html", "404.html", "index.txt"]) fs.rmSync(`${site}/${f}`, { force: true });
console.log("Standalone demo written to artifact-build/.next (plain static) and artifact-build/site (page.html + assets)");
