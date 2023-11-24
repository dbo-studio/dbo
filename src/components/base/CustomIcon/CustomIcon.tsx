import Image from "next/image";

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

export default function Icon({
  type,
  size = "s",
  width,
  height,
  onClick,
}: IconProps) {
  // if (width) {
  //   sizes[size].width = width;
  // }
  // if (height) {
  //   sizes[size].height = height;
  // }

  return (
    <Image
      src={`/icons/${type}.svg`}
      alt={type}
      width={sizes[size].width}
      height={sizes[size].height}
    />
  );
}
