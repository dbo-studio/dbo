import type { Components, Theme } from '@mui/material/styles';
import JetBrainsMonoWoff2 from './../../../assets/fonts/JetBrainsMono-Regular.woff2';
import JetBrainsMonoMediumWoff2 from './../../../assets/fonts/JetBrainsMono-Medium.woff2';
import JetBrainsMonoBoldWoff2 from './../../../assets/fonts/JetBrainsMono-Bold.woff2';
import JetBrainsMonoMediumItalicWoff2 from './../../../assets/fonts/JetBrainsMono-Italic.woff2';
import JetBrainsMonoBoldItalicWoff2 from './../../../assets/fonts/JetBrainsMono-BoldItalic.woff2';

export default function Fonts(_: Theme): Components {
  return {
    MuiCssBaseline: {
      styleOverrides: `
          @font-face {
            font-family: 'JetBrainsMono';
            font-style: normal;
            font-weight: 400;
            src: url(${JetBrainsMonoWoff2}) format('woff2');
          }
          @font-face {
            font-family: 'JetBrainsMono';
            font-style: normal;
            font-weight: medium;
            src: url(${JetBrainsMonoMediumWoff2}) format('woff2');
          }
          @font-face {
            font-family: 'JetBrainsMono';
            font-style: normal;
            font-weight: bold;
            src: url(${JetBrainsMonoBoldWoff2}) format('woff2');
          }
          @font-face {
            font-family: 'JetBrainsMono';
            font-style: italic;
            font-weight: medium;
            src: url(${JetBrainsMonoMediumItalicWoff2}) format('woff2');
          }
          @font-face {
            font-family: 'JetBrainsMono';
            font-style: italic;
            font-weight: bold;
            src: url(${JetBrainsMonoBoldItalicWoff2}) format('woff2');
          }
      `
    }
  };
}
