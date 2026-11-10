import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { isMysqlDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';
import ImportButton from './ImportButton/ImportButton';
import { ImportModalBodyStyled, ImportModalContainerStyled } from './ImportModal.styled';
import type { ImportFormat, ImportModalProps } from './types';
import { autoMapping, mappingProblem } from './mapping';

const formatFromName = (fileName: string): ImportFormat => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension === 'json' || extension === 'csv' ? extension : 'sql';
};

const quote = (engine: string | undefined, name: string): string =>
  isMysqlDriver(engine) ? `\`${name.replaceAll('`', '``')}\`` : `"${name.replaceAll('"', '""')}"`;

const STEPS = [locales.import_step_file, locales.import_step_mapping, locales.import_step_options];

export function ImportModal({ show, connectionId, table, onClose }: ImportModalProps) {
  const engine = useConnectionStore((s) => s.connections?.find((c) => c.id === connectionId)?.type);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat>('sql');
  const [delimiter, setDelimiter] = useState(',');
  const [preview, setPreview] = useState<{ columns: string[]; rows: string[][]; totalRows: number } | null>(null);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [continueOnError, setContinueOnError] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);
  const [maxErrors, setMaxErrors] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  const { mutateAsync: importData, isPending } = useMutation({ mutationFn: api.importExport.importData });

  useEffect(() => {
    if (show) return;
    setStep(0);
    setFile(null);
    setPreview(null);
    setMapping({});
  }, [show]);

  // Step 1 -> 2: read the file and the table's columns, then guess the mapping by name.
  const loadMapping = async () => {
    if (!file) return;
    try {
      const [read, target] = await Promise.all([
        api.importExport.previewImport(file, format, format === 'csv' ? delimiter : undefined),
        api.query.runRawQuery({ connectionId, query: `SELECT * FROM ${quote(engine, table)} WHERE 1 = 0` })
      ]);
      const names = target.columns.map((c) => c.name);
      setPreview(read);
      setTableColumns(names);
      setMapping(autoMapping(read.columns, names));
      setStep(1);
    } catch {
      toast.error(locales.import_preview_failed);
    }
  };

  const run = async () => {
    if (!file) return;
    const response = await importData({
      connectionId,
      table,
      data: file,
      format,
      delimiter: format === 'csv' ? delimiter : undefined,
      mapping,
      continueOnError,
      skipErrors,
      maxErrors
    });
    setJobId(response.jobId);
    setShowProgress(true);
    onClose();
    await useDataStore.getState().runQuery();
    useDataStore.getState().toggleReRunQuery();
  };

  const problem = preview ? mappingProblem(mapping) : null;
  const canNext = step === 0 ? file !== null : step === 1 ? problem === null : true;

  return (
    <>
      <Modal
        open={show}
        title={`${locales.import_data} · ${STEPS[step]} (${step + 1}/${STEPS.length})`}
        onClose={onClose}
      >
        <ImportModalContainerStyled
          component='form'
          onSubmit={(e): void => {
            e.preventDefault();
            if (step === 0) void loadMapping();
            else if (step === 1) setStep(2);
            else void run();
          }}
        >
          <ImportModalBodyStyled>
            {step === 0 && (
              <>
                <ImportButton
                  onChange={(event) => {
                    const picked = event.target.files?.[0];
                    if (!picked) return;
                    setFile(picked);
                    setFormat(formatFromName(picked.name));
                  }}
                />
                <SelectInput
                  options={[
                    { label: 'SQL', value: 'sql' },
                    { label: 'JSON', value: 'json' },
                    { label: 'CSV', value: 'csv' }
                  ]}
                  value={format}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  onChange={(option) => setFormat(option.value as ImportFormat)}
                  label={locales.format}
                />
                {format === 'csv' && (
                  <FieldInput
                    label={locales.import_delimiter}
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value.slice(0, 1))}
                    fullWidth
                  />
                )}
              </>
            )}

            {step === 1 && preview && (
              <Box data-testid='import-mapping'>
                <Typography variant='body2' color='textSubdued' gutterBottom>
                  {locales.import_rows_found.replace('{count}', String(preview.totalRows))}
                </Typography>
                {preview.columns.map((col, i) => (
                  <Box key={col} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                    <Box>
                      <Typography variant='body2'>{col}</Typography>
                      <Typography variant='caption' color='textSubdued' noWrap>
                        {preview.rows.map((r) => r[i]).join(' · ')}
                      </Typography>
                    </Box>
                    <SelectInput
                      testId={`import-map-${col}`}
                      options={[
                        { label: locales.import_skip_column, value: '' },
                        ...tableColumns.map((name) => ({ label: name, value: name }))
                      ]}
                      value={mapping[col] ?? ''}
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      onChange={(option) => setMapping({ ...mapping, [col]: option.value as string })}
                    />
                  </Box>
                ))}
                {problem && (
                  <Typography variant='body2' color='error'>
                    {problem === 'none' ? locales.import_no_mapping : locales.import_duplicate_target}
                  </Typography>
                )}
              </Box>
            )}

            {step === 2 && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox checked={continueOnError} onChange={(e) => setContinueOnError(e.target.checked)} />
                  }
                  label={locales.continue_on_error}
                />
                <FormControlLabel
                  control={<Checkbox checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />}
                  label={locales.skip_errors}
                />
                <FieldInput
                  label={locales.max_errors_before_stopping}
                  type='number'
                  value={maxErrors}
                  onChange={(e) => setMaxErrors(Math.min(100, Math.max(0, Number.parseInt(e.target.value) || 0)))}
                  fullWidth
                />
              </>
            )}
          </ImportModalBodyStyled>
          <ModalFooter>
            <Button type='button' size='small' onClick={onClose}>
              {locales.cancel}
            </Button>
            {step > 0 && (
              <Button type='button' size='small' onClick={() => setStep(step - 1)}>
                {locales.back}
              </Button>
            )}
            <Button type='submit' variant='contained' size='small' disabled={!canNext || isPending}>
              {step === 2 ? locales.import : locales.next}
            </Button>
          </ModalFooter>
        </ImportModalContainerStyled>
      </Modal>
      <JobProgressModal
        open={showProgress}
        jobId={jobId}
        onClose={() => setShowProgress(false)}
        title={locales.importing_data}
      />
    </>
  );
}
