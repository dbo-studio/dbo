import { Box, InputAdornment, InputBase } from "@mui/material";
import { ChangeEvent, useState } from "react";
import CustomIcon from "../CustomIcon/CustomIcon";

export default function Search() {
  const [value, setValue] = useState("");

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("search input e", e.target.value);
    setValue(e.target.value);
  };

  return (
    <Box mt={1}>
      <InputBase
        fullWidth={true}
        placeholder="Search"
        startAdornment={
          <InputAdornment position="start">
            <CustomIcon type="search" height={12} width={12} />
          </InputAdornment>
        }
      />
    </Box>
  );
}
