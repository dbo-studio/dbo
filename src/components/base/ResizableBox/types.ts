import React, { MouseEventHandler } from "react";

export type ResizableBoxXProps = {
  direction: "rtl" | "ltr";
  width: number;
  maxWidth?: number;
  children: React.ReactNode;
};

export type ResizableToggleStyledProps = {
  direction: "rtl" | "ltr" | "ttb" | "btt";
};

export type ResizableToggleProps = {
  direction: "rtl" | "ltr" | "ttb" | "btt";
  onMouseDown: MouseEventHandler | undefined;
};
