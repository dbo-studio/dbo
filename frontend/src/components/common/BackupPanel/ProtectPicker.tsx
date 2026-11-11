import locales from '@/locales';
import { Box, Button, Chip, Switch, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import PassphraseInput from './PassphraseInput';
import Segmented from './Segmented';

/** Compression and encryption. Turning encryption on asks for the passphrase right there. */
export default function ProtectPicker({
  compress,
  onCompress,
  alreadyEncrypted,
  encrypt,
  onEncrypt,
  passphrase,
  onPassphrase,
  verifyRestore,
  onVerifyRestore
}: {
  compress: boolean;
  onCompress: (on: boolean) => void;
  /** The saved schedule already encrypts. That cannot be turned off, only re-keyed. */
  alreadyEncrypted: boolean;
  encrypt: boolean;
  onEncrypt: (on: boolean) => void;
  passphrase: string;
  onPassphrase: (value: string) => void;
  verifyRestore: boolean;
  onVerifyRestore: (on: boolean) => void;
}): JSX.Element {
  const [rekey, setRekey] = useState(false);
  const askForPassphrase = encrypt && (!alreadyEncrypted || rekey);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Switch checked={compress} onChange={(e) => onCompress(e.target.checked)} data-testid='protect-compress' />
        <Box>
          <Typography variant='body2'>{locales.backup_compress}</Typography>
          <Typography variant='caption' color='textSubdued'>
            {locales.backup_protect_compress_hint}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Switch
          checked={verifyRestore}
          onChange={(e) => onVerifyRestore(e.target.checked)}
          data-testid='protect-drill'
        />
        <Box>
          <Typography variant='body2'>{locales.backup_protect_drill}</Typography>
          <Typography variant='caption' color='textSubdued'>
            {locales.backup_protect_drill_hint}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Segmented
          testId='protect-encrypt'
          value={encrypt ? 'on' : 'off'}
          onChange={(v) => onEncrypt(v === 'on')}
          options={[
            { value: 'off', label: locales.backup_off, disabled: alreadyEncrypted },
            { value: 'on', label: locales.backup_protect_encrypt }
          ]}
        />
        {alreadyEncrypted && !rekey && (
          <>
            <Chip color='success' label={locales.backup_encrypted} />
            <Button onClick={() => setRekey(true)}>{locales.backup_protect_change}</Button>
          </>
        )}
      </Box>

      {askForPassphrase && (
        <>
          <PassphraseInput name='job-passphrase' value={passphrase} onChange={onPassphrase} />
          <Typography variant='caption' color='warning.main'>
            {locales.backup_encrypt_warning}
          </Typography>
        </>
      )}
    </>
  );
}
