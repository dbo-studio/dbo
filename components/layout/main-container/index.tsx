import { EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import CenterContainer from "./CenterContainer";
import DBContainer from "./DBContainer";
import EndContainer from "./EndContainer";
import StartContainer from "./StartContainer";

export default function MainContainer() {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <DBContainer />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <StartContainer />
      </EuiFlexItem>
      <EuiFlexItem grow={5}>
        <CenterContainer />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EndContainer />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
