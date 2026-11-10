import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

// No 0/O, 1/l/I: a passphrase read off the screen must not be ambiguous.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 24;

/** Random characters from the browser's CSPRNG, dropping bytes that would bias the pick. */
export const generatePassphrase = (): string => {
  const limit = 256 - (256 % ALPHABET.length);
  let out = '';
  while (out.length < GENERATED_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(GENERATED_LENGTH))) {
      if (byte < limit && out.length < GENERATED_LENGTH) out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
};

/** Rough guess-resistance in bits from length and character classes; a hint, not a guarantee. */
export const passphraseBits = (value: string): number => {
  const pool =
    (/[a-z]/.test(value) ? 26 : 0) +
    (/[A-Z]/.test(value) ? 26 : 0) +
    (/\d/.test(value) ? 10 : 0) +
    (/[^a-zA-Z\d]/.test(value) ? 33 : 0);
  // Repeated characters add little, so only distinct ones count in full.
  const effective = new Set(value).size + (value.length - new Set(value).size) / 4;
  return pool === 0 ? 0 : Math.floor(effective * Math.log2(pool));
};

const strengthOf = (bits: number): { label: string; color: string } =>
  bits < 40
    ? { label: locales.backup_passphrase_weak, color: 'error.main' }
    : bits < 70
      ? { label: locales.backup_passphrase_fair, color: 'warning.main' }
      : { label: locales.backup_passphrase_strong, color: 'success.main' };

type Props = { name: string; value: string; onChange: (value: string) => void };

/** A passphrase field that can make a strong one, shows its strength and lets it be copied. */
export default function PassphraseInput({ name, value, onChange }: Props): JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const strength = strengthOf(passphraseBits(value));

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(locales.backup_passphrase_copied);
    } catch {
      toast.error(locales.backup_passphrase_copy_failed);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FieldInput
          name={name}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          margin='none'
        />
        <Button
          size='small'
          onClick={() => {
            onChange(generatePassphrase());
            setRevealed(true);
          }}
        >
          {locales.backup_passphrase_generate}
        </Button>
        {value !== '' && (
          <Button size='small' onClick={() => void copy()}>
            {locales.copy}
          </Button>
        )}
      </Box>
      {value !== '' && (
        <Typography variant='caption' sx={{ color: strength.color }} data-testid={`${name}-strength`}>
          {strength.label}
        </Typography>
      )}
    </Box>
  );
}
