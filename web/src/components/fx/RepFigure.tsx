import { useMemo, useRef, useState } from 'react';
import { easeInOut, lerp, useFrameLoop, useInView, usePrefersReducedMotion } from './hooks';

/**
 * A little coach drawn in code: a skeleton with real joint angles that performs a rep, so the
 * movement is shown rather than described. Original artwork, no images or video involved.
 */
type P = { x: number; y: number };
const S = 1; // overall scale of the figure
const SHIN = 62 * S, THIGH = 66 * S, TORSO = 78 * S, ARM1 = 44 * S, ARM2 = 42 * S, HEAD = 15 * S;
const GROUND = 262;

const up = (o: P, len: number, deg: number): P => ({ x: o.x + len * Math.sin((deg * Math.PI) / 180), y: o.y - len * Math.cos((deg * Math.PI) / 180) });

/** Two-bone reach: where the middle joint sits when the ends are fixed. `pick` chooses which of the two solutions. */
function reach(a: P, b: P, l1: number, l2: number, pick: (p: P) => number): P {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.5);
  const x = (d * d + l1 * l1 - l2 * l2) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const mid = { x: a.x + ux * x, y: a.y + uy * x };
  const c1 = { x: mid.x - uy * h, y: mid.y + ux * h };
  const c2 = { x: mid.x + uy * h, y: mid.y - ux * h };
  return pick(c1) >= pick(c2) ? c1 : c2;
}

interface Pose {
  ankle: P; knee: P; hip: P; shoulder: P; head: P; elbow: P; hand: P;
  bar?: P; barR?: number; legStraight?: boolean;
  /** 0 to 1 through the rep: 0 = start position, 1 = deepest or highest point. */
  kneeAngle: number;
}

function squat(t: number): Pose {
  const ankle = { x: 168, y: GROUND };
  const shin = lerp(2, 33, t), thigh = lerp(3, 80, t), lean = lerp(2, 37, t);
  const knee = up(ankle, SHIN, shin);
  const hip = up(knee, THIGH, -thigh);
  const shoulder = up(hip, TORSO, lean);
  const head = up(shoulder, HEAD * 2.1, lean * 0.6);
  const hand = { x: shoulder.x + 5, y: shoulder.y - 3 };
  const elbow = reach(shoulder, hand, ARM1, ARM2, (p) => p.y - p.x * 0.3);
  const kneeAngle = angleAt(ankle, knee, hip);
  return { ankle, knee, hip, shoulder, head, elbow, hand, bar: { x: shoulder.x - 2, y: shoulder.y - 3 }, barR: 17, kneeAngle };
}

function pushup(t: number): Pose {
  const feet = { x: 58, y: GROUND - 3 };
  const phi = lerp(21, 6, t);
  const along = (len: number): P => ({ x: feet.x + len * Math.cos((phi * Math.PI) / 180), y: feet.y - len * Math.sin((phi * Math.PI) / 180) });
  const legLen = SHIN + THIGH;
  const hip = along(legLen);
  const knee = along(SHIN);
  const shoulder = along(legLen + TORSO);
  const head = along(legLen + TORSO + HEAD * 2.1);
  const topShoulder = { x: feet.x + (legLen + TORSO) * Math.cos((21 * Math.PI) / 180), y: feet.y - (legLen + TORSO) * Math.sin((21 * Math.PI) / 180) };
  const hand = { x: topShoulder.x, y: GROUND };
  const elbow = reach(shoulder, hand, ARM1, ARM2, (p) => -p.x + -p.y * 0.2);
  return { ankle: feet, knee, hip, shoulder, head, elbow, hand, legStraight: true, kneeAngle: 180 };
}

function press(t: number): Pose {
  const ankle = { x: 200, y: GROUND };
  const knee = up(ankle, SHIN, 0);
  const hip = up(knee, THIGH, 0);
  const lean = lerp(0, -4, t);
  const shoulder = up(hip, TORSO, lean);
  const head = up(shoulder, HEAD * 2.1, lean * 0.5);
  const hand = { x: shoulder.x + 6, y: lerp(shoulder.y - 6, shoulder.y - (ARM1 + ARM2) + 4, t) };
  const elbow = reach(shoulder, hand, ARM1, ARM2, (p) => p.y);
  return { ankle, knee, hip, shoulder, head, elbow, hand, bar: { ...hand }, barR: 15, kneeAngle: 180 };
}

function angleAt(a: P, b: P, c: P) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export const EXERCISES = {
  squat: { label: 'Back squat', pose: squat, period: 3.4, cues: ['Brace, then sit between your hips', 'Knees track over toes', 'Drive the floor away'], metric: 'Knee angle' },
  pushup: { label: 'Push-up', pose: pushup, period: 2.8, cues: ['One straight line, head to heel', 'Elbows about 45° from the body', 'Press the floor away'], metric: 'Body line' },
  press: { label: 'Overhead press', pose: press, period: 3.0, cues: ['Squeeze glutes, ribs down', 'Bar travels straight up', 'Finish with biceps by ears'], metric: 'Lockout' },
} as const;
export type ExerciseId = keyof typeof EXERCISES;

export default function RepFigure({ exercise }: { exercise: ExerciseId }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const [clock, setClock] = useState(0);
  const config = EXERCISES[exercise];
  useFrameLoop(visible && !reduced, (s) => setClock(Math.round(s * 40) / 40));

  const cycle = reduced ? 0.55 : (clock % config.period) / config.period;
  const phase = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
  const t = easeInOut(Math.min(1, Math.max(0, phase)));
  const reps = reduced ? 3 : Math.floor(clock / config.period);
  const pose = useMemo(() => config.pose(t), [config, t]);

  const stroke = (a: P, b: P, w: number, c: string) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  const joint = (p: P, r = 5) => <circle cx={p.x} cy={p.y} r={r} fill="#fff" stroke="#0f766e" strokeWidth="2.5" />;
  const metric = exercise === 'squat' ? `${Math.round(pose.kneeAngle)}°` : exercise === 'pushup' ? `${Math.round(lerp(0, 3, 1 - t))}° off` : `${Math.round(t * 100)}%`;
  const going = cycle < 0.5 ? 'Lowering' : 'Driving up';

  return (
    <div className="fx-rep" ref={ref}>
      <svg viewBox="40 -35 320 315" role="img" aria-label={`Animated ${config.label} showing correct form`}>
        <defs>
          <linearGradient id="repLimb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#14b8a6" /></linearGradient>
          <linearGradient id="repBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset="1" stopColor="#0f766e" /></linearGradient>
          <radialGradient id="repGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#14b8a6" stopOpacity=".35" /><stop offset="1" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="200" cy={GROUND + 4} rx="140" ry="13" fill="url(#repGlow)" />
        <line x1="50" y1={GROUND + 3} x2="350" y2={GROUND + 3} stroke="rgba(255,255,255,.18)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
        {stroke(pose.knee, pose.ankle, 13, 'url(#repLimb)')}
        {stroke(pose.hip, pose.knee, 15, 'url(#repLimb)')}
        {stroke(pose.shoulder, pose.hip, 20, 'url(#repBody)')}
        {stroke(pose.elbow, pose.shoulder, 11, 'url(#repLimb)')}
        {stroke(pose.hand, pose.elbow, 10, 'url(#repLimb)')}
        <circle cx={pose.head.x} cy={pose.head.y} r={HEAD} fill="url(#repBody)" />
        {pose.bar && (
          <g>
            <circle cx={pose.bar.x} cy={pose.bar.y} r={pose.barR} fill="#0b1220" stroke="#f97316" strokeWidth="3.5" />
            <circle cx={pose.bar.x} cy={pose.bar.y} r={pose.barR! * 0.4} fill="#f97316" />
          </g>
        )}
        {joint(pose.knee)}{joint(pose.hip)}{joint(pose.elbow, 4.5)}{joint(pose.hand, 4)}{joint(pose.ankle, 4)}
      </svg>
      <div className="fx-rep-hud">
        <span className="fx-chip"><i className="fx-dot" /> {going}</span>
        <span className="fx-chip is-metric">{config.metric} <b className="fx-num">{metric}</b></span>
        <span className="fx-chip">Rep <b className="fx-num">{reps}</b></span>
      </div>
    </div>
  );
}
