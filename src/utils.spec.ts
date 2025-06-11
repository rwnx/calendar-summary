import { mergeDefaults, multiSort, sortByAccessor } from "@/utils";

describe("mergeDefaults", () => {
  it("merges simple objects with defaults", () => {
    type TestType = {
      required: string;
      optional?: number;
    };

    const defaults = { optional: 42 };
    const input = { required: "test" };

    const result = mergeDefaults(input, defaults);
    expect(result).toEqual({
      required: "test",
      optional: 42,
    });
  });

  it("overrides defaults with input values", () => {
    type TestType = {
      required: string;
      optional?: number;
    };

    const defaults = { optional: 42 };
    const input = { required: "test", optional: 100 };

    const result = mergeDefaults(input, defaults);
    expect(result).toEqual({
      required: "test",
      optional: 100,
    });
  });

  it("handles null/undefined input", () => {
    type TestType = {
      required: string;
      optional?: number;
    };

    const defaults = { optional: 42 };

    expect(mergeDefaults(null, defaults)).toEqual(defaults);
    expect(mergeDefaults(undefined, defaults)).toEqual(defaults);
  });
});

describe("sortByAccessor", () => {
  interface TestItem {
    id: number;
    value: number;
  }

  const testData: TestItem[] = [
    { id: 1, value: 10 },
    { id: 2, value: 5 },
    { id: 3, value: 20 },
  ];

  it("sorts using single accessor", () => {
    const sortFn = sortByAccessor((item: TestItem) => item.value);
    const sorted = [...testData].sort(sortFn);

    expect(sorted).toEqual([
      { id: 2, value: 5 },
      { id: 1, value: 10 },
      { id: 3, value: 20 },
    ]);
  });

  it("handles equal values", () => {
    const data: TestItem[] = [
      { id: 1, value: 10 },
      { id: 2, value: 10 },
    ];
    const sortFn = sortByAccessor((item: TestItem) => item.value);
    const sorted = [...data].sort(sortFn);

    expect(sorted).toEqual([
      { id: 1, value: 10 },
      { id: 2, value: 10 },
    ]);
  });
});

describe("multiSort", () => {
  it("handles multiple accessors in order", () => {
    const data = [
      { id: 1, value: 10, negativeValue: -10 },
      { id: 2, value: 40, negativeValue: -40 },
      { id: 3, value: 30, negativeValue: -30 },
      { id: 4, value: 20, negativeValue: -20 },
      { id: 5, value: 30, negativeValue: -50 },
    ];
    const sorted = [...data].sort(
      multiSort(
        sortByAccessor((item) => item.value),
        sortByAccessor((item) => item.negativeValue)
      )
    );

    expect(sorted).toEqual([
      { id: 1, value: 10, negativeValue: -10 },
      { id: 4, value: 20, negativeValue: -20 },
      { id: 5, value: 30, negativeValue: -50 },
      { id: 3, value: 30, negativeValue: -30 },
      { id: 2, value: 40, negativeValue: -40 },
    ]);
  });
});
