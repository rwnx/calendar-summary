type IsUnique<A extends readonly unknown[]> = A extends readonly [
  infer X,
  ...infer Rest
]
  ? X extends Rest[number]
    ? [never, "Encountered value with duplicates:", X] // false
    : IsUnique<Rest>
  : true;
