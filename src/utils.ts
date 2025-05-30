export const requireNonNullable = <T>(
  item: T,
  name = "unknown"
): item is NonNullable<T> => {
  if (item == null || item == undefined) {
    throw new Error(`Missing required item: ${name}`);
  }

  return true;
};
