import { EuiFieldNumber, EuiFieldSearch, useEuiTheme } from "@elastic/eui";
import { ChangeEvent, useState } from "react";

export default function Search() {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState("");

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("search input e", e.target.value);
    setValue(e.target.value);
  };

  return (
    <EuiFieldSearch
      compressed={true}
      placeholder="Placeholder text"
      value={value}
      onChange={(e) => onChange(e)}
      aria-label="Use aria labels when no actual label is in use"
    />
  );
}
