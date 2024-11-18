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
  light: '#07C',
  main: '#07C',
  dark: '#36A2EF'
};

const SECONDARY = {
  light: '#f04e98',
  main: '#f04e98',
  dark: '#f68fbe'
};

const INFO = {
  light: '#74CAFF',
  main: '#74CAFF',
  dark: '#36a2ef'
};

const SUCCESS = {
  light: '#00bfb3',
  main: '#00bfb3',
  dark: '#7dded8'
};

const WARNING = {
  light: '#fec514',
  dark: '#f3d371'
};

const ERROR = {
  light: '#bd271e',
  main: '#bd271e',
  dark: '#f86b63'
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
  disabled: { light: '#CCCCCC', dark: '#AAAAAA' },
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
      success: '#343741',
      warning: '#343741',
      danger: '#343741',
      primary: '#006bb8',
      secondary: '#ba3d76',
      disabled: '#a2abba',
      highlight: '#fff9e8',
      placeholder: '#69707d'
    },
    dark: {
      text: '#dfe5ef',
      title: '#dfe5ef',
      subdued: '#7a7f89',
      success: '#fff',
      warning: '#fff',
      danger: '#fff',
      primary: '#36a2ef',
      secondary: '#f68fbe',
      disabled: '#515761',
      highlight: '#2e2d25',
      placeholder: '#81858f'
    }
  },
  background: {
    light: {
      primary: '#fff',
      subdued: '#f7f8fc',
      secondary: '#FEEDF5',
      success: '#daebc2',
      warning: '#ffe18e',
      danger: '#f5a6b0'
    },
    dark: {
      primary: '#1A1C1E',
      subdued: '#25282A',
      secondary: '#343A40',
      success: '#558c3c',
      warning: '#8b6926',
      danger: '#8e2f31'
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
        default: colorPalette.background.light.primary,
        paper: colorPalette.background.light.subdued,
        neutral: colorPalette.background.light.secondary,
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
        default: colorPalette.background.dark.primary,
        paper: colorPalette.background.dark.subdued,
        neutral: colorPalette.background.dark.secondary,
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
