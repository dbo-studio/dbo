import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { type ChangeEvent, type JSX, useId, useRef } from 'react';

import { FieldInputInputStyled, FieldInputLabelRowStyled } from '@/components/base/FieldInput/FieldInput.styled';

type SSLCertFieldProps = {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  onChange: (value: string) => void;
};

export default function SSLCertField({
  name,
  label,
  value,
  placeholder,
  hint,
  onChange
}: SSLCertFieldProps): JSX.Element {
  const theme = useTheme();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      onChange(content.trim());
    } catch (error) {
      console.debug('🚀 ~ SSLCertField ~ handleFileChange ~ error:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
      <FieldInputLabelRowStyled>
        <Typography color='textText' variant='caption'>
          {label}
        </Typography>
        <Button
          size='small'
          variant='text'
          color='inherit'
          startIcon={<CustomIcon type='import' size='xs' />}
          onClick={(): void => fileInputRef.current?.click()}
          sx={{
            minWidth: 0,
            px: 0.5,
            py: 0,
            fontSize: theme.typography.caption.fontSize,
            textTransform: 'none'
          }}
        >
          {locales.ssl_load_file}
        </Button>
      </FieldInputLabelRowStyled>

      <input
        id={inputId}
        ref={fileInputRef}
        type='file'
        accept='.pem,.crt,.cer,.key,.txt,text/plain'
        hidden
        onChange={(e): void => {
          void handleFileChange(e);
        }}
      />

      <FieldInputInputStyled
        name={name}
        value={value}
        multiline
        minRows={4}
        maxRows={10}
        spellCheck={false}
        autoComplete='off'
        placeholder={placeholder}
        onChange={(e): void => onChange(e.target.value)}
        sx={{
          height: 'auto',
          minHeight: 96,
          alignItems: 'flex-start',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: theme.typography.caption.fontSize,
          lineHeight: 1.5,
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          '& textarea': {
            resize: 'vertical',
            overflow: 'auto !important',
            '&::placeholder': {
              color: theme.palette.text.placeholder,
              opacity: 1
            }
          }
        }}
      />
    </Box>
  );
}
