import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

// Solarized color scheme
const SOLARIZED_BASE = {
  base03: '#002b36', // darkest blue
  base02: '#073642', // dark blue
  base01: '#586e75', // medium dark gray
  base00: '#657b83', // medium light gray
  base0: '#839496',  // medium blue-gray
  base1: '#93a1a1',  // medium blue-gray light
  base2: '#eee8d5',  // off white
  base3: '#fdf6e3',  // off white
  yellow: '#b58900',
  orange: '#cb4b16',
  red: '#dc322f',
  magenta: '#d33682',
  violet: '#6c71c4',
  blue: '#268bd2',
  cyan: '#2aa198',
  green: '#859900'
};

const PRIMARY = {
  light: SOLARIZED_BASE.blue,
  main: SOLARIZED_BASE.blue,
  dark: '#1a6ca6'
};

const SECONDARY = {
  light: SOLARIZED_BASE.violet,
  main: SOLARIZED_BASE.violet,
  dark: '#5a5fc4'
};

const INFO = {
  light: SOLARIZED_BASE.cyan,
  main: SOLARIZED_BASE.cyan,
  dark: '#1f8a7f'
};

const SUCCESS = {
  light: SOLARIZED_BASE.green,
  main: SOLARIZED_BASE.green,
  dark: '#6b7f00'
};

const WARNING = {
  light: SOLARIZED_BASE.yellow,
  main: SOLARIZED_BASE.yellow,
  dark: '#9c7100'
};

const ERROR = {
  light: SOLARIZED_BASE.red,
  main: SOLARIZED_BASE.red,
  dark: '#b52522'
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
  grey: {
    0: SOLARIZED_BASE.base3,
    50: SOLARIZED_BASE.base2,
    100: SOLARIZED_BASE.base1,
    200: SOLARIZED_BASE.base0,
    300: SOLARIZED_BASE.base00,
    400: SOLARIZED_BASE.base01,
    500: SOLARIZED_BASE.base01,
    600: SOLARIZED_BASE.base02,
    700: SOLARIZED_BASE.base02,
    800: SOLARIZED_BASE.base03,
    900: SOLARIZED_BASE.base03
  },
  disabled: { light: SOLARIZED_BASE.base01, dark: SOLARIZED_BASE.base00 },
  constant: { white: SOLARIZED_BASE.base3, black: SOLARIZED_BASE.base03 },
  divider: { light: SOLARIZED_BASE.base01, dark: SOLARIZED_BASE.base02 },
  action: {
    light: {
      active: SOLARIZED_BASE.base03,
      hover: alpha(SOLARIZED_BASE.blue, 0.1),
      selected: alpha(SOLARIZED_BASE.blue, 0.2),
      disabled: alpha(SOLARIZED_BASE.base01, 0.8),
      disabledBackground: alpha(SOLARIZED_BASE.base01, 0.2),
      focus: alpha(SOLARIZED_BASE.blue, 0.2),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: SOLARIZED_BASE.base3,
      hover: alpha(SOLARIZED_BASE.blue, 0.15),
      selected: alpha(SOLARIZED_BASE.blue, 0.25),
      disabled: SOLARIZED_BASE.base00,
      disabledBackground: SOLARIZED_BASE.base02,
      focus: alpha(SOLARIZED_BASE.base0, 0.2),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: SOLARIZED_BASE.base03,
      title: SOLARIZED_BASE.base03,
      subdued: SOLARIZED_BASE.base01,
      success: SUCCESS.main,
      warning: WARNING.main,
      danger: ERROR.main,
      primary: PRIMARY.main,
      secondary: SECONDARY.main,
      disabled: SOLARIZED_BASE.base01,
      highlight: SOLARIZED_BASE.yellow,
      placeholder: SOLARIZED_BASE.base01
    },
    dark: {
      text: SOLARIZED_BASE.base0,
      title: SOLARIZED_BASE.base1,
      subdued: SOLARIZED_BASE.base00,
      success: SUCCESS.main,
      warning: WARNING.main,
      danger: ERROR.main,
      primary: PRIMARY.light,
      secondary: SECONDARY.light,
      disabled: SOLARIZED_BASE.base00,
      highlight: SOLARIZED_BASE.base02,
      placeholder: SOLARIZED_BASE.base00
    }
  },
  background: {
    light: {
      primary: SOLARIZED_BASE.base3,
      subdued: SOLARIZED_BASE.base2,
      secondary: SOLARIZED_BASE.base1,
      success: '#f0f8e0',
      warning: '#fdf6e3',
      danger: '#fff5f4'
    },
    dark: {
      primary: SOLARIZED_BASE.base03,
      subdued: SOLARIZED_BASE.base02,
      secondary: SOLARIZED_BASE.base01,
      success: SOLARIZED_BASE.base02,
      warning: SOLARIZED_BASE.base02,
      danger: SOLARIZED_BASE.base02
    }
  }
};

export default function solarizedPalette(themeMode: ThemeModeEnum): Record<string, unknown> {
  const theme = {
    light: {
      primary: {
        main: colorPalette.primary.main,
        light: colorPalette.primary.light,
        dark: colorPalette.primary.dark
      },
      secondary: {
        main: colorPalette.secondary.main,
        light: colorPalette.secondary.light,
        dark: colorPalette.secondary.dark
      },
      accent: {
        main: colorPalette.accent.main
      },
      white: {
        main: colorPalette.constant.white
      },
      black: {
        main: colorPalette.constant.black
      },
      error: {
        main: colorPalette.error.main,
        light: colorPalette.error.light,
        dark: colorPalette.error.dark
      },
      warning: {
        main: colorPalette.warning.main,
        light: colorPalette.warning.light,
        dark: colorPalette.warning.dark
      },
      success: {
        main: colorPalette.success.main,
        light: colorPalette.success.light,
        dark: colorPalette.success.dark
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
        main: colorPalette.primary.main,
        light: colorPalette.primary.light,
        dark: colorPalette.primary.dark
      },
      secondary: {
        main: colorPalette.secondary.main,
        light: colorPalette.secondary.light,
        dark: colorPalette.secondary.dark
      },
      accent: {
        main: colorPalette.accent.main
      },
      white: {
        main: colorPalette.constant.white
      },
      black: {
        main: colorPalette.constant.black
      },
      error: {
        main: colorPalette.error.main,
        light: colorPalette.error.light,
        dark: colorPalette.error.dark
      },
      warning: {
        main: colorPalette.warning.main,
        light: colorPalette.warning.light,
        dark: colorPalette.warning.dark
      },
      success: {
        main: colorPalette.success.main,
        light: colorPalette.success.light,
        dark: colorPalette.success.dark
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