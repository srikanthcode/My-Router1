/**
 * Free-model request queue (§22, §59).
 *
 * A real in-process priority queue: requests genuinely wait for a provider
 * slot. Positions and estimates shown to users are computed from actual
 * queue state — never faked. Priority comes from the user's plan
 * (1 = highest, from plans.queue_priority).
 */

interface Waiter {
  id: number;
  modelKey: string;
  priority: number;
  enqueuedAt: number;
  resolve: () => void;
  reject: (err: Error) => void;
}

interface ModelState {
  running: number;
  waiting: Waiter[];
  avgServiceMs: number;
  lastServiceMs: number;
}

let nextId = 1;
const states = new Map<string, ModelState>();

function state(modelKey: string): ModelState {
  let s = states.get(modelKey);
  if (!s) {
    s = { running: 0, waiting: [], avgServiceMs: 3000, lastServiceMs: 0 };
    states.set(modelKey, s);
  }
  return s;
}

export interface QueueStatus {
  position: number;
  running: number;
  waiting: number;
  estimatedWaitMs: number;
  ready: boolean;
}

/** Non-blocking view of the queue for a hypothetical new arrival. */
export function probeQueue(modelKey: string, priority: number): QueueStatus {
  const s = state(modelKey);
  if (s.running === 0 && s.waiting.length === 0) {
    return { position: 0, running: 0, waiting: 0, estimatedWaitMs: 0, ready: true };
  }
  let ahead = 0;
  for (const w of s.waiting) {
    if (w.priority <= priority) ahead++;
  }
  const position = s.running > 0 ? ahead + 1 : ahead;
  if (position === 0) return { position: 0, running: s.running, waiting: s.waiting.length, estimatedWaitMs: 0, ready: true };
  const estimatedWaitMs = Math.round(position * s.avgServiceMs);
  return { position, running: s.running, waiting: s.waiting.length, estimatedWaitMs, ready: false };
}

/**
 * Acquire a slot for a free-model request. Resolves when the request may
 * proceed; caller MUST call release() in a finally block.
 */
export async function acquireSlot(
  modelKey: string,
  concurrency: number,
  priority: number,
  onStatus?: (status: QueueStatus) => void,
): Promise<{ queueWaitMs: number; positionAtEntry: number }> {
  const s = state(modelKey);
  const startedAt = Date.now();

  if (s.running < concurrency && s.waiting.length === 0) {
    s.running++;
    onStatus?.({ position: 0, running: s.running, waiting: 0, estimatedWaitMs: 0, ready: true });
    return { queueWaitMs: 0, positionAtEntry: 0 };
  }

  const positionAtEntry = probeQueue(modelKey, priority).position;
  await new Promise<void>((resolve, reject) => {
    const waiter: Waiter = { id: nextId++, modelKey, priority, enqueuedAt: Date.now(), resolve, reject };
    s.waiting.push(waiter);
    s.waiting.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
    const pos = s.waiting.indexOf(waiter) + 1;
    onStatus?.({ position: pos, running: s.running, waiting: s.waiting.length, estimatedWaitMs: Math.round(pos * s.avgServiceMs), ready: false });
  });
  return { queueWaitMs: Date.now() - startedAt, positionAtEntry };
}

/** Free a slot and hand it to the next waiter in line. */
export function releaseSlot(modelKey: string, serviceMs = 0): void {
  const s = state(modelKey);
  if (serviceMs > 0) {
    s.lastServiceMs = serviceMs;
    s.avgServiceMs = Math.round(s.avgServiceMs * 0.7 + serviceMs * 0.3);
  }
  const next = s.waiting.shift();
  if (next) next.resolve();
  else if (s.running > 0) s.running--;
}

export function queueSnapshot(): Array<{ modelKey: string; running: number; waiting: number; avgServiceMs: number }> {
  return [...states.entries()].map(([modelKey, s]) => ({ modelKey, running: s.running, waiting: s.waiting.length, avgServiceMs: s.avgServiceMs }));
}