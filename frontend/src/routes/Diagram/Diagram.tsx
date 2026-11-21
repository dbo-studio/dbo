'use no memo';

import { ReactFlowProvider } from '@xyflow/react';
import type { JSX } from 'react';
import DiagramCanvas from './DiagramCanvas/DiagramCanvas';
import '@xyflow/react/dist/style.css';

export default function Diagram(): JSX.Element {
  return (
    <ReactFlowProvider>
      <DiagramCanvas />
    </ReactFlowProvider>
  );
}
