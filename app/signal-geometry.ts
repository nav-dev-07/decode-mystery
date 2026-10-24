export interface SignalPoint { x: number; y: number; z: number }

export const SIGNAL_NODE_COUNT = 84;
export const SIGNAL_FORMS = ["ORBITAL NETWORK", "DOUBLE HELIX", "TOROIDAL FIELD", "INFINITY TRACE"];
const TAU = Math.PI * 2;
const HOLD = 5;
const MORPH = 2.5;

const forms: SignalPoint[][] = SIGNAL_FORMS.map((_, form) =>
  Array.from({ length: SIGNAL_NODE_COUNT }, (_, index) => {
    const t = index / SIGNAL_NODE_COUNT;
    if (form === 0) {
      const y = 1 - 2 * (index + 0.5) / SIGNAL_NODE_COUNT;
      const radius = Math.sqrt(1 - y * y);
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    }
    if (form === 1) {
      const step = Math.floor(index / 2) / (SIGNAL_NODE_COUNT / 2 - 1);
      const angle = step * TAU * 1.8 + (index % 2) * Math.PI;
      return { x: Math.cos(angle) * 0.62, y: (step - 0.5) * 2.1, z: Math.sin(angle) * 0.62 };
    }
    if (form === 2) {
      const u = Math.floor(index / 7) / 12 * TAU;
      const v = (index % 7) / 7 * TAU;
      const radius = 0.75 + Math.cos(v) * 0.28;
      return { x: Math.cos(u) * radius, y: Math.sin(v) * 0.28, z: Math.sin(u) * radius };
    }
    const angle = t * TAU;
    const denominator = 1 + Math.sin(angle) ** 2;
    return {
      x: Math.cos(angle) * 1.15 / denominator,
      y: Math.sin(angle) * Math.cos(angle) * 1.8 / denominator,
      z: Math.sin(angle * 3) * 0.35,
    };
  }),
);

export function sampleSignal(seconds: number) {
  const time = Math.max(0, seconds);
  const cycle = Math.floor(time / (HOLD + MORPH));
  const mode = cycle % forms.length;
  const next = (mode + 1) % forms.length;
  const amount = Math.max(0, (time % (HOLD + MORPH) - HOLD) / MORPH);
  const blend = amount * amount * (3 - 2 * amount);
  return {
    mode,
    morphing: amount > 0,
    points: forms[mode].map((point, index) => ({
      x: point.x + (forms[next][index].x - point.x) * blend,
      y: point.y + (forms[next][index].y - point.y) * blend,
      z: point.z + (forms[next][index].z - point.z) * blend,
    })),
  };
}

export function projectSignal(point: SignalPoint, yaw: number, pitch: number, scale: number) {
  const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
  const depth = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  const y = point.y * Math.cos(pitch) - depth * Math.sin(pitch);
  const z = point.y * Math.sin(pitch) + depth * Math.cos(pitch);
  const perspective = 3.6 / (3.6 - z);
  return { x: x * scale * perspective, y: y * scale * perspective, z, perspective };
}
