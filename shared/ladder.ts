// The order in which traps are listed and opened for practice. Shared by the app and the
// Node scripts, so the catalogue in ROADMAP.md and the app can never disagree.

interface LadderPlace {
  stage: number;
  order: number;
  id: string;
}

/** By ladder stage, then by the `order` field inside the stage. Both are data in the trap file. */
export function compareLadder(a: LadderPlace, b: LadderPlace): number {
  return a.stage - b.stage || a.order - b.order || a.id.localeCompare(b.id);
}
