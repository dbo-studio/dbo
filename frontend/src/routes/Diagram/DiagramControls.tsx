import { alpha, useTheme } from '@mui/material';
import { Controls, MiniMap } from '@xyflow/react';
import type { JSX } from 'react';
import { DiagramControlsStyled } from './DiagramControls.styled';

/** Zoom/fit controls and minimap styled to match the app theme. */
export default function DiagramControls(): JSX.Element {
  const theme = useTheme();

  return (
    <DiagramControlsStyled>
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={2}
        nodeColor={theme.palette.primary.main}
        maskColor={alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.55 : 0.65)}
      />
    </DiagramControlsStyled>
  );
}
