import { isBinaryCellValue, resolveValuePanelMode, valueToEditorString } from '@/core/utils/dataValue';
import { type JSX, useMemo } from 'react';
import { DataValuePanelRootStyled } from './DataValuePanel.styled';
import GeometryValueView from './GeometryValueView';
import HexValueView from './HexValueView';
import ImageValueView from './ImageValueView';
import TextValueView from './TextValueView';
import type { DataValueEditorProps } from './types';

export type { DataValueEditorProps, ValuePanelMode } from './types';

export function editorStateKey(value: unknown, mappedType: string | undefined): string {
  const mode = resolveValuePanelMode(value, mappedType);
  if (isBinaryCellValue(value)) {
    const prefix = value.base64?.slice(0, 32) ?? '';
    return `${mappedType ?? ''}:${mode}:${value.length}:${prefix}`;
  }
  return `${mappedType ?? ''}:${mode}:${valueToEditorString(value)}`;
}

export function DataValueEditor({
  value,
  column,
  editable,
  width,
  height,
  onApply,
  onCancel,
  showApply
}: DataValueEditorProps): JSX.Element {
  const mode = useMemo(() => resolveValuePanelMode(value, column?.mappedType), [value, column?.mappedType]);

  return (
    <DataValuePanelRootStyled>
      {mode === 'image' && (
        <ImageValueView
          value={value}
          column={column}
          editable={editable}
          onApply={onApply}
          onCancel={onCancel}
          showApply={showApply}
        />
      )}
      {mode === 'hex' && <HexValueView value={value} editable={editable} width={width} height={height} />}
      {mode === 'geometry' && <GeometryValueView value={value} editable={editable} width={width} height={height} />}
      {(mode === 'text' || mode === 'json') && (
        <TextValueView
          value={value}
          editable={editable}
          width={width}
          onApply={onApply}
          onCancel={onCancel}
          showApply={showApply}
          mode={mode}
        />
      )}
    </DataValuePanelRootStyled>
  );
}

export default DataValueEditor;
