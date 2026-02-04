import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

const GREY = {
  0: '#FFFFFF',
  50: '#F9F9F9',
  100: '#F3F3F3',
  200: '#E8E8E8',
  300: '#D4D4D4',
  400: '#CECECE',
  500: '#969696',
  600: '#6A6A6A',
  700: '#525252',
  800: '#3E3E42',
  900: '#252526',
  950: '#1E1E1E'
};

const PRIMARY = {
  light: '#007ACC',
  main: '#007ACC',
  dark: '#007ACC'
};

const SECONDARY = {
  light: '#0066BF',
  main: '#9CDCFE',
  dark: '#9CDCFE'
};

const INFO = {
  light: '#007ACC',
  main: '#75BEFF',
  dark: '#75BEFF'
};

const SUCCESS = {
  light: '#16825D',
  main: '#89D185',
  dark: '#89D185'
};

const WARNING = {
  light: '#BF8803',
  dark: '#CCA700'
};

const ERROR = {
  light: '#A1260D',
  main: '#F48771',
  dark: '#F48771'
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
  disabled: { light: '#CECECE', dark: '#6E6E6E' },
  constant: { white: '#FFFFFF', black: '#222222' },
  divider: { light: '#CECECE', dark: '#3E3E42' },
  action: {
    light: {
      active: GREY[600],
      hover: '#E8E8E8',
      selected: '#E7F0FA',
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(PRIMARY.light, 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[600],
      hover: '#2A2D2E',
      selected: '#264F78',
      disabled: '#6E6E6E',
      disabledBackground: '#3E3E42',
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: '#333333',
      title: '#000000',
      subdued: '#6A6A6A',
      success: '#333333',
      warning: '#333333',
      danger: '#333333',
      primary: '#007ACC',
      secondary: '#0066BF',
      disabled: '#969696',
      highlight: '#E7F0FA',
      placeholder: '#969696'
    },
    dark: {
      text: '#CCCCCC',
      title: '#CCCCCC',
      subdued: '#858585',
      success: '#fff',
      warning: '#fff',
      danger: '#fff',
      primary: '#75BEFF',
      secondary: '#9CDCFE',
      disabled: '#6E6E6E',
      highlight: '#264F78',
      placeholder: '#6E6E6E'
    }
  },
  background: {
    light: {
      primary: '#FFFFFF',
      subdued: '#F3F3F3',
      secondary: '#E8E8E8',
      success: '#D7EDDB',
      warning: '#FDF4DC',
      danger: '#F1DFDD'
    },
    dark: {
      primary: '#1E1E1E',
      subdued: '#252526',
      secondary: '#2A2D2E',
      success: '#2D4A2D',
      warning: '#4A3D1A',
      danger: '#4A2D2D'
    }
  }
};

export default function vscodePalette(themeMode: ThemeModeEnum): Record<string, unknown> {
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
