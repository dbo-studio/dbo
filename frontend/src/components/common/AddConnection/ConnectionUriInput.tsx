import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';

import type { FormErrorProps } from '@/components/base/FormError/types';

type Props = {
  value: string;
  errors: FormErrorProps['errors'];
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onCopy: () => void;
};

/** The connection-string field of the "Connection string" mode, with its copy button. */
export default function ConnectionUriInput({
  value,
  errors,
  placeholder,
  onChange,
  onBlur,
  onCopy
}: Props): JSX.Element {
  return (
    <>
      <Box>
        <FieldInput
          name='uri'
          value={value}
          error={errors.length > 0}
          label={locales.connection_mode_uri}
          placeholder={placeholder}
          onChange={(e): void => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <FormError mb={1} errors={errors} />
      </Box>
      <Button data-testid='copy-connection-uri' onClick={onCopy}>
        {locales.copy_uri}
      </Button>
    </>
  );
}
