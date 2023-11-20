class AssertionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AssertionError";
    }
}
type ObjectPath = readonly (number | string)[];
function throwAssertionError(
    path: ObjectPath,
    actual: unknown,
    expected: unknown,
    actualAll: unknown,
    expectedAll: unknown,
): never {
    throw new AssertionError(
        `actual: ${actualAll}, expected: ${expectedAll}, in path: ${JSON.stringify(
            path,
        )} expected: ${expected}, actual: ${actual}`,
    );
}

function isNegativeZero(value: number) {
    return value === 0 && 1 / value < 0;
}
function isPositiveZero(value: number) {
    return value === 0 && 1 / value > 0;
}
function objectIs(value1: unknown, value2: unknown) {
    if (typeof value1 === "number" && typeof value2 === "number") {
        if (
            (isNegativeZero(value1) && isPositiveZero(value2)) ||
            (isPositiveZero(value1) && isNegativeZero(value2))
        ) {
            return false;
        }
        if (isNaN(value1) && isNaN(value2)) {
            return true;
        }
    }
    return value1 === value2;
}
function includesInArray<T>(items: T[], x: T) {
    for (let i = 0; i < items.length; i++) {
        if (objectIs(items[i], x)) {
            return true;
        }
    }
    return false;
}
type SetLike<T> = { has(x: T): boolean; add(x: T): void };
function createSetLike<T>(): SetLike<T> {
    // eslint-disable-next-line es-x/no-set
    if (typeof Set === "undefined") {
        const items: T[] = [];
        return {
            has(x) {
                return includesInArray(items, x);
            },
            add(x) {
                if (this.has(x)) {
                    return;
                }
                items.push(x);
            },
        };
    }
    // eslint-disable-next-line es-x/no-set
    return new Set<T>();
}
function assertStrictEqualCore(
    path: ObjectPath,
    actual: unknown,
    expected: unknown,
    seenA: SetLike<unknown>,
    seenE: SetLike<unknown>,
    actualAll: unknown,
    expectedAll: unknown,
) {
    if (actual === expected) {
        return;
    }
    const actualType = typeof actual;
    const expectedType = typeof expected;

    if (actualType !== expectedType) {
        return throwAssertionError(
            path,
            actual,
            expected,
            actualAll,
            expectedAll,
        );
    }
    switch (actualType) {
        case "undefined":
        case "boolean":
        case "number":
        case "bigint":
        case "string":
        case "symbol":
            return throwAssertionError(
                path,
                actual,
                expected,
                actualAll,
                expectedAll,
            );
    }
    // Array, Object
    if (
        actual != null &&
        expected != null &&
        actualType === "object" &&
        expectedType === "object"
    ) {
        if (seenA.has(actual) || seenE.has(expected)) {
            throw new AssertionError(`recursive object`);
        }
        seenA.add(actual);
        seenE.add(expected);

        if (Array.isArray(actual) && Array.isArray(expected)) {
            if (actual.length !== expected.length) {
                return throwAssertionError(
                    [...path, "length"],
                    actual,
                    expected,
                    actualAll,
                    expectedAll,
                );
            }
            for (let i = 0; i < actual.length; i++) {
                assertStrictEqualCore(
                    [...path, i],
                    actual[i],
                    expected[i],
                    seenA,
                    seenE,
                    actualAll,
                    expectedAll,
                );
            }
            return;
        }

        const actualKeys = Object.keys(actual);
        const expectedKeys = Object.keys(expected);
        for (const actualKey of actualKeys) {
            if (includesInArray(expectedKeys, actualKey)) {
                return throwAssertionError(
                    [...path, actualKey],
                    actual,
                    expected,
                    actualAll,
                    expectedAll,
                );
            }
        }
        for (const expectedKey of expectedKeys) {
            if (includesInArray(actualKeys, expectedKey)) {
                return throwAssertionError(
                    [...path, expectedKey],
                    actual,
                    expected,
                    actualAll,
                    expectedAll,
                );
            }
        }

        if (seenA.has(actual) || seenE.has(expected)) {
            throw new AssertionError(`recursive object`);
        }
        seenA.add(actual);
        seenE.add(expected);

        for (const key of expectedKeys) {
            assertStrictEqualCore(
                [...path, key],
                actual[key as keyof typeof actual],
                expected[key as keyof typeof expected],
                seenA,
                seenE,
                actualAll,
                expectedAll,
            );
        }
    }
    // TODO: Map, Set など
    throw new Error(`not implemented`);
}
function assertStrictEqual(actual: unknown, expected: unknown) {
    assertStrictEqualCore(
        [],
        actual,
        expected,
        createSetLike(),
        createSetLike(),
        actual,
        expected,
    );
}

export interface Matchers<TResult> {
    toStrictEqual<TExpected = unknown>(expected: TExpected): TResult;
}
export function expect<T>(actual: T): Matchers<T> {
    return {
        toStrictEqual(expected) {
            assertStrictEqual(actual, expected);
            return actual;
        },
    };
}
