type unreachable = never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaKind = Schema<any, SchemaParametersKind>;
type Infer<T extends SchemaKind> = T extends Schema<infer t> ? t : unreachable;
export type infer<T extends SchemaKind> = Infer<T>;

type GetSchemaParameter<T extends SchemaKind> = T extends Schema<
    infer _,
    infer p
>
    ? p
    : unreachable;

interface WeakSetLike<T extends object> {
    add(x: T): void;
    has(x: T): boolean;
}
type Path = (string | number)[];
type ValidationFunction<T> = (
    target: unknown,
    currentPath: Path,
    seen: WeakSetLike<object>,
) => T;

const pathCaches: Path[] = [];
const seenCaches: WeakSetLike<object>[] = [];

interface SchemaParametersKind {
    isOptional?: boolean;
}
// eslint-disable-next-line @typescript-eslint/ban-types
export class Schema<T, TParameters extends SchemaParametersKind = {}> {
    constructor(
        public _validate: ValidationFunction<T>,
        public _isOptional: TParameters["isOptional"] = false,
    ) {}
    parse(target: unknown) {
        const currentPath = pathCaches.pop() ?? [];
        const seen = seenCaches.pop() ?? {
            // TODO: ES5 または Rhino ランタイムは WeakMap が存在しない V8 はエラーが発生するので polyfill を使う
            add() {
                /* fake */
            },
            has() {
                return false;
            },
        };
        try {
            return this._validate(target, currentPath, seen);
        } finally {
            currentPath.length = 0;
            pathCaches.push(currentPath);
            seenCaches.push(seen);
        }
    }
    optional() {
        return optional(this);
    }
}

function wrap<T>(validate: ValidationFunction<T>) {
    return new Schema<T>(validate);
}
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
    }
    override get name() {
        return "ValidationError";
    }
}
function validationError(path: Path, expected: string, actual: string) {
    return new ValidationError(
        JSON.stringify({
            path,
            expected,
            actual,
        }),
    );
}

type ShapeToObject<TShape extends Readonly<Record<string, SchemaKind>>> = {
    -readonly [k in keyof TShape as GetSchemaParameter<
        TShape[k]
    >["isOptional"] extends true
        ? never
        : k]: Infer<TShape[k]>;
} & {
    -readonly [k in keyof TShape as GetSchemaParameter<
        TShape[k]
    >["isOptional"] extends true
        ? k
        : never]?: Infer<TShape[k]>;
} extends infer t
    ? {
          [K in keyof t]: t[K];
      }
    : unreachable;

export function strictObject<
    const TShape extends Readonly<Record<string, SchemaKind>>,
>(shape: TShape) {
    const props: [keyof TShape & string, SchemaKind][] = [];
    for (const key in shape) {
        props.push([key, shape[key]!]);
    }
    return wrap((target, path, seen) => {
        if (target === null || typeof target !== "object") {
            throw validationError(path, "object", typeof target);
        }
        if (seen.has(target)) {
            return target as ShapeToObject<TShape>;
        }
        seen.add(target);

        for (const [key, valueSchema] of props) {
            if (!(key in target)) {
                if (valueSchema._isOptional) {
                    continue;
                }
                throw validationError(path, `{ '${key}': any }`, "object");
            }
            const value = (target as { [k in keyof TShape]: unknown })[
                key as keyof TShape
            ];
            try {
                path.push(key);
                valueSchema._validate(value, path, seen);
            } finally {
                path.pop();
            }
        }
        return target as ShapeToObject<TShape>;
    });
}
type Primitive = undefined | null | boolean | number | string | bigint;
export function literal<const T extends Primitive>(value: T) {
    const json = String(literal);
    return wrap((target, path) => {
        if (target !== value) {
            throw validationError(
                path,
                json,
                typeof value === "object" ? "object" : String(target),
            );
        }
        return target as T;
    });
}

let stringSchema: Schema<string> | undefined;
export function string() {
    return (stringSchema ??= wrap((target, path) => {
        if (typeof target !== "string") {
            throw validationError(path, "string", typeof target);
        }
        return target as string;
    }));
}

type SchemasToTuple<T extends readonly SchemaKind[]> = {
    -readonly [i in keyof T]: Infer<T[i]>;
};
export function tuple<const TSchemas extends readonly SchemaKind[]>(
    schemas: TSchemas,
) {
    const anyTupleName = `[${schemas.map(() => "any").join(", ")}]`;
    return wrap((target, path, seen) => {
        if (!Array.isArray(target)) {
            throw validationError(path, "any[]", typeof target);
        }
        if (seen.has(target)) {
            return target as SchemasToTuple<TSchemas>;
        }
        seen.add(target);

        if (target.length < schemas.length) {
            const actualTypeName =
                5 < target.length
                    ? "any[]"
                    : `[${target.map(() => "any").join(", ")}]`;
            throw validationError(path, anyTupleName, actualTypeName);
        }
        for (let i = 0; i < schemas.length; i++) {
            const elementSchema = schemas[i]!;
            const element = target[i]!;
            path.push(i);
            try {
                elementSchema._validate(element, path, seen);
            } finally {
                path.pop();
            }
        }
        return target as SchemasToTuple<TSchemas>;
    });
}
export function array<const T>(elementSchema: Schema<T>) {
    return wrap((target, path, seen) => {
        if (!Array.isArray(target)) {
            throw validationError(path, "any[]", typeof target);
        }
        if (seen.has(target)) {
            return target as T[];
        }
        seen.add(target);

        for (let i = 0; i < target.length; i++) {
            const element = target[i];
            try {
                path.push(i);
                elementSchema._validate(element, path, seen);
            } finally {
                path.pop();
            }
        }
        return target as T[];
    });
}

type SchemasToUnion<T extends readonly SchemaKind[]> = {
    [i in keyof T]: Infer<T[i]>;
}[number];

const errorsCaches: string[][] = [];
export function union<const TSchemas extends readonly SchemaKind[]>(
    schemas: TSchemas,
) {
    return wrap((target, path, seen) => {
        const errors = errorsCaches.pop() ?? [];
        try {
            for (const schema of schemas) {
                try {
                    schema._validate(target, path, seen);
                    return target as SchemasToUnion<TSchemas>;
                } catch (e) {
                    if (e instanceof ValidationError) {
                        errors.push(e.message);
                    }
                }
            }
            throw new ValidationError(
                JSON.stringify({
                    path,
                    errors: errors.map((message) => JSON.parse(message)),
                }),
            );
        } finally {
            errors.length = 0;
            errorsCaches.push(errors);
        }
    });
}
let neverSchemaCache: Schema<never> | undefined;
export function never() {
    return (neverSchemaCache ??= wrap((target, path) => {
        throw validationError(path, "never", typeof target);
    }));
}
let anySchemaCache: Schema<unknown> | undefined;
export function any() {
    return (anySchemaCache ??= wrap((target) => {
        return target;
    }));
}

function optional<T>(schema: Schema<T>) {
    return new Schema<T, { isOptional: true }>(schema._validate, true);
}
