import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

const GREY = {
  0: '#FFFFFF',
  100: '#F5F5F5',
  200: '#EEEEEE',
  300: '#E0E0E0',
  400: '#BDBDBD',
  500: '#9E9E9E',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121'
};

const PRIMARY = {
  light: '#5882FA',
  main: '#1E88E5',
  dark: '#0D47A1'
};

const SECONDARY = {
  light: '#FF7EB9',
  main: '#F50057',
  dark: '#C51162'
};

const INFO = {
  light: '#3399FF',
  main: '#0277BD',
  dark: '#004C8A'
};

const SUCCESS = {
  light: '#66BB6A',
  main: '#43A047',
  dark: '#2E7D32'
};

const WARNING = {
  light: '#FFCC00',
  main: '#FF8F00',
  dark: '#E65100'
};

const ERROR = {
  light: '#EF5350',
  main: '#D32F2F',
  dark: '#B71C1C'
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
  disabled: { light: '#CCCCCC', dark: '#666666' },
  constant: { white: '#FFFFFF', black: '#222222' },
  divider: { light: '#E0E0E0', dark: '#424242' },
  action: {
    light: {
      active: GREY[700],
      hover: alpha(GREY[300], 0.24),
      selected: alpha(PRIMARY.main, 0.08),
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[300],
      hover: alpha(GREY[600], 0.24),
      selected: alpha(PRIMARY.main, 0.16),
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: GREY[900],
      title: GREY[900],
      subdued: GREY[600],
      success: SUCCESS.main,
      warning: WARNING.main,
      danger: ERROR.main,
      primary: PRIMARY.main,
      secondary: SECONDARY.main,
      disabled: GREY[500],
      highlight: '#FFF9C4',
      placeholder: GREY[500]
    },
    dark: {
      text: '#FFFFFF',
      title: '#FFFFFF',
      subdued: GREY[400],
      success: '#66BB6A',
      warning: '#FFD54F',
      danger: '#EF5350',
      primary: PRIMARY.light,
      secondary: SECONDARY.light,
      disabled: GREY[600],
      highlight: '#3E2723',
      placeholder: GREY[500]
    }
  },
  background: {
    light: {
      primary: '#FFFFFF',
      subdued: GREY[100],
      secondary: '#F5F7FA',
      success: '#E8F5E9',
      warning: '#FFFDE7',
      danger: '#FFEBEE'
    },
    dark: {
      primary: '#121212',
      subdued: '#1E1E1E',
      secondary: '#1D1D1D',
      success: '#1B5E20',
      warning: '#E65100',
      danger: '#B71C1C'
    }
  }
};

export default function materialPalette(themeMode: ThemeModeEnum): Record<string, unknown> {
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
