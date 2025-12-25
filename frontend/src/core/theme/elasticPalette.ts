import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

const GREY = {
  0: '#FFFFFF',
  50: '#F5F7FA',
  100: '#E8ECF0',
  200: '#D3DAE6',
  300: '#BDC5D3',
  400: '#98A2B3',
  500: '#69707D',
  600: '#535966',
  700: '#343741',
  800: '#1A1D21',
  900: '#0F1114',
  950: '#000000'
};

const PRIMARY = {
  light: '#0079A5',
  main: '#0079A5',
  dark: '#00A3C4'
};

const SECONDARY = {
  light: '#343741',
  main: '#343741',
  dark: '#BDC5D3'
};

const INFO = {
  light: '#006BB4',
  main: '#006BB4',
  dark: '#1BA9F5'
};

const SUCCESS = {
  light: '#017D73',
  main: '#017D73',
  dark: '#00BFB3'
};

const WARNING = {
  light: '#F5A700',
  dark: '#FFBF00'
};

const ERROR = {
  light: '#BD271E',
  main: '#BD271E',
  dark: '#F66'
};

const colorPalette = {
  common: { black: '#000', white: '#fff' },
  primary: PRIMARY,
  secondary: SECONDARY,
  accent: PRIMARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  disabled: { light: '#98A2B3', dark: '#535966' },
  constant: { white: '#FFFFFF', black: '#000000' },
  divider: { light: '#D3DAE6', dark: '#343741' },
  action: {
    light: {
      active: GREY[600],
      hover: '#F5F7FA',
      selected: '#E8ECF0',
      disabled: alpha(GREY[400], 0.8),
      disabledBackground: alpha(GREY[400], 0.24),
      focus: alpha(PRIMARY.light, 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[600],
      hover: '#1A1D21',
      selected: '#343741',
      disabled: '#535966',
      disabledBackground: '#1A1D21',
      focus: alpha(PRIMARY.dark, 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: '#343741',
      title: '#000000',
      subdued: '#535966',
      success: '#343741',
      warning: '#343741',
      danger: '#343741',
      primary: '#0079A5',
      secondary: '#343741',
      disabled: '#98A2B3',
      highlight: '#E8ECF0',
      placeholder: '#69707D'
    },
    dark: {
      text: '#D3DAE6',
      title: '#F5F7FA',
      subdued: '#98A2B3',
      success: '#F5F7FA',
      warning: '#F5F7FA',
      danger: '#F5F7FA',
      primary: '#00A3C4',
      secondary: '#BDC5D3',
      disabled: '#535966',
      highlight: '#343741',
      placeholder: '#69707D'
    }
  },
  background: {
    light: {
      primary: '#FFFFFF',
      subdued: '#F5F7FA',
      secondary: '#E8ECF0',
      success: '#E0F2ED',
      warning: '#FFF4E0',
      danger: '#FEE2E2'
    },
    dark: {
      primary: '#0F1114',
      subdued: '#1A1D21',
      secondary: '#343741',
      success: '#014D47',
      warning: '#7D5700',
      danger: '#5D1E19'
    }
  }
};

export default function palette(themeMode: ThemeModeEnum): Record<string, unknown> {
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
