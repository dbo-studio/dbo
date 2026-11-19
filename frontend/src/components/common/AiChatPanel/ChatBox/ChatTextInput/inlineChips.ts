/** Contenteditable mention chips: a textarea cannot host an object pill in the text. */

const ZWSP = '\u200B';

export type InlineChipKind = 'table' | 'view';

export type ComposerContents = {
  text: string;
  tables: string[];
  views: string[];
};

export function createInlineChip(kind: InlineChipKind, name: string, removeLabel: string): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.setAttribute('data-testid', 'ai-context-chip');
  chip.setAttribute('data-chip', name);
  chip.setAttribute('data-kind', kind);

  const label = document.createElement('span');
  label.setAttribute('data-chip-label', '');
  label.textContent = name;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.tabIndex = -1;
  remove.setAttribute('data-testid', 'ai-context-chip-remove');
  remove.setAttribute('aria-label', removeLabel);
  remove.textContent = '×';

  chip.append(label, remove);
  return chip;
}

export function readComposer(root: HTMLElement): ComposerContents {
  let text = '';
  const tables: string[] = [];
  const views: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.getAttribute('data-testid') === 'ai-context-chip') {
      const name = node.getAttribute('data-chip') ?? '';
      if (node.getAttribute('data-kind') === 'view') {
        if (name && !views.includes(name)) views.push(name);
      } else if (name && !tables.includes(name)) {
        tables.push(name);
      }
      return;
    }
    node.childNodes.forEach(walk);
  };

  walk(root);
  return { text: text.split(ZWSP).join(''), tables, views };
}

export type MentionInText = {
  node: Text;
  at: number;
  query: string;
};

/** @ mention in the text node that holds the caret, so a chip in the middle does not count. */
export function mentionAtCaret(root: HTMLElement): MentionInText | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const before = (node.textContent ?? '').slice(0, range.startOffset);
  const at = before.lastIndexOf('@');
  if (at < 0 || (at > 0 && !/\s/.test(before[at - 1]))) return null;
  const fragment = before.slice(at + 1);
  if (fragment.includes(' ') || fragment.includes('\n')) return null;
  return { node: node as Text, at, query: fragment };
}

export function deleteMentionTrigger(mention: MentionInText): void {
  const sel = window.getSelection();
  const offset = sel?.rangeCount ? sel.getRangeAt(0).startOffset : mention.node.length;
  mention.node.deleteData(mention.at, Math.max(0, offset - mention.at));
}

export function placeCaretAfter(node: Node): void {
  const parent = node.parentNode;
  if (!parent) return;
  let next = node.nextSibling;
  if (!next || next.nodeType !== Node.TEXT_NODE) {
    next = document.createTextNode(ZWSP);
    parent.insertBefore(next, node.nextSibling);
  }
  const sel = window.getSelection();
  const range = document.createRange();
  const text = next as Text;
  const start = text.data.startsWith(ZWSP) ? 1 : 0;
  range.setStart(text, Math.min(start, text.length));
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function insertChipAtCaret(chip: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(chip);
  placeCaretAfter(chip);
}

export function insertChipAtStart(root: HTMLElement, chip: HTMLElement): void {
  root.insertBefore(chip, root.firstChild);
}

export function editorChips(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[data-testid="ai-context-chip"]')];
}

export function hasChip(root: HTMLElement, name: string): boolean {
  return editorChips(root).some((chip) => chip.getAttribute('data-chip') === name);
}

/** Keep pills; drop typed text (send / clear). */
export function stripTextKeepChips(root: HTMLElement): void {
  root.replaceChildren(...editorChips(root));
}

export function reconcileChips(root: HTMLElement, tables: string[], views: string[], removeLabel: string): void {
  const wanted = new Map<string, InlineChipKind>();
  tables.forEach((name) => wanted.set(`table:${name}`, 'table'));
  views.forEach((name) => wanted.set(`view:${name}`, 'view'));

  for (const chip of editorChips(root)) {
    const name = chip.getAttribute('data-chip') ?? '';
    const kind = chip.getAttribute('data-kind') === 'view' ? 'view' : 'table';
    if (!wanted.has(`${kind}:${name}`)) chip.remove();
  }

  const present = new Set(
    editorChips(root).map(
      (chip) => `${chip.getAttribute('data-kind') === 'view' ? 'view' : 'table'}:${chip.getAttribute('data-chip')}`
    )
  );
  for (const [key, kind] of wanted) {
    if (present.has(key)) continue;
    const name = key.slice(key.indexOf(':') + 1);
    insertChipAtStart(root, createInlineChip(kind, name, removeLabel));
  }
}

export function composerIsEmpty(root: HTMLElement): boolean {
  const { text, tables, views } = readComposer(root);
  return text.trim() === '' && tables.length === 0 && views.length === 0;
}
