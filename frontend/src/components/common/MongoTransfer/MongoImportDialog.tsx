import api from '@/api';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { JobProgressModal } from '@/components/common/JobProgressModal/JobProgressModal';
import ImportButton from '@/components/common/ImportModal/ImportButton/ImportButton';
import { ImportModalBodyStyled, ImportModalContainerStyled } from '@/components/common/ImportModal/ImportModal.styled';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Format = 'json' | 'ndjson' | 'csv';
type Mode = 'stop' | 'skip' | 'replace';

const FORMATS: { value: Format; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'ndjson', label: 'NDJSON' },
  { value: 'csv', label: 'CSV' }
];

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'stop', label: locales.mongo_import_mode_stop, hint: locales.mongo_import_mode_stop_hint },
  { value: 'skip', label: locales.mongo_import_mode_skip, hint: locales.mongo_import_mode_skip_hint },
  { value: 'replace', label: locales.mongo_import_mode_replace, hint: locales.mongo_import_mode_replace_hint }
];

// A SQL import has a mapping step between these two; a document has no columns to map.
const STEPS = [locales.import_step_file, locales.import_step_options];

const formatFromName = (name: string): Format => {
  const lower = name.toLowerCase();
  return lower.endsWith('.csv') ? 'csv' : lower.endsWith('.json') ? 'json' : 'ndjson';
};

type Props = { connectionId: number; containerId: string; onClose: () => void };

/** Same wizard as the SQL import (drop box, format, steps, footer); the last step is about existing documents. */
export default function MongoImportDialog({ connectionId, containerId, onClose }: Props): JSX.Element {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>('json');
  const [mode, setMode] = useState<Mode>('stop');
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const collection = containerId.split('/').slice(1).join('/');

  const run = async (): Promise<void> => {
    if (!file) return;
    setBusy(true);
    try {
      const id = await withSafeModeRetry((confirmed) =>
        api.nosql.importFile(connectionId, containerId, file, format, confirmed, mode)
      );
      if (id !== undefined) setJobId(String(id));
    } catch {
      toast.error(locales.action_failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={jobId === null}
        size='sm'
        title={`${locales.import_data} \u00b7 ${STEPS[step]} (${step + 1}/${STEPS.length})`}
        onClose={onClose}
      >
        <ImportModalContainerStyled
          component='form'
          data-testid='mongo-import-dialog'
          onSubmit={(e): void => {
            e.preventDefault();
            if (step === 0) setStep(1);
            else void run();
          }}
        >
          <ImportModalBodyStyled>
            <Typography variant='caption' color='textSecondary' component='p'>
              {locales.mongo_import_target_hint.replace('{name}', collection)}
            </Typography>
            {step === 0 && (
              <>
                <ImportButton
                  accept='.json,.ndjson,.jsonl,.csv'
                  onChange={(event): void => {
                    const picked = event.target.files?.[0];
                    if (!picked) return;
                    setFile(picked);
                    setFormat(formatFromName(picked.name));
                  }}
                />
                <SelectInput
                  options={FORMATS}
                  value={format}
                  testId='mongo-import-format'
                  onChange={(o): void => setFormat((o as SelectInputOption).value as Format)}
                  label={locales.format}
                />
              </>
            )}
            {step === 1 && (
              <Box>
                <SelectInput
                  label={locales.mongo_import_duplicates}
                  value={mode}
                  testId='mongo-import-mode'
                  options={MODES.map(({ value, label }) => ({ value, label }))}
                  onChange={(o): void => setMode((o as SelectInputOption).value as Mode)}
                />
                <Typography variant='caption' color='textSecondary' component='p'>
                  {MODES.find((m) => m.value === mode)?.hint}
                </Typography>
              </Box>
            )}
          </ImportModalBodyStyled>
          <ModalFooter>
            <Button type='button' onClick={onClose}>
              {locales.cancel}
            </Button>
            {step > 0 && (
              <Button type='button' onClick={() => setStep(step - 1)}>
                {locales.back}
              </Button>
            )}
            <Button
              type='submit'
              variant='contained'
              disabled={(step === 0 && !file) || busy}
              data-testid={step === 0 ? 'mongo-import-next' : 'mongo-import-run'}
            >
              {step === STEPS.length - 1 ? locales.import : locales.next}
            </Button>
          </ModalFooter>
        </ImportModalContainerStyled>
      </Modal>
      {jobId !== null && <JobProgressModal open jobId={jobId} title={locales.importing_data} onClose={onClose} />}
    </>
  );
}
