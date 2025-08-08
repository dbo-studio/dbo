import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box, Button, Checkbox, FormControl, FormControlLabel } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import * as v from 'valibot';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';
import type { ImportModalProps } from './types';

const formSchema = v.object({
  file: v.pipe(v.file()),
  format: v.pipe(v.string(), v.picklist(['sql', 'json', 'csv'])),
  continueOnError: v.boolean(),
  skipErrors: v.boolean(),
  maxErrors: v.pipe(v.number(), v.minValue(0), v.maxValue(100))
});

export function ImportModal({ show, connectionId, table, onClose }: ImportModalProps) {
  const [showProgress, setShowProgress] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const form = useForm({
    validators: {
      //@ts-ignore
      onSubmit: formSchema
    },

    onSubmit: async ({ value }) => {
      if (!value.file) return;
      const response = await api.importExport.importData({
        connectionId: connectionId,
        table,
        data: value.file,
        format: value.format,
        continueOnError: value.continueOnError,
        skipErrors: value.skipErrors,
        maxErrors: value.maxErrors
      });

      setJobId(response.jobId);
      setShowProgress(true);
      onClose();
      form.reset();

      useDataStore.getState().runQuery();
      useDataStore.getState().toggleReRunQuery();
    },
    defaultValues: {
      file: null as File | null,
      format: 'sql' as 'sql' | 'json' | 'csv',
      continueOnError: false,
      skipErrors: false,
      maxErrors: 0
    }
  });

  const getFileFormat = (fileName: string): 'sql' | 'json' | 'csv' => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'sql':
        return 'sql';
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      default:
        return 'sql';
    }
  };

  const handleCloseModal = () => {
    onClose();
    form.reset();
  };

  return (
    <>
      <Modal open={show} title={locales.import_data} onClose={() => onClose()}>
        <Box flex={1} display={'flex'} flexDirection={'column'}>
          <Box flex={1}>
            <form.Field name='file'>
              {(field) => (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type='file'
                    accept='.sql,.json,.csv'
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        field.handleChange(file);
                        // Auto-detect format based on file extension
                        const detectedFormat = getFileFormat(file.name);
                        form.setFieldValue('format', detectedFormat);
                      }
                    }}
                    style={{ display: 'none' }}
                    id='import-file-input'
                  />
                  <label htmlFor='import-file-input'>
                    <Button component='span' variant='outlined' fullWidth>
                      {field.state.value ? field.state.value.name : locales.choose_file}
                    </Button>
                  </label>
                  <FormError mb={1} errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <form.Field name='format'>
              {(field) => (
                <FormControl fullWidth margin='normal'>
                  <SelectInput
                    options={[
                      { label: 'SQL', value: 'sql' },
                      { label: 'JSON', value: 'json' },
                      { label: 'CSV', value: 'csv' }
                    ]}
                    helpertext={field.state.meta.errors.join(', ')}
                    error={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value.value)}
                    label={locales.format}
                  />
                </FormControl>
              )}
            </form.Field>

            <form.Field name='continueOnError'>
              {(field) => (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} />
                    }
                    label={locales.continue_on_error}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </>
              )}
            </form.Field>

            <form.Field name='skipErrors'>
              {(field) => (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} />
                    }
                    label={locales.skip_errors}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </>
              )}
            </form.Field>

            <form.Field name='maxErrors'>
              {(field) => (
                <>
                  <FieldInput
                    label={locales.max_errors_before_stopping}
                    type='number'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number.parseInt(e.target.value) || 0)}
                    fullWidth
                    error={field.state.meta.errors.length > 0}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </>
              )}
            </form.Field>
          </Box>
          <Box display={'flex'} mt={2} justifyContent={'space-between'}>
            <Button size='small' onClick={handleCloseModal}>
              {locales.cancel}
            </Button>
            <Button onClick={() => form.handleSubmit()} variant='contained' size='small'>
              {locales.import}
            </Button>
          </Box>
        </Box>
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
