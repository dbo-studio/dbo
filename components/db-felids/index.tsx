import { Box } from "@mui/material";
import FelidInput, { InputTypes } from "../ui/FelidInput";
import Search from "../ui/search";

const felids = [
  {
    label: "id",
    type: "number" as InputTypes,
  },
  {
    label: "user_id",
    type: "number" as InputTypes,
  },
  {
    label: "tracking_code",
    type: "string" as InputTypes,
  },
];

export default function DBFelids() {
  return (
    <>
      <Search />
      <Box mt={1}>
        {felids.map((item, index) => (
          <FelidInput key={index} label={item.label} inputType={item.type} />
        ))}
      </Box>
    </>
  );
}
