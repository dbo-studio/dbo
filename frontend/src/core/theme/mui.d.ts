import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    editorFontFamily: string;
  }

  interface ThemeOptions {
    editorFontFamily?: string;
  }

  interface Palette {
    textTitle: string;
    textText: string;
    textSubdued: string;
  }

  interface PaletteOptions {
    textTitle?: string;
    textText?: string;
    textSubdued?: string;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsColorOverrides {
    textTitle: true;
    textText: true;
    textSubdued: true;
  }
}
