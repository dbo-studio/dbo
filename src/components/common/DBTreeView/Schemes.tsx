import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { EventFor } from '@/src/types';
import { Box, NativeSelect } from '@mui/material';
import { SchemaStyled } from './DBTreeView.styled';

export default function Schemes({ schemes }: { schemes: string[] }) {
  const uuids = useUUID(schemes.length);
  const { currentConnection, updateCurrentConnection } = useConnectionStore();

  const handleChangeSchema = (e: EventFor<'select', 'onChange'>) => {
    const schema = currentConnection?.schemas?.filter((s: string) => s == e.target.value);
    if (!currentConnection || !schema || schema?.length == 0) {
      return;
    }

    currentConnection.current_schema = schema[0];
    updateCurrentConnection(currentConnection);
  };

  return (
    <SchemaStyled>
      <Box>
        <NativeSelect
          size='medium'
          fullWidth={true}
          onChange={handleChangeSchema}
          defaultValue={currentConnection?.schemas}
        >
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
