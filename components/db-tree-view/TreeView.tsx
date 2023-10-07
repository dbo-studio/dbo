import { EuiIcon, EuiTreeView, EuiToken } from "@elastic/eui";
import { css } from "@emotion/css";

export default function TreeView() {
  const items = [
    {
      label: "Tables",
      id: "tables",
      icon: itemIcon("/icons/arrowRight.svg"),
      iconWhenExpanded: itemIcon("/icons/arrowDown.svg"),
      isExpanded: true,
      children: [
        {
          label: "Item A",
          id: "item_a",
          icon: subItemIcon("/icons/columnToken.svg"),
        },
        {
          label: "Item A",
          id: "item_a",
          icon: subItemIcon("/icons/columnToken.svg"),
        },
      ],
    },
    {
      label: "Functions",
      id: "functions",
      icon: itemIcon("/icons/arrowRight.svg"),
      iconWhenExpanded: itemIcon("/icons/arrowDown.svg"),
    },
    {
      label: "Views",
      id: "views",
      icon: itemIcon("/icons/arrowRight.svg"),
      iconWhenExpanded: itemIcon("/icons/arrowDown.svg"),
    },
    {
      label: "Materialize Views",
      id: "materialize_views",
      icon: itemIcon("/icons/arrowRight.svg"),
      iconWhenExpanded: itemIcon("/icons/arrowDown.svg"),
    },
  ];

  return (
    <div style={{ marginTop: "8px" }}>
      <EuiTreeView items={items} aria-label="DB Tree views" />
    </div>
  );
}

function itemIcon(type: string) {
  return (
    <EuiIcon
      size={"s"}
      css={{
        marginBlockEnd: "0 !important",
      }}
      type={type}
    />
  );
}

function subItemIcon(type: string) {
  return (
    <EuiIcon
      css={{
        marginTop: "3px ",
        marginBlockEnd: "0 !important",
      }}
      type={type}
    />
  );
}
