import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { save } from '@tauri-apps/plugin-dialog';
import type React from 'react';
import { useEffect, useState } from 'react';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';
import { ExportModalContainerStyled, ExportModalFooterStyled, ExportModalPathRowStyled } from './ExportModal.styled';
import type { ExportModalProps } from './types';

export function ExportModal({ show, connectionId, query, table, onClose }: ExportModalProps) {
  const [format, setFormat] = useState('sql');
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
      .catch((e) => {
        console.debug('🚀 ~ ExportModal ~ e:', e);
      });
  }, []);

  const handleSelectFile = async () => {
    if (!save) {
      console.debug('Tauri dialog not available');
      return;
    }

    try {
      // Generate default filename based on current date and time
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      const defaultFileName = `export_${table}_${timestamp}.${format}`;

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: 'Export Files',
            extensions: [format]
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
    try {
      const response = await exportDataMutation({
        connectionId,
        table,
        query,
        format,
        savePath: isTauri ? savePath : undefined
      });

      setJobId(response?.jobId);
      setShowProgress(true);
      onClose();
    } catch (error) {
      console.debug('🚀 ~ handleExport ~ error:', error);
    }
  };

  return (
    <>
      <Modal open={show} title={locales.export_options} onClose={() => onClose()}>
        <ExportModalContainerStyled>
          <Box
            sx={{
              flex: 1
            }}
          >
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
          <ExportModalFooterStyled>
            <Button size='small' onClick={() => onClose()}>
              {locales.cancel}
            </Button>

            <Button
              onClick={() => void handleExport()}
              size='small'
              variant='contained'
              disabled={isTauri && !savePath.trim()}
            >
              <span>{locales.export}</span>
            </Button>
          </ExportModalFooterStyled>
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
