import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

declare module '@mui/material/styles/createPalette' {
  export interface Palette {
    accent: PaletteColor;
    white: PaletteColor;
    black: PaletteColor;
    gradient: PaletteColor;
  }
  export interface TypeBackground {
    default: string;
    paper: string;
    neutral?: string;
    primary: string;
    subdued: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
  }
  export interface TypeText {
    text: string;
    title: string;
    subdued: string;
    success: string;
    warning: string;
    danger: string;
    highlight: string;
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

const PRIMARY = {
  light: '#006bb8',
  main: '#006bb8',
  dark: '#36a2ef'
};

const SECONDARY = {
  light: '#ba3d76',
  main: '#ba3d76',
  dark: '#f68fbe'
};

const INFO = {
  light: '#74CAFF',
  main: '#74CAFF',
  dark: '#36a2ef'
};

const SUCCESS = {
  light: '#007871',
  main: '#00bfb3',
  dark: '#7dded8'
};

const WARNING = {
  light: '#83650a',
  dark: '#f3d371'
};

const ERROR = {
  light: '#bd271e',
  main: '#bd271e',
  dark: '#f86b63'
};

const DISABLED = {
  light: '#a2abba',
  main: '#a2abba',
  dark: '#515761'
};

const colorPalette = {
  common: { black: '#000', white: '#fff' },
  primary: PRIMARY,
  secondary: SECONDARY,
  accent: SECONDARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  disabled: DISABLED,
  constant: { white: '#FFFFFF', black: '#222222' },
  divider: { light: '#d3dae6', dark: '#343741' },
  action: {
    light: {
      active: GREY[600],
      hover: '#fafbfd',
      selected: '#dbecfa',
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[600],
      hover: '#25282A',
      selected: '#103148',
      disabled: '#515761',
      disabledBackground: '#212229',
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: '#343741',
      title: '#1a1c21',
      subdued: '#646a77',
      success: SUCCESS.light,
      warning: WARNING.light,
      danger: ERROR.light,
      primary: PRIMARY.light,
      secondary: SECONDARY.light,
      disabled: DISABLED.light,
      highlight: '#fff9e8',
      placeholder: '#69707d'
    },
    dark: {
      text: '#dfe5ef',
      title: '#dfe5ef',
      subdued: '#7a7f89',
      success: SUCCESS.dark,
      warning: WARNING.dark,
      danger: ERROR.dark,
      primary: PRIMARY.dark,
      secondary: SECONDARY.dark,
      disabled: DISABLED.dark,
      highlight: '#2e2d25',
      placeholder: '#81858f'
    }
  },
  background: {
    light: {
      default: '#fff',
      paper: '#f7f8fc',
      neutral: '#FEEDF5',
      primary: '#e6f1fa',
      subdued: '#f7f8fc',
      secondary: '#FEEDF5',
      success: '#e6f9f7',
      warning: '#fff9e8',
      danger: '#f8e9e9'
    },
    dark: {
      default: '#1A1C1E',
      paper: '#25282A',
      neutral: '#343A40',
      primary: '#0b2030',
      subdued: '#141519',
      secondary: '#311d26',
      success: '#192c2b',
      warning: '#312a17',
      danger: '#321514'
    }
  }
};

export default function palette(themeMode: ThemeModeEnum) {
  const theme = {
    light: {
      primary: {
        main: colorPalette.primary.light
      },
      secondary: {
        main: colorPalette.secondary.light
      },
      accent: {
        main: colorPalette.accent.light
      },
      white: {
        main: colorPalette.constant.white
      },
      black: {
        main: colorPalette.constant.black
      },
      error: {
        main: colorPalette.error.light
      },
      warning: {
        main: colorPalette.warning.light
      },
      success: {
        main: colorPalette.success.light
      },
      background: {
        default: colorPalette.background.light.default,
        paper: colorPalette.background.light.paper,
        neutral: colorPalette.background.light.neutral,
        primary: colorPalette.background.light.primary,
        subdued: colorPalette.background.light.subdued,
        secondary: colorPalette.background.light.secondary,
        success: colorPalette.background.light.success,
        warning: colorPalette.background.light.warning,
        danger: colorPalette.background.light.danger
      },
      text: colorPalette.text.light,
      action: {
        selected: colorPalette.action.light.selected,
        active: colorPalette.action.light.active,
        hover: colorPalette.action.light.hover,
        disabled: colorPalette.action.light.disabled,
        disabledBackground: colorPalette.action.light.disabledBackground,
        focus: colorPalette.action.light.focus,
        hoverOpacity: colorPalette.action.light.hoverOpacity,
        disabledOpacity: colorPalette.action.light.disabledOpacity
      },
      divider: colorPalette.divider.light
    },
    dark: {
      primary: {
        main: colorPalette.primary.dark
      },
      secondary: {
        main: colorPalette.secondary.dark
      },
      accent: {
        main: colorPalette.accent.dark
      },
      white: {
        main: colorPalette.constant.white
      },
      black: {
        main: colorPalette.constant.black
      },
      error: {
        main: colorPalette.error.dark
      },
      warning: {
        main: colorPalette.warning.dark
      },
      success: {
        main: colorPalette.success.dark
      },
      background: {
        default: colorPalette.background.dark.default,
        paper: colorPalette.background.dark.paper,
        neutral: colorPalette.background.dark.neutral,
        primary: colorPalette.background.dark.primary,
        subdued: colorPalette.background.dark.subdued,
        secondary: colorPalette.background.dark.secondary,
        success: colorPalette.background.dark.success,
        warning: colorPalette.background.dark.warning,
        danger: colorPalette.background.dark.danger
      },
      action: {
        selected: colorPalette.action.dark.selected,
        active: colorPalette.action.dark.active,
        hover: colorPalette.action.dark.hover,
        disabled: colorPalette.action.dark.disabled,
        disabledBackground: colorPalette.action.dark.disabledBackground,
        focus: colorPalette.action.dark.focus,
        hoverOpacity: colorPalette.action.dark.hoverOpacity,
        disabledOpacity: colorPalette.action.dark.disabledOpacity
      },
      text: colorPalette.text.dark,
      divider: colorPalette.divider.dark
    }
  } as const;

  return { ...theme[themeMode] };
}
