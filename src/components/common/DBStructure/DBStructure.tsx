import FieldInput from '../../base/FieldInput/FieldInput';
import { DBStructureStyled } from './DBStructure.styled';
import { fakeColumn } from './makeData';

export default function DBStructure() {
  const data = fakeColumn;

  return (
    <DBStructureStyled>
      {data.map((c: any) => (
        <FieldInput label={''} />
      ))}
    </DBStructureStyled>
  );
}
