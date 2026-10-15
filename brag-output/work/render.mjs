// Usage: node render.mjs stills 1.5 4.2 ...   |   node render.mjs full
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const [mode, ...rest] = process.argv.slice(2);
const FPS = 30, DUR = 20;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on("pageerror", e => console.error("pageerror", e.message));
await p.goto("file://" + join(here, "video.html"), { waitUntil: "networkidle" });
await p.evaluate(() => window.ready);
if (mode === "stills") {
  mkdirSync(join(here, "stills"), { recursive: true });
  for (const t of rest.map(Number)) {
    await p.evaluate(t => window.render(t), t);
    await p.screenshot({ path: join(here, "stills", "t" + t.toFixed(2) + ".png") });
  }
} else {
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", join(here, "video-noaudio.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  const total = FPS * DUR;
  for (let i = 0; i < total; i++) {
    await p.evaluate(t => window.render(t), i / FPS);
    const buf = await p.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 60 === 0) console.log("frame", i, "/", total);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  console.log("done");
}
await b.close();
