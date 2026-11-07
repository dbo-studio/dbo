import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { save } from '@tauri-apps/plugin-dialog';
import type React from 'react';
import type { ExportContentType } from '@/api/importExport/types';
import { useEffect, useState } from 'react';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';
import { ExportModalContainerStyled, ExportModalPathRowStyled } from './ExportModal.styled';
import type { ExportModalProps } from './types';

export function ExportModal({ show, connectionId, query, table, target, onClose }: ExportModalProps) {
  const [format, setFormat] = useState('sql');
  const [content, setContent] = useState<ExportContentType>('data');
  const [showProgress, setShowProgress] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(false);
  const [savePath, setSavePath] = useState('');

  const { mutateAsync: exportDataMutation } = useMutation({
    mutationFn: api.importExport.exportData
  });

  useEffect(() => {
    tools
      .isTauri()
      .then((tauriResult) => setIsTauri(tauriResult))
      .catch(() => undefined);
  }, []);

  // A tree export covers a whole object; a grid export covers only the rows it shows.
  const multiTable = !!target;
  const label = target
    ? (target.tables?.length ?? 0) > 1
      ? `${target.tables?.length} tables`
      : (target.table ?? target.tables?.[0] ?? (target.schema || target.database))
    : table;
  // Schema (DDL) only exists in sql files.
  const showContent = multiTable && format === 'sql';
  // Several tables as csv/json cannot share one file, so the backend zips them.
  const fileExtension = multiTable && format !== 'sql' ? 'zip' : format;

  const handleSelectFile = async () => {
    if (!save) {
      return;
    }

    try {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      const defaultFileName = `export_${label}_${timestamp}.${fileExtension}`;

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: 'Export Files',
            extensions: [fileExtension]
          }
        ]
      });

      if (filePath) {
        setSavePath(filePath);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleExport = async () => {
    if (isTauri && !savePath.trim()) {
      return;
    }

    try {
      const response = await exportDataMutation({
        connectionId,
        ...(target
          ? {
              scope: target.kind === 'table' ? 'tables' : target.kind === 'schema' ? 'schema' : 'database',
              tables:
                target.kind === 'table' ? (target.tables ?? (target.table ? [target.table] : undefined)) : undefined,
              database: target.database || undefined,
              schema: target.schema || undefined,
              content: showContent ? content : undefined
            }
          : { table, query }),
        format,
        savePath: isTauri ? savePath : undefined
      });

      setJobId(response?.jobId);
      setShowProgress(true);
      onClose();
    } catch {
      /* ignored */
    }
  };

  return (
    <>
      <Modal open={show} title={locales.export_options} onClose={() => onClose()}>
        <ExportModalContainerStyled
          component='form'
          onSubmit={(e): void => {
            e.preventDefault();
            e.stopPropagation();
            void handleExport();
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            <Typography variant='caption' color='textSecondary' component='p' data-testid='export-scope-hint'>
              {target ? locales[`export_hint_${target.kind}` as const] : locales.export_hint_result}
            </Typography>
            <SelectInput
              emptylabel={locales.no_column_found}
              value={format}
              onChange={(e) => setFormat((e as SelectInputOption)?.value as string)}
              label={locales.format}
              options={[
                { label: 'SQL', value: 'sql' },
                { label: 'JSON', value: 'json' },
                { label: 'CSV', value: 'csv' }
              ]}
            />

            {showContent && (
              <SelectInput
                emptylabel={locales.no_column_found}
                value={content}
                onChange={(e) => setContent((e as SelectInputOption)?.value as ExportContentType)}
                label={locales.export_content}
                options={[
                  { label: locales.export_content_data, value: 'data' },
                  { label: locales.export_content_schema, value: 'schema' },
                  { label: locales.export_content_both, value: 'both' }
                ]}
              />
            )}

            {isTauri && (
              <ExportModalPathRowStyled>
                <Box sx={{ flex: 1 }}>
                  <FieldInput
                    onClick={() => void handleSelectFile()}
                    fullWidth
                    label={locales.save_path}
                    value={savePath}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSavePath(e.target.value)}
                    placeholder={locales.enter_file_path_or_click_browse}
                    endAdornment={<CustomIcon type='ellipsisVertical' onClick={() => void handleSelectFile()} />}
                  />
                </Box>
              </ExportModalPathRowStyled>
            )}
          </Box>
          <ModalFooter>
            <Button type='button' size='small' onClick={() => onClose()}>
              {locales.cancel}
            </Button>

            <Button type='submit' size='small' variant='contained' disabled={isTauri && !savePath.trim()}>
              <span>{locales.export}</span>
            </Button>
          </ModalFooter>
        </ExportModalContainerStyled>
      </Modal>
      <JobProgressModal
        open={showProgress}
        jobId={jobId}
        onClose={() => setShowProgress(false)}
        title={locales.exporting_data}
      />
    </>
  );
}
