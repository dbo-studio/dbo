import { Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import { EmptyHeadingStyled, EmptySubtitleStyled } from './EmptyHeading.styled';

type EmptyHeadingProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
};

export default function EmptyHeading({ icon, title, subtitle }: EmptyHeadingProps): JSX.Element {
  return (
    <EmptyHeadingStyled>
      {icon}
      <Typography variant='subtitle2' color='textText'>
        {title}
      </Typography>
      <EmptySubtitleStyled variant='caption' color='textSubdued'>
        {subtitle}
      </EmptySubtitleStyled>
    </EmptyHeadingStyled>
  );
}
