import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

declare module '@mui/material/styles' {
  export interface TypeBackground {
    default: string;
    paper: string;
    primary: string;
    subdued: string;
    secondary: string;
    highlight: string;
    success: string;
    warning: string;
    danger: string;
  }
  export interface TypeText {
    text: string;
    title: string;
    subdued: string;
    accent: string;
    link: string;
    success: string;
    warning: string;
    danger: string;
    placeholder: string;
  }
}

const GREY = {
  0: '#FFFFFF',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#212B36',
  900: '#161C24'
};

// Dark mode raises luminance of brand/semantic colors so they stay readable on #1A1C1E.
const colorPalette = {
  primary: { light: '#07C', dark: '#36A2EF' },
  secondary: { light: '#f04e98', dark: '#f68fbe' },
  info: { light: '#74CAFF', dark: '#36a2ef' },
  success: { light: '#00bfb3', dark: '#7dded8' },
  warning: { light: '#fec514', dark: '#f3d371' },
  error: { light: '#bd271e', dark: '#f86b63' },
  divider: { light: '#d3dae6', dark: '#343741' },
  action: {
    light: {
      active: GREY[600],
      hover: '#eaebec',
      selected: '#dbecfa',
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[500],
      hover: '#44464d',
      selected: '#103148',
      disabled: '#515761',
      disabledBackground: '#212229',
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  // `primary` is body copy and `secondary` is muted copy (MUI convention); pink lives in `accent`.
  text: {
    light: {
      primary: '#343741',
      secondary: '#646a77',
      text: '#343741',
      title: '#1a1c21',
      subdued: '#646a77',
      accent: '#ba3d76',
      link: '#006bb8',
      success: '#343741',
      warning: '#343741',
      danger: '#343741',
      disabled: '#a2abba',
      placeholder: '#69707d'
    },
    dark: {
      primary: '#dfe5ef',
      secondary: '#98a0aa',
      text: '#dfe5ef',
      title: '#f0f3f8',
      subdued: '#98a0aa',
      accent: '#f68fbe',
      link: '#36a2ef',
      success: '#fff',
      warning: '#fff',
      danger: '#fff',
      disabled: '#515761',
      placeholder: '#98a0aa'
    }
  },
  background: {
    light: {
      primary: '#fff',
      subdued: '#f7f8fc',
      secondary: '#FEEDF5',
      highlight: '#fff9e8',
      success: '#daebc2',
      warning: '#ffe18e',
      danger: '#f5a6b0'
    },
    dark: {
      primary: '#1A1C1E',
      subdued: '#25282A',
      secondary: '#2A2228',
      highlight: '#2e2d25',
      success: '#4a7a33',
      warning: '#8b6926',
      danger: '#8e2f31'
    }
  }
};

export default function dboPalette(themeMode: ThemeModeEnum): Record<string, unknown> {
  const { primary, secondary, info, success, warning, error, divider, action, text, background } = colorPalette;

  return {
    primary: { main: primary[themeMode] },
    secondary: { main: secondary[themeMode] },
    info: { main: info[themeMode] },
    success: { main: success[themeMode] },
    warning: { main: warning[themeMode] },
    error: { main: error[themeMode] },
    grey: GREY,
    background: {
      default: background[themeMode].primary,
      paper: background[themeMode].subdued,
      ...background[themeMode]
    },
    text: text[themeMode],
    action: action[themeMode],
    divider: divider[themeMode]
  };
}
