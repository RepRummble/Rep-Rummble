// Builds src/features/coach/exerciseLibrary.extra.ts from the public-domain Free Exercise DB (The Unlicense):
// https://github.com/yuhonas/free-exercise-db  Run: node scripts/build-exercise-library.mjs
// Each exercise is tagged with the same labels as our hand-made ones (muscle, gear, level, movement, what it stresses).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUT = resolve(new URL('../src/features/coach/exerciseLibrary.extra.ts', import.meta.url).pathname);
// Names of our own hand-made exercises, so the dataset never adds a duplicate of them.
const OWN = readFileSync(resolve(new URL('../src/features/coach/exerciseLibrary.ts', import.meta.url).pathname), 'utf8');
const CURATED = new Set((OWN.match(/x\('([^']+)'/g) ?? []).map((m) => norm(m.slice(3, -1))));

function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ''); }
const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const data = await res.json();

const MUSCLE = { abdominals: 'abs', abductors: 'glutes', adductors: 'quads', biceps: 'biceps', calves: 'calves', chest: 'chest', forearms: 'forearms', glutes: 'glutes', hamstrings: 'hamstrings', lats: 'back', 'lower back': 'back', 'middle back': 'back', neck: 'shoulders', quadriceps: 'quads', shoulders: 'shoulders', traps: 'shoulders', triceps: 'triceps' };
const LEVEL = { beginner: 1, intermediate: 2, expert: 3 };
const CATEGORY = { strength: 's', powerlifting: 's', stretching: 'm', plyometrics: 'p', 'olympic weightlifting': 'o', strongman: 'g', cardio: 'c' };

function gearOf(e) {
  const n = e.name.toLowerCase();
  switch (e.equipment) {
    case 'barbell': case 'e-z curl bar': return 'barbell';
    case 'dumbbell': return 'dumbbell'; case 'cable': return 'cable'; case 'machine': return 'machine';
    case 'kettlebells': return 'kettlebell'; case 'bands': return 'band';
    case 'body only': case 'None': case null: case undefined:
      return /pull-?up|chin-?up|hanging|muscle-?up|rope climb|inverted|dips?\b|skin the cat|l-sit|toes.?to.?bar|bar hang/.test(n) ? 'bar' : 'bodyweight';
    default: return 'other';   // medicine ball, exercise ball, foam roll, other
  }
}

function patternOf(e, muscle, cat) {
  const n = e.name.toLowerCase();
  if (cat === 'c') return 'cardio';
  if (muscle === 'abs') return /carry|farmer/.test(n) ? 'carry' : 'core';
  if (/carry|farmer|suitcase|yoke/.test(n)) return 'carry';
  if (/squat|leg press|hack/.test(n) && !/split squat|bulgarian|pistol/.test(n)) return 'squat';
  if (/lunge|split squat|bulgarian|step-?up|pistol/.test(n)) return 'lunge';
  if (/deadlift|good morning|hip thrust|bridge|swing|pull.?through|hyperextension|back extension|glute.?ham|romanian|rack pull/.test(n)) return 'hinge';
  if (/pull-?up|chin-?up|pulldown|pull-down|muscle-?up|rope climb/.test(n)) return 'vpull';
  if (/\brow\b|face pull|reverse fly|rear delt|shrug|pullover/.test(n) || (muscle === 'back' && e.force === 'pull')) return 'hpull';
  if (/overhead|military|shoulder press|arnold|push press|handstand|pike|jerk|upright/.test(n) || (muscle === 'shoulders' && e.force === 'push')) return 'vpush';
  if (/bench|push-?up|chest press|dip|fly|flye|crossover|pec|floor press/.test(n) || (muscle === 'chest')) return 'hpush';
  if (muscle === 'triceps' && e.force === 'push') return 'hpush';
  return 'iso';
}

function stressOf(e, cat) {
  const n = e.name.toLowerCase(); const s = new Set();
  if (/squat|lunge|leg press|leg extension|step-?up|jump|pistol|sissy|hack|wall sit|box|clean|snatch|jerk|sprint|hop|bound/.test(n)) s.add('knee');
  if (/overhead|military|shoulder press|arnold|behind|upright|\bdips?\b|handstand|snatch|jerk|pullover|push press|muscle-?up|fly|flye|crossover|bench press|lateral raise|front raise/.test(n) && !/ machine/.test(n)) s.add('shoulder');
  if (/deadlift|good morning|bent.?over|barbell row|t-bar|hyperextension|back extension|clean|snatch|swing|superman|sit-?up|jefferson|stiff|romanian|rack pull|atlas|stone|tire|yoke|log lift|farmer/.test(n) || cat === 'o' || cat === 'g') s.add('back');
  if (/push-?up|plank|handstand|burpee|climber|crawl|front squat|clean|planche|wrist|mountain|handstand|bear/.test(n)) s.add('wrist');
  if (cat === 'p' || /jump|hop|bound|burpee|sprint|skip|plyo|clap|box|depth|bounding|high knees|jumping/.test(n)) s.add('impact');
  return [...s];
}

const tipOf = (e) => {
  const first = (e.instructions?.[0] ?? '').replace(/\s+/g, ' ').trim();
  const sentence = first.split(/(?<=[.!?])\s/)[0] ?? first;
  return (sentence.length > 150 ? sentence.slice(0, 147).trimEnd() + '…' : sentence) || 'Move with control and keep your form tight.';
};

const rows = [];
const seen = new Set(CURATED);
for (const e of data) {
  const name = e.name.trim();
  if (!name || name.length > 60) continue;
  const key = norm(name);
  if (seen.has(key)) continue;
  const cat = CATEGORY[e.category] ?? 's';
  const muscle = cat === 'c' ? 'cardio' : MUSCLE[e.primaryMuscles?.[0]];
  if (!muscle) continue;
  seen.add(key);
  const kind = e.mechanic === 'isolation' ? 'isolation' : e.mechanic === 'compound' ? 'compound' : (e.secondaryMuscles?.length ? 'compound' : 'isolation');
  const timed = cat === 'm' || cat === 'c' || e.force === 'static';
  rows.push([name, muscle, patternOf(e, muscle, cat), gearOf(e), LEVEL[e.level] ?? 2, kind === 'compound' ? 'c' : 'i', stressOf(e, cat).map((x) => x[0]).join(''), cat, timed ? 1 : 0, tipOf(e)]);
}

const body = rows.map((r) => '  ' + JSON.stringify(r)).join(',\n');
writeFileSync(OUT, `// GENERATED by scripts/build-exercise-library.mjs from the Free Exercise DB (public domain, The Unlicense). Do not edit by hand.
// Row: [name, muscle, pattern, gear, level, kind (c|i), stress letters (k=knee s=shoulder b=back w=wrist i=impact), category (s strength, m mobility, p plyometric, o olympic, g strongman, c cardio), timed (0|1), tip]
export type ExtraRow = [string, string, string, string, 1 | 2 | 3, 'c' | 'i', string, string, 0 | 1, string];
export const EXTRA_ROWS: ExtraRow[] = [
${body},
];
`);
console.log(`${rows.length} exercises written (${data.length} in the source, ${data.length - rows.length} skipped as duplicates of ours, too long, or untaggable)`);
