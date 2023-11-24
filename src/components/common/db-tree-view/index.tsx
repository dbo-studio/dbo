import Search from "../../base/search";
import TablesTreeView from "./TablesTreeView";

type Props = {};

export default function DBTreeView({}: Props) {
  return (
    <>
      <Search />
      <TablesTreeView />
    </>
  );
}
