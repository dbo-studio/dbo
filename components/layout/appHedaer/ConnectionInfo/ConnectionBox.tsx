import { css } from "@emotion/css";

const connectionBoxStyle = css({
  background: "#E6F9F7",
  height: "32px",
  textAlign: "center",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  border: "1px solid #C0E3D9",
});

export function ConnectionBox() {
  return (
    <div className={connectionBoxStyle}>
      <span>PostgreSQL 15.1: public: orders: SQL Query</span>
    </div>
  );
}
