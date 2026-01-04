import type { ThemeModeEnum } from '@/core/enums';
import { alpha } from '@mui/material';

const GREY = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E4E4E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
  950: '#09090B'
};

const PRIMARY = {
  light: '#0F172A',
  main: '#0F172A',
  dark: '#F8FAFC'
};

const SECONDARY = {
  light: '#64748B',
  main: '#64748B',
  dark: '#CBD5E1'
};

const INFO = {
  light: '#0EA5E9',
  main: '#0EA5E9',
  dark: '#38BDF8'
};

const SUCCESS = {
  light: '#10B981',
  main: '#10B981',
  dark: '#34D399'
};

const WARNING = {
  light: '#F59E0B',
  dark: '#FBBF24'
};

const ERROR = {
  light: '#EF4444',
  main: '#EF4444',
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
  disabled: { light: '#A1A1AA', dark: '#52525B' },
  constant: { white: '#FFFFFF', black: '#09090B' },
  divider: { light: '#E4E4E7', dark: '#27272A' },
  action: {
    light: {
      active: GREY[600],
      hover: '#F4F4F5',
      selected: '#F1F5F9',
      disabled: alpha(GREY[400], 0.8),
      disabledBackground: alpha(GREY[400], 0.24),
      focus: alpha(PRIMARY.light, 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    },
    dark: {
      active: GREY[600],
      hover: '#27272A',
      selected: '#18181B',
      disabled: '#52525B',
      disabledBackground: '#27272A',
      focus: alpha(PRIMARY.dark, 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48
    }
  },
  text: {
    light: {
      text: '#09090B',
      title: '#09090B',
      subdued: '#52525B',
      success: '#09090B',
      warning: '#09090B',
      danger: '#09090B',
      primary: '#0F172A',
      secondary: '#64748B',
      disabled: '#A1A1AA',
      highlight: '#F1F5F9',
      placeholder: '#71717A'
    },
    dark: {
      text: '#FAFAFA',
      title: '#FAFAFA',
      subdued: '#A1A1AA',
      success: '#FAFAFA',
      warning: '#FAFAFA',
      danger: '#FAFAFA',
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      disabled: '#52525B',
      highlight: '#27272A',
      placeholder: '#71717A'
    }
  },
  background: {
    light: {
      primary: '#FFFFFF',
      subdued: '#FAFAFA',
      secondary: '#F4F4F5',
      success: '#D1FAE5',
      warning: '#FEF3C7',
      danger: '#FEE2E2'
    },
    dark: {
      primary: '#09090B',
      subdued: '#18181B',
      secondary: '#27272A',
      success: '#065F46',
      warning: '#78350F',
      danger: '#991B1B'
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
