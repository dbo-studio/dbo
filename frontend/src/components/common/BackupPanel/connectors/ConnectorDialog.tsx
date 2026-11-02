import api from '@/api';
import type { ConnectorKind, ConnectorRequestType, ConnectorType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { CONNECTOR_TYPES, type ConnectorTypeSpec, specOf } from './connectorTypes';

const FORM_ID = 'connector-form';

type Props = {
  kind: ConnectorKind;
  /** Set to edit; omit to create. */
  connector?: ConnectorType;
  onClose: () => void;
  onSaved: () => void;
};

export default function ConnectorDialog({ kind, connector, onClose, onSaved }: Props): JSX.Element {
  const types = CONNECTOR_TYPES.filter((t) => t.kind === kind);
  const [spec, setSpec] = useState<ConnectorTypeSpec>(specOf(connector?.type ?? '') ?? types[0]);
  const [name, setName] = useState(connector?.name ?? '');
  const [config, setConfig] = useState<Record<string, string | number | boolean>>(connector?.config ?? {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const missing = spec.fields.some((f) => {
    if (!f.required) return false;
    return f.secret ? !secrets[f.key] && !connector?.secretsSet[f.key] : !config[f.key];
  });

  const request = (): ConnectorRequestType => ({ type: spec.type, name: name.trim(), config, secrets });

  const { mutate: test, isPending: isTesting } = useMutation({
    mutationFn: (): Promise<void> => api.backup.testConnectorDraft(kind, connector?.id ?? 0, request()),
    onSuccess: () => toast.success(locales.connector_test_ok)
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (): Promise<ConnectorType> => {
      return connector
        ? api.backup.updateConnector(kind, connector.id, request())
        : api.backup.createConnector(kind, request());
    },
    onSuccess: onSaved
  });

  const setConfigValue = (key: string, value: string | number | boolean): void =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={
        connector
          ? locales.connector_edit
          : kind === 'destination'
            ? locales.connector_add_destination
            : locales.connector_add_channel
      }
      footer={
        <>
          {/* Drive needs a saved record to authorize against, so it can only be tested after saving. */}
          {spec.type !== 'gdrive' && (
            <Button
              size='small'
              onClick={() => test()}
              disabled={!name.trim() || missing || isTesting || isPending}
              data-testid='connector-test'
            >
              {locales.connector_test}
            </Button>
          )}
          <Button size='small' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Button
            size='small'
            variant='contained'
            type='submit'
            form={FORM_ID}
            disabled={!name.trim() || missing || isPending}
            data-testid='connector-save'
          >
            {locales.save}
          </Button>
        </>
      }
    >
      <Box
        component='form'
        id={FORM_ID}
        sx={{ width: 'min(460px, calc(100vw - 64px))', display: 'flex', flexDirection: 'column', gap: 1.5 }}
        onSubmit={(event) => {
          event.preventDefault();
          mutate();
        }}
      >
        {!connector && (
          <SelectInput
            emptylabel=''
            label={locales.connector_type}
            value={spec.type}
            onChange={(e) => {
              setSpec(specOf((e as SelectInputOption).value as string) ?? spec);
              setConfig({});
              setSecrets({});
            }}
            options={types.map((t) => ({ label: t.label, value: t.type }))}
            testId='connector-type'
          />
        )}
        <Typography variant='caption' color='textSecondary'>
          {spec.description}
        </Typography>
        <FieldInput
          name='connector-name'
          label={locales.connector_name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin='none'
        />
        {spec.fields.map((field) => {
          if (field.input === 'bool') {
            return (
              <FormControlLabel
                key={field.key}
                label={field.label}
                control={
                  <Checkbox
                    checked={config[field.key] === true}
                    onChange={(e) => setConfigValue(field.key, e.target.checked)}
                  />
                }
              />
            );
          }
          if (field.input === 'select') {
            return (
              <SelectInput
                key={field.key}
                emptylabel=''
                label={field.label}
                value={String(config[field.key] ?? field.options?.[0]?.value ?? '')}
                onChange={(e) => setConfigValue(field.key, (e as SelectInputOption).value as string)}
                options={field.options ?? []}
              />
            );
          }
          if (field.secret) {
            return (
              <FieldInput
                margin='none'
                key={field.key}
                name={`connector-${field.key}`}
                type={field.input === 'textarea' ? 'text' : 'password'}
                multiline={field.input === 'textarea'}
                minRows={field.input === 'textarea' ? 3 : undefined}
                label={field.label}
                value={secrets[field.key] ?? ''}
                placeholder={connector?.secretsSet[field.key] ? locales.connector_secret_saved : undefined}
                onChange={(e) => setSecrets((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            );
          }
          return (
            <FieldInput
              margin='none'
              key={field.key}
              name={`connector-${field.key}`}
              type={field.input === 'number' ? 'number' : 'text'}
              label={field.label}
              placeholder={field.placeholder}
              value={String(config[field.key] ?? '')}
              onChange={(e) =>
                setConfigValue(field.key, field.input === 'number' ? Number(e.target.value) : e.target.value)
              }
            />
          );
        })}
        {spec.type === 'gdrive' && (
          <Typography variant='caption' color='textSecondary'>
            {locales.connector_authorize_hint}
          </Typography>
        )}
      </Box>
    </Modal>
  );
}
