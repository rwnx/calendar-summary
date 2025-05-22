type OptionalProperties<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};

type DefaultProperties<T> = Required<{
  [K in keyof OptionalProperties<T>]: NonNullable<T[K]>;
}>;
