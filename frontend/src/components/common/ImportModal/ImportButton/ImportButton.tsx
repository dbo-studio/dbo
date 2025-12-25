import locales from '@/locales';
import { Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import type { ImportButtonProps } from '../types';
import { ImportButtonStyled, VisuallyHiddenInputStyled } from './ImportButton.styles';

export default function ImportButton({ onChange }: ImportButtonProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        const syntheticEvent = {
          target: {
            files: files
          }
        } as React.ChangeEvent<HTMLInputElement>;

        setFile(files?.[0]);
        onChange(syntheticEvent);
      }
    },
    [onChange]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const targetFile = event.target.files?.[0];
      if (targetFile) {
        setFile(targetFile);
        onChange(event);
      }
    },
    [onChange]
  );

  return (
    <ImportButtonStyled
      as='label'
      tabIndex={-1}
      drag={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!file ? (
        <Typography color='textText' variant='caption'>
          {locales.drag_and_drop_file}{' '}
          <Typography color='textPrimary' variant='caption'>
            {locales.browse}
          </Typography>
        </Typography>
      ) : (
        <Typography color='textPrimary' variant='caption'>
          {file.name}
        </Typography>
      )}

      <VisuallyHiddenInputStyled accept='.sql,.json,.csv' type='file' onChange={handleChange} multiple />
    </ImportButtonStyled>
  );
}
