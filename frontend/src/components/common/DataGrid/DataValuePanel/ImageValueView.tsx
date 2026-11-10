import {
  downloadBinaryCell,
  fileToBinaryCellValue,
  formatByteSize,
  imageSrcFromBase64,
  isBinaryCellValue,
  sniffImageFromBase64
} from '@/core/utils/dataValue';
import locales from '@/locales';
import type { BinaryCellValue } from '@/types';
import { Button, Typography } from '@mui/material';
import { type DragEvent, type JSX, useCallback, useRef, useState } from 'react';
import {
  ImageBrowseLinkStyled,
  ImageDropzoneHintStyled,
  ImageDropzonePreviewStyled,
  ImageDropzoneStyled,
  ImageValueColumnStyled,
  VisuallyHiddenInputStyled
} from './ImageValueView.styled';
import {
  DataValuePanelBodyStyled,
  DataValuePanelCaptionStyled,
  DataValuePanelFooterActionsStyled,
  DataValuePanelFooterStyled
} from './DataValuePanel.styled';
import type { DataValueEditorProps } from './types';

/** Soft warning when replacing with a large image (still allowed). */
const IMAGE_WARN_BYTES = 8 * 1024 * 1024;

type ImageValueViewProps = Pick<
  DataValueEditorProps,
  'value' | 'column' | 'editable' | 'onApply' | 'onCancel' | 'showApply'
>;

export default function ImageValueView({
  value,
  column,
  editable,
  onApply,
  onCancel,
  showApply = true
}: ImageValueViewProps): JSX.Element {
  const binary = isBinaryCellValue(value) ? value : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  /** Pending replace; `null` sentinel means clear to NULL. `undefined` = no pending change. */
  const [pendingImage, setPendingImage] = useState<BinaryCellValue | null | undefined>(undefined);

  const displayBinary: BinaryCellValue | null =
    pendingImage === undefined ? binary : pendingImage === null ? null : pendingImage;
  const hasPendingImage = pendingImage !== undefined;
  const canEditImage = editable && hasPendingImage;
  const canClearNull = editable && column?.notNull !== true;
  const previewSrc = displayBinary?.base64 ? imageSrcFromBase64(displayBinary.base64) : null;

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
    if (!canEditImage || !onApply || pendingImage === undefined) {
      return;
    }
    onApply(pendingImage);
  };

  return (
    <>
      <DataValuePanelBodyStyled data-testid='value-panel-body-image'>
        <ImageValueColumnStyled>
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
                      {locales.drag_and_drop_file} <ImageBrowseLinkStyled>{locales.browse}</ImageBrowseLinkStyled>
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
        </ImageValueColumnStyled>
      </DataValuePanelBodyStyled>
      {imageError && (
        <DataValuePanelCaptionStyled variant='caption' color='error'>
          {imageError}
        </DataValuePanelCaptionStyled>
      )}
      {imageWarning && (
        <DataValuePanelCaptionStyled variant='caption' color='warning.main'>
          {imageWarning}
        </DataValuePanelCaptionStyled>
      )}
      <DataValuePanelFooterStyled data-testid='value-panel-image-footer'>
        <DataValuePanelFooterActionsStyled>
          {onCancel && (
            <Button size='small' variant='text' onClick={onCancel} data-testid='value-panel-cancel'>
              {locales.cancel}
            </Button>
          )}
          <Typography variant='caption' color='text.secondary' data-testid='value-panel-image-size'>
            {displayBinary
              ? `${formatByteSize(displayBinary.length)}${hasPendingImage ? ' · pending Apply' : ''}`
              : pendingImage === null
                ? 'NULL'
                : 'No image'}
          </Typography>
        </DataValuePanelFooterActionsStyled>
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
    </>
  );
}
