import { ThemeModeEnum } from '@/core/enums';
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
  }
  export interface TypeText {
    default: string;
    paper: string;
    neutral?: string;
    constant?: string;
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
  light: '#0077CC',
  dark: '#103996'
};

const SECONDARY = {
  light: '#F04E98',
  dark: '#1939B7'
};

const INFO = {
  light: '#74CAFF',
  dark: '#0C53B7'
};

const SUCCESS = {
  light: '#AAF27F',
  dark: '#229A16'
};

const WARNING = {
  light: '#FEC514',
  dark: '#B78103'
};

const ERROR = {
  light: '#d32f2f',
  dark: '#d32f2f'
};

const colorPalette = {
  common: { black: '#000', white: '#fff' },
  primary: PRIMARY,
  secondary: SECONDARY,
  accent: { light: '#AD1457' },
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  light: ['#f9fafb', '#E6F1FA', '#AAAAAA'],
  dark: ['#111111', '#333333', '#666666'],
  disabled: { light: '#CCCCCC', dark: '#AAAAAA' },
  constant: { white: '#FFFFFF', black: '#222222' },
  divider: '#CCD7E1',
  action: {
    active: GREY[600],
    hover: alpha(GREY[500], 0.08),
    selected: '#dbedfa',
    disabled: alpha(GREY[500], 0.8),
    disabledBackground: alpha(GREY[500], 0.24),
    focus: alpha(GREY[500], 0.24),
    hoverOpacity: 0.08,
    disabledOpacity: 0.48
  }
};

export default function palette(themeMode: ThemeModeEnum) {
  const theme = {
    light: {
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
        default: colorPalette.light[0],
        paper: colorPalette.light[1],
        neutral: colorPalette.light[2]
      },
      text: {
        primary: colorPalette.dark[0],
        secondary: colorPalette.dark[2],
        disabled: colorPalette.disabled.light
      },
      action: {
        selected: '#dbedfa'
      }
    },
    dark: {
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
        default: colorPalette.dark[0],
        paper: colorPalette.dark[1],
        neutral: colorPalette.dark[2]
      },
      text: {
        primary: colorPalette.light[0],
        secondary: colorPalette.light[2],
        disabled: colorPalette.disabled.dark
      }
    }
  } as const;

  const constant = {
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
    gradient: {
      main: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.secondary})`,
      mainChannel: '0 0 0'
    }
  };

  return { ...theme[themeMode], ...constant };
}
