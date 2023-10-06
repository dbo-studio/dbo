import { EuiButtonIcon, EuiFlexGroup, useEuiTheme } from "@elastic/eui";

export default function Leading() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiButtonIcon
        aria-label="user"
        iconType={"/icons/user.svg"}
        size={"s"}
        iconSize="m"
        color={"text"}
      />
      <EuiButtonIcon
        aria-label="setting"
        iconType={"/icons/settings.svg"}
        size={"s"}
        iconSize="m"
        color={"text"}
      />
    </EuiFlexGroup>
  );
}
