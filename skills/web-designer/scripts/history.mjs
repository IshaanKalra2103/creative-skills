#!/usr/bin/env node
/**
 * The look history: every finished project leaves a row, and the next one
 * must differ from every row on at least 4 of the 6 look columns (kind is context).
 *
 *   node history.mjs show
 *   node history.mjs check "site|printed|light|serif|red|photo|index"
 *   node history.mjs add "Forager|site|printed|light|serif|red|photo|index"
 *   node history.mjs check "<7 values>" --vs "<the old site's 7 values>"   a redesign against its old look
 *   node history.mjs check "<7 values>" --except "Forager"                    leave a project's own row out
 *
 * Columns (use only these words, so the comparison is mechanical):
 *   kind      site app
 *   source    printed object place media nature play
 *   ground    paper (warm off-white) light (white, cool) dark colour-field image
 *   type      serif grotesque expanded condensed rounded mono custom-display
 *   accent    red orange yellow green teal blue violet pink neutral
 *             (on a colour-field page: the accent ON the field, not the field itself)
 *   richness  photo illustration shape colour-material 3d-object data
 *   grammar   sites: scroll-story index poster catalogue document tool-first single-screen
 *             apps:  sidebar topbar canvas command split inbox
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FILE = path.join(os.homedir(), ".web-designer", "history.md");
const HEAD = "| date | project | kind | source | ground | type | accent | richness | grammar |\n|---|---|---|---|---|---|---|---|---|\n";
const WORDS = {
  kind: ["site", "app"],
  source: ["printed", "object", "place", "media", "nature", "play"],
  ground: ["paper", "light", "dark", "colour-field", "image"],
  type: ["serif", "grotesque", "expanded", "condensed", "rounded", "mono", "custom-display"],
  accent: ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink", "neutral"],
  richness: ["photo", "illustration", "shape", "colour-material", "3d-object", "data"],
  grammar: ["scroll-story", "index", "poster", "catalogue", "document", "tool-first", "single-screen", "sidebar", "topbar", "canvas", "command", "split", "inbox"],
};
const COLS = Object.keys(WORDS);
const LOOK = COLS.slice(1); // kind is context, not look

if (!fs.existsSync(FILE)) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, HEAD); }
const rows = () => fs.readFileSync(FILE, "utf8").split("\n").filter((l) => /^\|/.test(l) && !/^\|\s*(date|---)/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim())).map((c) => ({ date: c[0], project: c[1], ...Object.fromEntries(COLS.map((k, i) => [k, c[i + 2]])) }));

const parse = (s, withName) => {
  const p = s.split("|").map((x) => x.trim().toLowerCase());
  const name = withName ? s.split("|")[0].trim() : null;
  const vals = withName ? p.slice(1) : p;
  if (vals.length !== COLS.length) { console.error(`Need ${COLS.length} values: ${COLS.join("|")}`); process.exit(2); }
  const row = Object.fromEntries(COLS.map((k, i) => [k, vals[i]]));
  for (const k of COLS) if (!WORDS[k].includes(row[k])) { console.error(`"${row[k]}" is not a ${k} word. Use one of: ${WORDS[k].join(" ")}`); process.exit(2); }
  return { name, row };
};

// --vs "<7 values>" compares against one explicit look instead (a redesign's
// old site); --except "<project>" leaves that project's own row out.
const vsIdx = process.argv.indexOf("--vs"), exIdx = process.argv.indexOf("--except");
const except = exIdx > -1 ? process.argv[exIdx + 1] : null;
const check = (row) => {
  const clashes = [];
  const pool = vsIdx > -1 ? [{ project: "the look given with --vs", date: "-", ...parse(process.argv[vsIdx + 1], false).row }] : rows().filter((r) => r.project !== except);
  for (const r of pool) {
    const diff = LOOK.filter((k) => r[k] !== row[k]).length;
    if (diff < 4) clashes.push(`${r.project} (${r.date}): differs on only ${diff} of ${LOOK.length} (${LOOK.filter((k) => r[k] === row[k]).join(", ")} match)`);
  }
  return clashes;
};

const [cmd, val] = process.argv.slice(2);
if (cmd === "show" || !cmd) { console.log(FILE + "\n"); console.log(fs.readFileSync(FILE, "utf8")); if (!rows().length) console.log("(empty: the first project sets the first row)"); }
else if (cmd === "check") {
  const { row } = parse(val, false);
  const c = check(row);
  if (c.length) { console.log("Too close to an earlier look:\n  " + c.join("\n  ")); process.exit(1); }
  console.log("Clear: differs from every earlier look on at least 4 columns.");
} else if (cmd === "add") {
  const { name, row } = parse(val, true);
  const c = check(row);
  // Another project may have been added while this one was being made: the
  // rule is enforced at the end too. --force records it anyway, with a reason.
  if (c.length && !process.argv.includes("--force")) {
    console.log("Not added: too close to an earlier look (another project may have been recorded while you worked):\n  " + c.join("\n  ") +
      "\nChange the look on enough columns, or record it with --force and say why in DIRECTION.md.");
    process.exit(1);
  }
  if (c.length) console.log("Recorded with --force despite:\n  " + c.join("\n  "));
  fs.appendFileSync(FILE, `| ${new Date().toISOString().slice(0, 10)} | ${name} | ${COLS.map((k) => row[k]).join(" | ")} |\n`);
  console.log("Added to " + FILE);
} else { console.error("usage: node history.mjs show | check \"<7 values>\" | add \"<name>|<7 values>\""); process.exit(2); }
