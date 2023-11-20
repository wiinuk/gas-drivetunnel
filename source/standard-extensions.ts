export type Primitive = undefined | null | boolean | number | string | bigint;
export type Json =
    | Exclude<Primitive, undefined>
    | readonly Json[]
    | { readonly [key: string]: Json };

export function error(
    template: TemplateStringsArray,
    ...args: Primitive[]
): never {
    let message = template[0];
    for (let i = 1; i < template.length; i++) {
        message += String(args[i - 1]);
        message += template[i]!;
    }
    throw new Error(message);
}
