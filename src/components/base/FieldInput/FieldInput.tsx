import { Box, InputBase, Typography, useTheme } from "@mui/material";

export default function FieldInput({ label, inputType }: FieldInputProps) {
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
