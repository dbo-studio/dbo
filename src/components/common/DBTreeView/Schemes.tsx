import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { EventFor } from '@/src/types';
import { Box, NativeSelect } from '@mui/material';
import { SchemaStyled } from './DBTreeView.styled';

export default function Schemes({ schemes }: { schemes: string[] }) {
  const uuids = useUUID(schemes.length);
  const { updateCurrentSchema, currentConnection, getCurrentSchema } = useConnectionStore();

  const handleChangeSchema = (e: EventFor<'select', 'onChange'>) => {
    const schema = currentConnection?.schemas?.filter((s: string) => s == e.target.value);
    if (!schema || schema?.length == 0) {
      return;
    }
    updateCurrentSchema(schema[0]);
  };

  return (
    <SchemaStyled>
      <Box>
        <NativeSelect size='medium' fullWidth={true} onChange={handleChangeSchema} defaultValue={getCurrentSchema()}>
          {schemes.map((s: string, index: number) => (
            <option key={uuids[index]} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </Box>
    </SchemaStyled>
  );
}
