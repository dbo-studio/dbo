import { Typography } from '@mui/material';
import { Fragment, type JSX } from 'react';
import { KbdGroupStyled, KbdStyled } from './Kbd.styled';
import { KbdProps } from './types';

export default function Kbd({ commands }: KbdProps): JSX.Element {
  return (
    <KbdGroupStyled>
      {commands.map((command, index) => {
        const key = commands.slice(0, index + 1).join('+');
        return (
          <Fragment key={key}>
            <KbdStyled>{command}</KbdStyled>
            {index < commands.length - 1 && (
              <Typography
                color={'textSubdued'}
                variant='subtitle2'
                sx={{
                  px: 0.5
                }}
              >
                +
              </Typography>
            )}
          </Fragment>
        );
      })}
    </KbdGroupStyled>
  );
}
