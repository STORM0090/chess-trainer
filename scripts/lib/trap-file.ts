// Writing content/traps/*.json with one fixed key order, so a file changes only when its
// content changes. Used by verify and by the explanation tools.

import type { TrapFile } from '../../shared/trap-types.ts';

export function serialiseTrap(trap: TrapFile): string {
  const ordered: TrapFile = {
    schema: trap.schema,
    id: trap.id,
    kind: trap.kind,
    title: trap.title,
    side: trap.side,
    repertoire: trap.repertoire,
    stage: trap.stage,
    order: trap.order,
    stageReason: trap.stageReason,
    idea: trap.idea,
    sacrifice: trap.sacrifice,
    prerequisites: trap.prerequisites,
    lines: trap.lines.map((line) => ({
      tag: line.tag,
      ...(line.main ? { main: true } : {}),
      expect: line.expect,
      moves: line.moves,
      ...(line.note ? { note: line.note } : {}),
      ...(line.explanation
        ? {
            explanation: {
              ru: line.explanation.ru,
              sources: line.explanation.sources,
              ...(line.explanation.link ? { link: line.explanation.link } : {}),
            },
          }
        : {}),
      ...(line.result ? { result: line.result } : {}),
    })),
    sources: trap.sources,
    ...(trap.notes ? { notes: trap.notes } : {}),
    ...(trap.draft ? { draft: true } : {}),
    verified: trap.verified ?? false,
    ...(trap.verification ? { verification: trap.verification } : {}),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
