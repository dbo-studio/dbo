import { Box, InputAdornment, InputBase } from "@mui/material";
import { ChangeEvent, useState } from "react";
import Icon from "../icon/Index";

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
            <Icon type="search" />
          </InputAdornment>
        }
      />
    </Box>
  );
}
