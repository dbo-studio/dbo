import { EuiButtonIcon, EuiFlexGroup, useEuiTheme } from "@elastic/eui";

export default function Actions() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiButtonIcon
        aria-label="sideLeft"
        iconType={"/icons/sideLeft.svg"}
        size={"s"}
        iconSize="m"
        color={"text"}
      />
      <EuiButtonIcon
        aria-label="sideBottom"
        iconType={"/icons/sideBottom.svg"}
        size={"s"}
        iconSize="m"
        color={"text"}
      />
      <EuiButtonIcon
        aria-label="sideRight"
        iconType={"/icons/sideRight.svg"}
        size={"s"}
        iconSize="m"
        color={"text"}
      />
    </EuiFlexGroup>
  );
}
