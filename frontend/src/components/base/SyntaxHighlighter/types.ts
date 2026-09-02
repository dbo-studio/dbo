export type SyntaxHighlighterLang = 'sql' | 'json' | 'dbml' | 'text';

export type SyntaxHighlighterProps = {
  value: string;
  lang?: SyntaxHighlighterLang;
};
