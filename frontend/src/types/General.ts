export interface SimpleObject<T = unknown> {
  [k: string]: T;
}
export type ArgumentType<F extends () => void> = F extends (...args: infer A) => unknown ? A[0] : never;
export type SimpleFunction = () => void;

export type ContextMenuType = {
  mouseX: number;
  mouseY: number;
} | null;

export type ShortcutType = {
  label: string;
  monaco: number[];
  command: string[]; // Array of key names for Kbd component
  shortcut: (event: KeyboardEvent) => boolean;
};
