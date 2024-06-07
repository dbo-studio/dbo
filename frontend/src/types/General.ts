export interface SimpleObject<T = unknown> {
  [k: string]: T;
}
export type ArgumentType<F extends () => void> = F extends (...args: infer A) => any ? A[0] : never;
export type SimpleFunction = () => void;

export type ContextMenuType = {
  mouseX: number;
  mouseY: number;
} | null;

export type ShortcutType = {
  codemirror: string;
  command: string;
  shortcut: (event: KeyboardEvent) => boolean;
};
