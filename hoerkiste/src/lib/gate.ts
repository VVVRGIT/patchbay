/** Entsperrt nur für diese Sitzung im Speicher – ein Reload sperrt wieder. */
let unlocked = false;

export function unlockParents() {
  unlocked = true;
}

export function lockParents() {
  unlocked = false;
}

export function parentsUnlocked() {
  return unlocked;
}

export function makeTask(rand: () => number = Math.random) {
  const a = 3 + Math.floor(rand() * 7); // 3..9
  const b = 6 + Math.floor(rand() * 4); // 6..9
  return { a, b, answer: a * b };
}
