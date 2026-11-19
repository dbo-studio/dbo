export type FontFaceSpec = {
  weight: string;
  style?: string;
  path: string;
  /** Limits the face to a script so it can sit first in the stack without eating Latin. */
  unicodeRange?: string;
};

export type FontEntry = {
  id: string;
  label: string;
  cssFamily: string;
  stack: string;
  faces?: FontFaceSpec[];
};

export type FontCategory = 'app' | 'editor' | 'fallback';
