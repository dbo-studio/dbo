import { styled } from "@mui/material/styles";

export const CodeMirrorStyled = styled("div")(({ theme }) => ({
  fontSize: ${theme.typography.body2},
  fontWeight: theme.typography.fontWeightBold,
}));

const CodeMirrorStyled = styled("div")(
  ({ theme }) => {
     fontSize: ${theme.typography.body2},
  fontWeight: theme.typography.fontWeightBold,
  },
);
