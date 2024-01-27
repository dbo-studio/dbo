import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { EventFor, SchemaType } from '@/src/types';
import { Box, NativeSelect } from '@mui/material';

export default function Schemes({ schemes }: { schemes: SchemaType[] }) {
  const uuids = useUUID(schemes.length);
  const { updateCurrentSchema, currentConnection, getCurrentSchema } = useConnectionStore();

  const handleChangeSchema = (e: EventFor<'select', 'onChange'>) => {
    const schema = currentConnection?.database.schemes.filter((s: SchemaType) => s.name == e.target.value);
    if (!schema || schema?.length == 0) {
      return;
    }
    updateCurrentSchema(schema[0]);
  };

  return (
    <Box>
      <NativeSelect
        size='medium'
        fullWidth={true}
        onChange={handleChangeSchema}
        defaultValue={getCurrentSchema()?.name}
      >
        {schemes.map((s: SchemaType, index: number) => (
          <option key={uuids[index]} value={s.name}>
            {s.name}
          </option>
        ))}
      </NativeSelect>
    </Box>
  );
}
