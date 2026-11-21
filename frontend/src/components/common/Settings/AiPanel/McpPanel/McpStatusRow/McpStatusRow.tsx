import { Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import { McpStatusRowStyled, McpStatusValueStyled } from '../McpPanel.styled';

type McpStatusRowProps = { label: string; children: ReactNode };

export default function McpStatusRow({ label, children }: McpStatusRowProps): JSX.Element {
  return (
    <McpStatusRowStyled>
      <Typography color='text.secondary' variant='caption'>
        {label}
      </Typography>
      <McpStatusValueStyled>{children}</McpStatusValueStyled>
    </McpStatusRowStyled>
  );
}