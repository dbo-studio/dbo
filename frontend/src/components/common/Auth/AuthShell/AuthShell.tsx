import locales from '@/locales';
import { Fade, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import {
  AuthShellBackdropStyled,
  AuthShellBrandStyled,
  AuthShellFormStyled,
  AuthShellLogoStyled,
  AuthShellPanelStyled,
  AuthShellRootStyled
} from './AuthShell.styled';

const LOGO_SRC = '/app-icon/icon-512.png';

export type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthShell({ title, subtitle, children }: AuthShellProps): JSX.Element {
  return (
    <AuthShellRootStyled>
      <AuthShellBackdropStyled aria-hidden />
      <Fade in timeout={500}>
        <AuthShellPanelStyled>
          <AuthShellBrandStyled>
            <AuthShellLogoStyled src={LOGO_SRC} alt='DBO' />
            <Typography
              component='p'
              variant='subtitle2'
              sx={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                fontWeight: 600
              }}
            >
              {locales.auth_product_name}
            </Typography>
            <Typography
              component='h1'
              variant='h5'
              color='textTitle'
              sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}
            >
              {title}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 320, lineHeight: 1.5 }}>
              {subtitle}
            </Typography>
          </AuthShellBrandStyled>

          <AuthShellFormStyled>{children}</AuthShellFormStyled>
        </AuthShellPanelStyled>
      </Fade>
    </AuthShellRootStyled>
  );
}
