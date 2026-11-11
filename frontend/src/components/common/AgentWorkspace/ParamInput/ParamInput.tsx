import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import type { QuestionParam } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { Box, InputBase, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

type ParamInputProps = {
  param: QuestionParam;
  value: string;
  onChange: (value: string) => void;
  /** Text is applied on Enter or blur; picks apply at once. */
  onCommit: (value: string) => void;
  connectionId: number;
  scope?: { database?: string; schema?: string };
  /** Fetch a field filter's values for a dropdown. Off where there is no session to ask with. */
  lookup?: boolean;
};

/** One {{filter}} of a report, drawn for its type: text, number, date, true/false, a low..high range, or a column's values. */
export default function ParamInput({
  param,
  value,
  onChange,
  onCommit,
  connectionId,
  scope,
  lookup = true
}: ParamInputProps): JSX.Element {
  const testId = `param-${param.name}`;
  const { data: fieldValues } = useQuery({
    queryKey: ['question-field-values', connectionId, scope, param.field],
    queryFn: () => api.question.getFieldValues({ connectionId, field: param.field as string, ...scope }),
    enabled: lookup && param.type === 'field' && !!param.field
  });

  const pick = (options: SelectInputOption[], emptylabel: string): JSX.Element => (
    <Box sx={{ minWidth: 180 }}>
      <SelectInput
        testId={testId}
        emptylabel={emptylabel}
        value={value}
        options={options}
        onChange={(picked) => {
          const next = ((picked as SelectInputOption | null)?.value as string | undefined) ?? '';
          onChange(next);
          onCommit(next);
        }}
      />
    </Box>
  );

  const text = (props: {
    type?: string;
    current: string;
    set: (next: string) => void;
    label: string;
    id: string;
  }): JSX.Element => (
    <InputBase
      type={props.type}
      placeholder={props.label}
      value={props.current}
      onChange={(event) => props.set(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(event) => event.key === 'Enter' && onCommit(value)}
      inputProps={{ 'aria-label': props.label, 'data-testid': props.id }}
    />
  );

  switch (param.type) {
    case 'field':
      // Without a lookup there is nothing to pick from: the value is typed, empty meaning any.
      if (!lookup) return text({ current: value, set: onChange, label: param.name, id: testId });

      return pick(
        [{ value: '', label: locales.param_any }, ...(fieldValues ?? []).map((item) => ({ value: item, label: item }))],
        param.name
      );
    case 'boolean':
      return pick(
        [
          { value: 'true', label: locales.param_true },
          { value: 'false', label: locales.param_false }
        ],
        param.name
      );
    case 'range': {
      const [low = '', high = ''] = value.split('..');
      const join = (nextLow: string, nextHigh: string): void =>
        onChange(nextLow || nextHigh ? `${nextLow}..${nextHigh}` : '');

      return (
        <Stack direction='row' spacing={0.5} data-testid={testId}>
          {text({ current: low, set: (next) => join(next, high), label: `${param.name} ≥`, id: `${testId}-low` })}
          {text({ current: high, set: (next) => join(low, next), label: `${param.name} ≤`, id: `${testId}-high` })}
        </Stack>
      );
    }
    case 'date': {
      // A date picks a whole value, so it applies like a pick.
      return (
        <InputBase
          type='date'
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onCommit(event.target.value);
          }}
          inputProps={{ 'aria-label': param.name, 'data-testid': testId }}
        />
      );
    }
    default:
      return text({
        type: param.type === 'number' ? 'number' : undefined,
        current: value,
        set: onChange,
        label: param.name,
        id: testId
      });
  }
}
