import { Typography } from '@mui/material';
import { Fragment, type JSX } from 'react';
import { KbdGroupStyled, KbdStyled } from './Kbd.styled';
import { KbdProps } from './types';

export default function Kbd({ commands }: KbdProps): JSX.Element {
  return (
    <KbdGroupStyled>
      {commands.map((command, index) => {
        return (
          <Fragment key={`${command}-${index}`}>
            <KbdStyled>{command}</KbdStyled>
            {index < commands.length - 1 && (
              <Typography px={0.5} color={'textSubdued'} variant='subtitle2'>
                +
              </Typography>
            )}
          </Fragment>
        );
      })}
    </KbdGroupStyled>
  );
}
