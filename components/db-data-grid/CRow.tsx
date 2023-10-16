import { Row } from "@table-library/react-table-library";
import CRowCell from "./CRowCell";

export default function CRow({ item, select, onChange }) {
  return (
    <Row key={item.id} item={item}>
      <CRowCell
        select={select}
        value={item.name}
        id={item.id}
        type={"text"}
        onChange={onChange}
      />
      <CRowCell
        select={select}
        value={item.deadline.toISOString().substr(0, 10)}
        id={item.id}
        type={"date"}
        onChange={onChange}
      />
      <CRowCell
        select={select}
        value={item.type}
        id={item.id}
        type={"text"}
        onChange={onChange}
      />

      <CRowCell
        select={select}
        value={item.isComplete.toString()}
        id={item.id}
        type={"text"}
        onChange={onChange}
      />

      <CRowCell
        select={select}
        value={item.nodes?.length}
        id={item.id}
        type={"text"}
        onChange={onChange}
      />
    </Row>
  );
}
