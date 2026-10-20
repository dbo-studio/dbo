import { bytesToHex, isBinaryCellValue } from '@/core/utils/dataValue';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';
import { DataValuePanelBodyStyled } from './DataValuePanel.styled';
import { HexPreviewStyled, HexValueColumnStyled } from './HexValueView.styled';
import LazyCodeEditor from './LazyCodeEditor';
import type { DataValueEditorProps } from './types';

type HexValueViewProps = Pick<DataValueEditorProps, 'value' | 'editable' | 'width' | 'height'>;

export default function HexValueView({ value, editable, width = 360, height = 320 }: HexValueViewProps): JSX.Element {
  const binary = isBinaryCellValue(value) ? value : null;
  const hexView = useMemo(() => bytesToHex(binary?.base64), [binary?.base64]);
  const [draft, setDraft] = useState(() => bytesToHex(isBinaryCellValue(value) ? value.base64 : undefined).hex);
  const missingBase64 = Boolean(binary && !binary.base64 && binary.length > 0);
  const canEdit = editable && Boolean(binary) && !hexView.truncated && Boolean(binary?.base64) && !missingBase64;
  const editorHeight = Math.max(Math.max(height - 56, 180) - 8, 140);

  return (
    <DataValuePanelBodyStyled data-testid='value-panel-body-hex'>
      <HexValueColumnStyled>
        {missingBase64 || hexView.truncated ? (
          <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
            {locales.binary_too_large_to_edit}
          </Typography>
        ) : binary ? (
          canEdit ? (
            <LazyCodeEditor
              width={width}
              height={editorHeight}
              value={draft}
              onChange={(v): void => setDraft(v ?? '')}
              editable
              language='text'
            />
          ) : (
            <HexPreviewStyled>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{hexView.hex || '(empty)'}</pre>
            </HexPreviewStyled>
          )
        ) : (
          <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
            {locales.open_binary_for_hex}
          </Typography>
        )}
      </HexValueColumnStyled>
    </DataValuePanelBodyStyled>
  );
}
