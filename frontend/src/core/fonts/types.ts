export type FontFaceSpec = {
  weight: string;
  style?: string;
  path: string;
};

export type FontEntry = {
  id: string;
  label: string;
  cssFamily: string;
  stack: string;
  faces?: FontFaceSpec[];
};

export type FontCategory = 'app' | 'editor' | 'fallback';
