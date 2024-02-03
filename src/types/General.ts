export interface SimpleObject<T = unknown> {
  [k: string]: T;
}
export type ArgumentType<F extends Function> = F extends (...args: infer A) => any ? A[0] : never;
export type SimpleFunction = () => void;
