// Render a film's Web Audio score to out/score.wav headlessly (OfflineAudioContext, no click needed).
// Usage: node wav.mjs film.html   then: ffmpeg -i out/film.mp4 -i out/score.wav -c:v copy -c:a aac -shortest out/film-final.mp4
import puppeteer from 'puppeteer-core';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const file = process.argv[2]; if (!file) { console.error('usage: node wav.mjs film.html'); process.exit(2); }
const browser = await puppeteer.launch({executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve(file)).href + '?bare=1', {waitUntil: 'load'});
await page.waitForFunction('window.__ready === true');
const b64 = await page.evaluate(async () => {
  const sr = 48000, oac = new OfflineAudioContext(2, Math.ceil(sr * FILM.DUR), sr); FILM.score(oac, 0, oac.destination);
  const buf = await oac.startRendering(), n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4)), ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1); let o = 44; for (let i = 0; i < n; i++) { out.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 4; }
  const bytes = new Uint8Array(out.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(s);
});
mkdirSync('out', {recursive: true}); writeFileSync('out/score.wav', Buffer.from(b64, 'base64'));
await browser.close();
console.log('out/score.wav');
