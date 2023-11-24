import FieldInput, {
  InputTypes,
} from "@/src/components/base/FieldInput/FieldInput";
import Search from "@/src/components/base/search/Search";
import { Box } from "@mui/material";

const fields = [
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

export default function DBFields() {
  return (
    <>
      <Search />
      <Box mt={1}>
        {fields.map((item, index) => (
          <FieldInput key={index} label={item.label} inputType={item.type} />
        ))}
      </Box>
    </>
  );
}
