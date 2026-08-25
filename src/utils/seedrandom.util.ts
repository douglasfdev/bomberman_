export function generateSeed(): string {
  const entropy = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(entropy, n => n.toString(36).padStart(8, '0')).join('');
}

export function createRng(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  let state = Math.abs(hash) || 1;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}