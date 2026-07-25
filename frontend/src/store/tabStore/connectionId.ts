export const matchConnectionId = (a: string | number | undefined, b: string | number | undefined): boolean => {
  if (a == null || b == null) {
    return false;
  }

  return Number(a) === Number(b);
};
