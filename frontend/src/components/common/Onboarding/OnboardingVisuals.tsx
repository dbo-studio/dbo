import { CONNECTION_ALIASES } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { Box, Stack, Typography } from '@mui/material';
import type { JSX } from 'react';
import { LogoTileStyled, MockBarStyled, MockChipStyled, MockLineStyled, MockWindowStyled } from './Onboarding.styled';

const TREE = [
  { id: 'schema', w: 70, accent: true },
  { id: 'users', w: 60 },
  { id: 'orders', w: 80 },
  { id: 'items', w: 50 },
  { id: 'payments', w: 70 },
  { id: 'logs', w: 45 },
  { id: 'views', w: 65 }
];

const ROWS = [
  { id: 'r1', cells: [30, 74, 52] },
  { id: 'r2', cells: [24, 88, 40] },
  { id: 'r3', cells: [34, 66, 58] },
  { id: 'r4', cells: [28, 80, 36] },
  { id: 'r5', cells: [32, 70, 48] }
];

const CODE = [
  { id: 'c1', w: 38, accent: true },
  { id: 'c2', w: 62 },
  { id: 'c3', w: 54 },
  { id: 'c4', w: 30, accent: true },
  { id: 'c5', w: 70 }
];

// One tile per brand: many aliases share a logo (Aurora, RDS and others).
const LOGOS = Array.from(
  new Map(CONNECTION_ALIASES.map((alias) => [alias.logo, alias.name.replace(/\s*\(.*\)$/, '')])).entries()
);

function ResultGrid(): JSX.Element {
  return (
    <Box sx={{ p: 2.5, display: 'grid', gap: 1.5 }}>
      {ROWS.map((row, index) => (
        <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '0.5fr 1.2fr 0.8fr', gap: 3 }}>
          {row.cells.map((width, cell) => (
            <MockLineStyled key={`${row.id}-${width}`} w={width} accent={index === 0 && cell === 0} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function WelcomeVisual(): JSX.Element {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 640 }}>
      <MockWindowStyled>
        <MockBarStyled>
          <span />
          <span />
          <span />
        </MockBarStyled>
        <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
          <Stack spacing={1.5} sx={{ p: 2.5, borderRight: 1, borderColor: 'divider' }}>
            {TREE.map((line) => (
              <MockLineStyled key={line.id} w={line.w} accent={line.accent} />
            ))}
          </Stack>
          <Box>
            <Stack direction='row' spacing={1} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <MockChipStyled dot='info'>users</MockChipStyled>
              <MockChipStyled dot='success'>orders</MockChipStyled>
            </Stack>
            <ResultGrid />
          </Box>
        </Box>
      </MockWindowStyled>
    </Box>
  );
}

export function ConnectVisual(): JSX.Element {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 560,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: { xs: 1, md: 2 }
      }}
    >
      {LOGOS.map(([logo, name], index) => (
        <LogoTileStyled key={logo} sx={{ animationDelay: `${(index % 5) * 0.7}s` }}>
          <img src={`/icons/${logo}.svg`} alt='' draggable={false} />
          <span>{name}</span>
        </LogoTileStyled>
      ))}
      <LogoTileStyled sx={{ borderStyle: 'dashed', boxShadow: 'none' }}>
        <Typography variant='h6' color='text.secondary'>
          +
        </Typography>
        <span>{locales.onboarding_connect_more}</span>
      </LogoTileStyled>
    </Box>
  );
}

export function WorkVisual(): JSX.Element {
  return (
    <MockWindowStyled>
      <MockBarStyled>
        <span />
        <span />
        <span />
      </MockBarStyled>
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        {CODE.map((line) => (
          <MockLineStyled key={line.id} w={line.w} accent={line.accent} />
        ))}
        <Stack direction='row' spacing={1} sx={{ pt: 1 }}>
          <MockChipStyled dot='success'>128 rows</MockChipStyled>
          <MockChipStyled dot='info'>14 ms</MockChipStyled>
        </Stack>
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <ResultGrid />
      </Box>
    </MockWindowStyled>
  );
}

export function AiVisual(): JSX.Element {
  return (
    <MockWindowStyled sx={{ p: 3 }}>
      <Stack spacing={2.25}>
        <Box
          sx={{
            alignSelf: 'flex-end',
            px: 2,
            py: 1.25,
            borderRadius: '16px 16px 4px 16px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText'
          }}
        >
          <Typography variant='body2'>Which customers have not ordered this year?</Typography>
        </Box>
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <MockChipStyled dot='success'>Read schema</MockChipStyled>
          <MockChipStyled dot='success'>Ran query · 128 rows</MockChipStyled>
        </Stack>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2, display: 'grid', gap: 1.25 }}>
          <MockLineStyled w={45} accent />
          <MockLineStyled w={82} />
          <MockLineStyled w={64} />
          <Typography variant='caption' color='text.secondary' sx={{ pt: 0.5 }}>
            3 changes ready · review before applying
          </Typography>
        </Box>
      </Stack>
    </MockWindowStyled>
  );
}

export const STEP_VISUALS: Record<string, () => JSX.Element> = {
  welcome: WelcomeVisual,
  connect: ConnectVisual,
  work: WorkVisual,
  ai: AiVisual
};

export const STEP_COPY = [
  {
    id: 'welcome',
    eyebrow: locales.onboarding_welcome_eyebrow,
    title: locales.onboarding_welcome_title,
    body: locales.onboarding_welcome_body
  },
  {
    id: 'connect',
    eyebrow: locales.onboarding_connect_eyebrow,
    title: locales.onboarding_connect_title,
    body: locales.onboarding_connect_body
  },
  {
    id: 'work',
    eyebrow: locales.onboarding_work_eyebrow,
    title: locales.onboarding_work_title,
    body: locales.onboarding_work_body
  },
  {
    id: 'ai',
    eyebrow: locales.onboarding_ai_eyebrow,
    title: locales.onboarding_ai_title,
    body: locales.onboarding_ai_body
  },
  {
    id: 'theme',
    eyebrow: locales.onboarding_theme_eyebrow,
    title: locales.onboarding_theme_title,
    body: locales.onboarding_theme_body
  },
  {
    id: 'privacy',
    eyebrow: locales.onboarding_privacy_eyebrow,
    title: locales.onboarding_privacy_title,
    body: locales.onboarding_privacy_body
  },
  {
    id: 'account',
    eyebrow: locales.onboarding_account_eyebrow,
    title: locales.onboarding_account_title,
    body: locales.onboarding_account_body
  }
] as const;
