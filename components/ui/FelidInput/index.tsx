import { Box, InputBase, Typography, useTheme } from "@mui/material";

export type InputTypes = "string" | "number";

export interface FelidInputProps {
  label: string;
  inputType: InputTypes;
}

export default function FelidInput({ label, inputType }: FelidInputProps) {
  const theme = useTheme();

  return (
    <Box>
      <Box
        display={"flex"}
        flexDirection={"row"}
        justifyContent={"space-between"}
      >
        <Typography color={theme.palette.text.secondary} variant="caption">
          {label}
        </Typography>
        <Typography color={theme.palette.text.secondary} variant="caption">
          {inputType}
        </Typography>
      </Box>
      <InputBase
        sx={{ marginBottom: "8px" }}
        fullWidth={true}
        type={inputType}
      />
    </Box>
  );
}
