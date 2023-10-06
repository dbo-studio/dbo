import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from "@elastic/eui";
import Leading from "./Leading";
import ConnectionInfo from "./connection-info/ConnectionInfo";
import Actions from "./Actions";
import { css } from "@emotion/css";
export default function AppHeader() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      className={css`
        padding: ${euiTheme.base}px;
      `}
    >
      <EuiFlexItem grow={2}>
        <Leading />
      </EuiFlexItem>
      <EuiFlexItem grow={8}>
        <ConnectionInfo />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <Actions />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
