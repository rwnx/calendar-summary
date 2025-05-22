type OptionalProperties<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};

type RequiredOptionalProperties<T> = {
  [K in keyof OptionalProperties<T>]-?: NonNullable<T[K]>;
};

export const mergeDefaults = <T extends object>(
  input: T | undefined | null,
  defaults: RequiredOptionalProperties<T>
): Required<T> => {
  return { ...defaults, ...(input ?? {}) } as Required<T>;
};

export type Accessor<T> = (a: T) => number;

export const sortByAccessor = <T>(
  accessorA: Accessor<T>,
  accessorB?: Accessor<T>
) => {
  accessorB = accessorB || accessorA;
  return (aInput: T, bInput: T) => {
    const a = accessorA(aInput);
    const b = accessorB(bInput);
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    } else {
      return 0;
    }
  };
};
