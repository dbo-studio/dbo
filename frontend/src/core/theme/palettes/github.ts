import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

const GREY = {
  0: '#FFFFFF',
  100: '#f6f8fa',
  200: '#eaecef',
  300: '#d0d7de',
  400: '#afb8c1',
  500: '#8c959f',
  600: '#6e7781',
  700: '#57606a',
  800: '#24292f',
  900: '#1f2328'
};

const PRIMARY = {
  light: '#0969DA',
  main: '#0969DA',
  dark: '#54AEFF'
};

const SECONDARY = {
  light: '#8250df',
  main: '#8250df',
  dark: '#a475f9'
};

const INFO = {
  light: '#0969DA',
  main: '#218bff',
  dark: '#54AEFF'
};

const SUCCESS = {
  light: '#2da44e',
  main: '#2da44e',
  dark: '#4ac26b'
};

const WARNING = {
  light: '#d4a72c',
  main: '#d29922',
  dark: '#e3b341'
};

const ERROR = {
  light: '#cf222e',
  main: '#d1242f',
  dark: '#ff8182'
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
  disabled: { light: '#8c959f', dark: '#6e7781' },
  constant: { white: '#FFFFFF', black: '#1f2328' },
  divider: { light: '#d0d7de', dark: '#30363d' },
  action: {
    light: {
      active: GREY[800],
      hover: '#f3f4f6',
      selected: '#dcf4ff',
      disabled: alpha(GREY[400], 0.5),
      disabledBackground: alpha(GREY[300], 0.5),
      focus: alpha(PRIMARY.main, 0.2),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[200],
      hover: '#26292f',
      selected: '#092744',
      disabled: '#6e7781',
      disabledBackground: '#26292f',
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: GREY[800],
      title: GREY[900],
      subdued: GREY[600],
      success: SUCCESS.main,
      warning: WARNING.main,
      danger: ERROR.main,
      primary: PRIMARY.main,
      secondary: SECONDARY.main,
      disabled: GREY[400],
      highlight: '#fff8c5',
      placeholder: GREY[500]
    },
    dark: {
      text: '#e6edf3',
      title: '#ffffff',
      subdued: '#848d97',
      success: '#4ac26b',
      warning: '#e3b341',
      danger: '#ff8182',
      primary: PRIMARY.dark,
      secondary: SECONDARY.dark,
      disabled: '#6e7781',
      highlight: '#26292f',
      placeholder: '#6e7781'
    }
  },
  background: {
    light: {
      primary: '#ffffff',
      subdued: '#f6f8fa',
      secondary: '#f6f8fa',
      success: '#dafbe1',
      warning: '#fff8c5',
      danger: '#ffebe9'
    },
    dark: {
      primary: '#0d1117',
      subdued: '#161b22',
      secondary: '#161b22',
      success: '#1f6e34',
      warning: '#744d0b',
      danger: '#792e2e'
    }
  }
};

export default function githubPalette(themeMode: ThemeModeEnum): Record<string, unknown> {
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
