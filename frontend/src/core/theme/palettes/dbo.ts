import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

declare module '@mui/material/styles' {
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
  100: '#FAFAFA',
  200: '#F4F4F5',
  300: '#E4E4E7',
  400: '#D4D4D8',
  500: '#A1A1AA',
  600: '#71717A',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B'
};

const PRIMARY = {
  light: '#2563EB',
  main: '#2563EB',
  dark: '#5B9DFF'
};

const SECONDARY = {
  light: '#52525B',
  main: '#52525B',
  dark: '#A1A1AA'
};

const INFO = {
  light: '#0284C7',
  main: '#0284C7',
  dark: '#38BDF8'
};

const SUCCESS = {
  light: '#16A34A',
  main: '#16A34A',
  dark: '#4ADE80'
};

const WARNING = {
  light: '#D97706',
  main: '#D97706',
  dark: '#FBBF24'
};

const ERROR = {
  light: '#DC2626',
  main: '#DC2626',
  dark: '#F87171'
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
  divider: { light: '#E4E4E7', dark: '#2E2E33' },
  action: {
    light: {
      active: GREY[600],
      hover: '#F0F0F2',
      selected: '#E8F0FE',
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[600],
      hover: '#2A2A2F',
      selected: '#1E3354',
      disabled: '#52525B',
      disabledBackground: '#222226',
      focus: alpha(GREY[500], 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: '#27272A',
      title: '#18181B',
      subdued: '#71717A',
      success: '#27272A',
      warning: '#27272A',
      danger: '#27272A',
      primary: '#2563EB',
      secondary: '#52525B',
      disabled: '#A1A1AA',
      highlight: '#FEF9C3',
      placeholder: '#A1A1AA'
    },
    dark: {
      text: '#D4D4D8',
      title: '#F4F4F5',
      subdued: '#8B8B94',
      success: '#fff',
      warning: '#fff',
      danger: '#fff',
      primary: '#5B9DFF',
      secondary: '#A1A1AA',
      disabled: '#52525B',
      highlight: '#3B3A1F',
      placeholder: '#71717A'
    }
  },
  background: {
    light: {
      primary: '#fff',
      subdued: '#F7F7F8',
      secondary: '#F0F0F2',
      success: '#DCFCE7',
      warning: '#FEF3C7',
      danger: '#FEE2E2'
    },
    dark: {
      primary: '#1C1C1F',
      subdued: '#232326',
      secondary: '#2E2E33',
      success: '#14532D',
      warning: '#78350F',
      danger: '#7F1D1D'
    }
  }
};

export default function dboPalette(themeMode: ThemeModeEnum): Record<string, unknown> {
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
