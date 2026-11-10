export type DiffLineKind = 'same' | 'add' | 'del';

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
};

// Above this many cell comparisons the LCS table gets too big for a UI thread; show a plain replace.
const MAX_CELLS = 250_000;

const splitLines = (value: string): string[] => value.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');

/** Line-level diff (longest common subsequence) between the original SQL and a suggestion. */
export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = splitLines(before);
  const b = splitLines(after);

  if (a.length * b.length > MAX_CELLS) {
    return [
      ...a.map((text): DiffLine => ({ kind: 'del', text })),
      ...b.map((text): DiffLine => ({ kind: 'add', text }))
    ];
  }

  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ kind: 'del', text: a[i++] });
    } else {
      result.push({ kind: 'add', text: b[j++] });
    }
  }
  while (i < a.length) result.push({ kind: 'del', text: a[i++] });
  while (j < b.length) result.push({ kind: 'add', text: b[j++] });

  return result;
};
