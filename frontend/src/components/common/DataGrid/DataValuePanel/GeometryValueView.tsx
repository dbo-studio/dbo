import { isBinaryCellValue, valueToEditorString } from '@/core/utils/dataValue';
import { type JSX, lazy, Suspense, useState } from 'react';
import { DataValuePanelBodyStyled } from './DataValuePanel.styled';
import { GeometryMapFrameStyled, GeometryValueColumnStyled } from './GeometryValueView.styled';
import LazyCodeEditor from './LazyCodeEditor';
import type { DataValueEditorProps } from './types';

const GeometryMap = lazy(() => import('./GeometryMap'));

type GeometryValueViewProps = Pick<DataValueEditorProps, 'value' | 'editable' | 'width' | 'height'>;

export default function GeometryValueView({
  value,
  editable,
  width = 360,
  height = 320
}: GeometryValueViewProps): JSX.Element {
  const [draft, setDraft] = useState(() => valueToEditorString(value));
  const editorHeight = Math.min(140, Math.max(Math.max(height - 56, 180) * 0.35, 100));

  return (
    <DataValuePanelBodyStyled data-testid='value-panel-body-geometry'>
      <GeometryValueColumnStyled>
        <GeometryMapFrameStyled>
          <Suspense fallback={null}>
            <GeometryMap wkt={draft} height='100%' />
          </Suspense>
        </GeometryMapFrameStyled>
        <LazyCodeEditor
          width={width}
          height={editorHeight}
          value={draft}
          onChange={(v): void => setDraft(v ?? '')}
          editable={editable && !isBinaryCellValue(value)}
          language='text'
        />
      </GeometryValueColumnStyled>
    </DataValuePanelBodyStyled>
  );
}
