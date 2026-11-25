import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { SubmitButtonStyled } from '@/components/base/InlineSqlEditor/InlineBar.styled';
import {
  buildMongoQuickFilter,
  isMongoQuickFilterField,
  mongoQuickFilterTypes,
  type MongoQuickFilterType
} from '@/core/db/mongoQuery';
import locales from '@/locales';
import { Box, MenuItem, Select, TextField } from '@mui/material';
import { useState } from 'react';
import { toast } from 'sonner';

const labels: Record<MongoQuickFilterType, string> = {
  string: locales.nosql_quick_string,
  regex: locales.nosql_quick_regex,
  json: locales.nosql_quick_json,
  number: locales.nosql_quick_number,
  objectId: locales.nosql_quick_object_id,
  uuid: locales.nosql_quick_uuid
};

export default function MongoQuickFilter({ onApply, hidden }: { onApply: (query: string) => void; hidden: boolean }) {
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<MongoQuickFilterType>('string');

  return (
    <Box
      component='form'
      hidden={hidden}
      sx={{ display: hidden ? 'none' : 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}
      data-testid='mongo-quick-filter'
      onSubmit={(event) => {
        event.preventDefault();
        if ((field.trim() || value) && !isMongoQuickFilterField(field.trim())) {
          toast.error(locales.nosql_quick_invalid_field);
          return;
        }
        try {
          onApply(buildMongoQuickFilter(field, value, type));
        } catch {
          toast.error(locales.nosql_quick_invalid_value.replace('{type}', labels[type]));
        }
      }}
    >
      <TextField
        value={field}
        onChange={(event) => setField(event.target.value)}
        placeholder={locales.nosql_quick_field}
        slotProps={{ htmlInput: { 'aria-label': locales.nosql_quick_field } }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <TextField
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={locales.nosql_quick_value}
        slotProps={{ htmlInput: { 'aria-label': locales.nosql_quick_value } }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <Select
        value={type}
        inputProps={{ 'aria-label': locales.nosql_quick_type }}
        onChange={(event) => {
          const next = mongoQuickFilterTypes.find((item) => item === event.target.value);
          if (next) setType(next);
        }}
      >
        {mongoQuickFilterTypes.map((item) => (
          <MenuItem key={item} value={item}>
            {labels[item]}
          </MenuItem>
        ))}
      </Select>
      <SubmitButtonStyled variant='contained' type='submit' aria-label={locales.nosql_run} sx={{ ml: 0 }}>
        <CustomIcon type='check' size='s' />
      </SubmitButtonStyled>
    </Box>
  );
}
