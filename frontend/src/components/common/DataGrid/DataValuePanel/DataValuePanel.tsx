import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import {
  bytesToHex,
  downloadBinaryCell,
  fileToBinaryCellValue,
  formatByteSize,
  hexStringToBinaryCellValue,
  imageSrcFromBase64,
  isBinaryCellValue,
  resolveValuePanelMode,
  sniffImageFromBase64,
  valueToEditorString
} from '@/core/utils/dataValue';
import { parseWkt } from '@/core/utils/wkt';
import locales from '@/locales';
import type { BinaryCellValue, ColumnType } from '@/types';
import { Box, Button, Typography } from '@mui/material';
import { type DragEvent, type JSX, useCallback, useMemo, useRef, useState } from 'react';
import {
  DataValuePanelBodyStyled,
  DataValuePanelFooterActionsStyled,
  DataValuePanelFooterStyled,
  ImageDropzoneHintStyled,
  ImageDropzonePreviewStyled,
  ImageDropzoneStyled,
  VisuallyHiddenInputStyled
} from './DataValuePanel.styled';
import GeometryMap from './GeometryMap';

export type ValuePanelMode = 'text' | 'json' | 'hex' | 'image' | 'geometry';

export type DataValueEditorProps = {
  value: unknown;
  column?: ColumnType;
  editable: boolean;
  width?: number;
  height?: number;
  onApply?: (next: unknown) => void;
  showApply?: boolean;
};

/** Soft warning when replacing with a large image (still allowed). */
const IMAGE_WARN_BYTES = 8 * 1024 * 1024;

function editorStateKey(value: unknown, mappedType: string | undefined): string {
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
  width = 360,
  height = 320,
  onApply,
  showApply = true
}: DataValueEditorProps): JSX.Element {
  const mode = useMemo(() => resolveValuePanelMode(value, column?.mappedType), [value, column?.mappedType]);
  const sourceKey = editorStateKey(value, column?.mappedType);
  const binary = isBinaryCellValue(value) ? value : null;
  const hexView = useMemo(() => bytesToHex(binary?.base64), [binary?.base64]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stateKey, setStateKey] = useState(sourceKey);
  const [draft, setDraft] = useState(() =>
    mode === 'hex' ? bytesToHex(isBinaryCellValue(value) ? value.base64 : undefined).hex : valueToEditorString(value)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [hexError, setHexError] = useState<string | null>(null);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  /** Pending replace; `null` sentinel means clear to NULL. `undefined` = no pending change. */
  const [pendingImage, setPendingImage] = useState<BinaryCellValue | null | undefined>(undefined);

  if (stateKey !== sourceKey) {
    setStateKey(sourceKey);
    setDraft(
      mode === 'hex' ? bytesToHex(isBinaryCellValue(value) ? value.base64 : undefined).hex : valueToEditorString(value)
    );
    setJsonError(null);
    setHexError(null);
    setGeometryError(null);
    setImageError(null);
    setImageWarning(null);
    setPendingImage(undefined);
    setIsDragOver(false);
  }

  const displayBinary: BinaryCellValue | null =
    pendingImage === undefined ? binary : pendingImage === null ? null : pendingImage;
  const hasPendingImage = pendingImage !== undefined;
  const canEditTextOrJson = editable && (mode === 'text' || mode === 'json') && !binary;
  const canEditGeometry = editable && mode === 'geometry' && !binary;
  const missingBase64 = Boolean(binary && !binary.base64 && binary.length > 0);
  const canEditHex =
    editable && mode === 'hex' && Boolean(binary) && !hexView.truncated && Boolean(binary?.base64) && !missingBase64;
  const canEditImage = editable && mode === 'image' && hasPendingImage;
  const canEdit = canEditTextOrJson || canEditHex || canEditImage || canEditGeometry;
  const canClearNull = editable && mode === 'image' && column?.notNull !== true;

  const stageImage = useCallback((next: BinaryCellValue): void => {
    setPendingImage(next);
    setImageError(null);
    if (next.length > IMAGE_WARN_BYTES) {
      setImageWarning(locales.large_file_warning.replace('{{size}}', formatByteSize(next.length)));
    } else if (!sniffImageFromBase64(next.base64)) {
      setImageWarning(locales.file_not_image_warning);
    } else {
      setImageWarning(null);
    }
  }, []);

  const handleReplaceFile = useCallback(
    async (file: File | undefined): Promise<void> => {
      if (!file) {
        return;
      }
      try {
        const next = await fileToBinaryCellValue(file);
        stageImage(next);
      } catch {
        setImageError(locales.could_not_read_file);
      }
    },
    [stageImage]
  );

  const handleDragOver = useCallback((event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      const file = event.dataTransfer.files?.[0];
      void handleReplaceFile(file);
    },
    [handleReplaceFile]
  );

  const handleApply = (): void => {
    if (!canEdit || !onApply) {
      return;
    }
    if (mode === 'image') {
      if (pendingImage === undefined) {
        return;
      }
      onApply(pendingImage);
      return;
    }
    if (mode === 'hex') {
      const next = hexStringToBinaryCellValue(draft);
      if (!next) {
        setHexError(locales.invalid_hex);
        return;
      }
      setHexError(null);
      onApply(next);
      return;
    }
    if (mode === 'geometry') {
      const parsed = parseWkt(draft);
      if (!parsed || parsed.type === 'unsupported') {
        setGeometryError(locales.invalid_geometry_wkt);
        return;
      }
      setGeometryError(null);
      onApply(draft);
      return;
    }
    if (mode === 'json') {
      try {
        const parsed: unknown = JSON.parse(draft);
        setJsonError(null);
        onApply(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : locales.invalid_json);
      }
      return;
    }
    onApply(draft);
  };

  const editorHeight = Math.max(height - 56, 180);
  const previewSrc = displayBinary?.base64 ? imageSrcFromBase64(displayBinary.base64) : null;
  const showImageFooter = mode === 'image';
  const showTextFooter = showApply && onApply && editable && canEdit && mode !== 'image';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <DataValuePanelBodyStyled data-testid={`value-panel-body-${mode}`}>
        {mode === 'hex' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {missingBase64 || hexView.truncated ? (
              <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
                {locales.binary_too_large_to_edit}
              </Typography>
            ) : binary ? (
              canEditHex ? (
                <CodeEditor
                  width={width}
                  height={Math.max(editorHeight - 8, 140)}
                  value={draft}
                  onChange={(v): void => setDraft(v ?? '')}
                  editable
                  language='text'
                />
              ) : (
                <Box sx={{ p: 1, overflow: 'auto', flex: 1, fontFamily: 'monospace', fontSize: 12 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{hexView.hex || '(empty)'}</pre>
                </Box>
              )
            ) : (
              <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
                {locales.open_binary_for_hex}
              </Typography>
            )}
          </Box>
        )}

        {mode === 'image' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ImageDropzoneStyled
              drag={isDragOver}
              clickable={editable}
              role={editable ? 'button' : undefined}
              tabIndex={editable ? 0 : undefined}
              data-testid='value-panel-image-dropzone'
              onClick={(): void => {
                if (editable) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(e): void => {
                if (editable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={editable ? handleDragOver : undefined}
              onDragLeave={editable ? handleDragLeave : undefined}
              onDrop={editable ? handleDrop : undefined}
            >
              {previewSrc ? (
                <ImageDropzonePreviewStyled src={previewSrc} alt='binary' />
              ) : (
                <ImageDropzoneHintStyled>
                  <Typography color='textText' variant='body2'>
                    {editable ? (
                      <>
                        {locales.drag_and_drop_file}{' '}
                        <Box component='span' sx={{ color: 'primary.main' }}>
                          {locales.browse}
                        </Box>
                      </>
                    ) : (
                      locales.no_image_payload
                    )}
                  </Typography>
                  {pendingImage === null && (
                    <Typography color='text.secondary' variant='caption'>
                      {locales.null_click_apply_to_clear}
                    </Typography>
                  )}
                </ImageDropzoneHintStyled>
              )}
              {editable && (
                <VisuallyHiddenInputStyled
                  ref={fileInputRef}
                  type='file'
                  accept='image/png,image/jpeg,image/gif,image/webp,image/*'
                  data-testid='value-panel-image-file'
                  onClick={(e): void => {
                    e.stopPropagation();
                  }}
                  onChange={(e): void => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void handleReplaceFile(file);
                  }}
                />
              )}
            </ImageDropzoneStyled>
          </Box>
        )}

        {mode === 'geometry' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
            <Box sx={{ flex: 1, minHeight: 160 }}>
              <GeometryMap wkt={draft} height='100%' />
            </Box>
            <CodeEditor
              width={width}
              height={Math.min(140, Math.max(editorHeight * 0.35, 100))}
              value={draft}
              onChange={(v): void => {
                setDraft(v ?? '');
                setGeometryError(null);
              }}
              editable={canEditGeometry}
              language='text'
            />
          </Box>
        )}

        {(mode === 'text' || mode === 'json') && (
          <CodeEditor
            width={width}
            height={editorHeight}
            value={draft}
            onChange={(v): void => setDraft(v ?? '')}
            editable={canEditTextOrJson}
            language={mode === 'json' ? 'json' : 'text'}
          />
        )}
      </DataValuePanelBodyStyled>

      {jsonError && (
        <Typography variant='caption' color='error' sx={{ px: 1, pb: 0.5 }}>
          {jsonError}
        </Typography>
      )}
      {hexError && (
        <Typography variant='caption' color='error' sx={{ px: 1, pb: 0.5 }}>
          {hexError}
        </Typography>
      )}
      {geometryError && (
        <Typography variant='caption' color='error' sx={{ px: 1, pb: 0.5 }}>
          {geometryError}
        </Typography>
      )}
      {imageError && (
        <Typography variant='caption' color='error' sx={{ px: 1, pb: 0.5 }}>
          {imageError}
        </Typography>
      )}
      {imageWarning && (
        <Typography variant='caption' color='warning.main' sx={{ px: 1, pb: 0.5 }}>
          {imageWarning}
        </Typography>
      )}

      {showImageFooter && (
        <DataValuePanelFooterStyled data-testid='value-panel-image-footer'>
          <Typography variant='caption' color='text.secondary' data-testid='value-panel-image-size'>
            {displayBinary
              ? `${formatByteSize(displayBinary.length)}${hasPendingImage ? ' · pending Apply' : ''}`
              : pendingImage === null
                ? 'NULL'
                : 'No image'}
          </Typography>
          <DataValuePanelFooterActionsStyled>
            {displayBinary?.base64 && (
              <Button
                size='small'
                variant='outlined'
                data-testid='value-panel-image-download'
                onClick={(): void => downloadBinaryCell(displayBinary, column?.name)}
              >
                {locales.download}
              </Button>
            )}
            {canClearNull && (
              <Button
                size='small'
                variant='text'
                color='warning'
                data-testid='value-panel-image-clear'
                onClick={(): void => {
                  setPendingImage(null);
                  setImageWarning(null);
                  setImageError(null);
                }}
              >
                {locales.clear}
              </Button>
            )}
            {showApply && onApply && canEditImage && (
              <Button size='small' variant='contained' onClick={handleApply} data-testid='value-panel-apply'>
                {locales.apply}
              </Button>
            )}
          </DataValuePanelFooterActionsStyled>
        </DataValuePanelFooterStyled>
      )}

      {showTextFooter && (
        <DataValuePanelFooterStyled>
          <Button size='small' variant='contained' onClick={handleApply} data-testid='value-panel-apply'>
            {locales.apply}
          </Button>
        </DataValuePanelFooterStyled>
      )}
    </Box>
  );
}

export default DataValueEditor;
