import Image from "next/image";
import { IconProps } from "./types";

const sizes = {
  l: {
    width: 30,
    height: 30,
  },
  m: {
    width: 24,
    height: 24,
  },
  s: {
    width: 16,
    height: 16,
  },
  xs: {
    width: 11,
    height: 11,
  },
};

export default function CustomIcon({
  type,
  size = "s",
  width,
  height,
  onClick,
}: IconProps) {
  var w = sizes[size].width;
  var h = sizes[size].height;

  if (width) {
    w = width;
  }
  if (height) {
    h = height;
  }

  return (
    <Image
      onClick={onClick}
      src={`/icons/${type}.svg`}
      alt={type}
      width={w}
      height={h}
    />
  );
}
