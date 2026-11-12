import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import { CONNECTION_ALIASES } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import { LogoTileStyled } from './Onboarding.styled';

// One logo per brand: many aliases share one (Aurora, RDS and others).
const LOGOS = Array.from(new Map(CONNECTION_ALIASES.map((alias) => [alias.logo, alias.name])).keys()).slice(0, 18);

/** A wall of the databases DBO opens, so the first screen says what the app is for. */
export default function WelcomeStep(): JSX.Element {
  return (
    <Box data-testid='onboarding-welcome'>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 1.25 }}>
        {LOGOS.map((logo, index) => (
          <LogoTileStyled key={logo} order={index}>
            <CustomIcon type={logo as keyof typeof IconTypes} size='l' />
          </LogoTileStyled>
        ))}
      </Box>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', pt: 1.5 }}>
        {locales.onboarding_connect_more}
      </Typography>
    </Box>
  );
}
