import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from "@elastic/eui";
import { ConnectionBox } from "@/components/layout/app-hedaer/connection-info/ConnectionBox";
import { css } from "@emotion/css";

export default function ConnectionInfo() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonIcon
            aria-label="connection"
            iconType={"/icons/connection.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
          <EuiButtonIcon
            aria-label="lock"
            iconType={"/icons/lock.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
          <EuiButtonIcon
            aria-label="database"
            iconType={"/icons/database.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <ConnectionBox />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiButtonIcon
            aria-label="refresh"
            iconType={"/icons/refresh.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
          <EuiButtonIcon
            aria-label="search"
            iconType={"/icons/search.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
          <EuiButtonIcon
            aria-label="sql"
            iconType={"/icons/sql.svg"}
            size={"s"}
            iconSize="m"
            color={"text"}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
