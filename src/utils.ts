type OptionalProperties<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};

type RequiredOptionalProperties<T> = {
  [K in keyof OptionalProperties<T>]-?: NonNullable<T[K]>;
};

type DefaultsFunction<T> = {
  [K in keyof RequiredOptionalProperties<T>]: () => RequiredOptionalProperties<T>[K];
};

export const mergeDefaults = <T extends object>(
  input: T | undefined | null,
  defaults: DefaultsFunction<T> | RequiredOptionalProperties<T>
): Required<T> => {
  const resolvedDefaults =
    typeof defaults === "function"
      ? Object.fromEntries(
          (
            Object.entries(defaults) as [
              keyof DefaultsFunction<T>,
              () => RequiredOptionalProperties<T>[keyof DefaultsFunction<T>]
            ][]
          ).map(([key, fn]) => [key, fn()])
        )
      : defaults;

  return { ...resolvedDefaults, ...(input ?? {}) } as Required<T>;
};

export type Accessor<T> = (a: T) => number;

export const sortByAccessor = <T>(accessor: Accessor<T>) => {
  return (aInput: T, bInput: T) => {
    const a = accessor(aInput);
    const b = accessor(bInput);
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    } else {
      return 0;
    }
  };
};

type CompareFn<T> = NonNullable<Parameters<Array<T>["sort"]>[0]>;
export const multiSort = <T>(...sortFns: CompareFn<T>[]) => {
  return (a: T, b: T) => {
    for (const sortFn of sortFns) {
      const result = sortFn(a, b);
      if (result != 0) {
        return result;
      }
    }
    // sorts exhausted, equal
    return 0;
  };
};