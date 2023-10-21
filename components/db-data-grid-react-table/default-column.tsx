import { ClickAwayListener, InputBase, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function DefaultColumn({
  initialValue,
  table,
  id,
  index,
  onSelect,
  row,
  selected,
}: any) {
  const [value, setValue] = useState(initialValue);
  const [showInput, setShowInput] = useState(false);

  const onBlur = () => {
    table.options.meta?.updateData(row.index, id, value);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // if (type == "date") {
  //   value = value.toISOString().substr(0, 10);
  // }

  const onClickHandler = (e: any) => {
    if (e.detail == 2) {
      table.toggleAllPageRowsSelected(false);
      setShowInput(true);
    } else if (!showInput) {
      row.toggleSelected();
    }
  };

  const clickAwayHandler = () => {
    setShowInput(false);
    // row.toggleSelected(false);
  };

  return showInput ? (
    <ClickAwayListener onClickAway={clickAwayHandler}>
      {/* <InputBase type={type} value={value} onChange={onChange} /> */}
      <InputBase value={value} />
    </ClickAwayListener>
  ) : (
    <Typography onClick={onClickHandler} variant="body1">
      {value}
    </Typography>
  );

  //   return (
  //     <Typography variant="body1">{value}</Typography>
  //     <InputBase
  //       value={value as string}
  //       onChange={(e) => setValue(e.target.value)}
  //       onBlur={onBlur}
  //     />
  //   );
}
