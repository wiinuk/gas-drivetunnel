import { z } from "./json-schema";
import { Schema } from "./json-schema-core";

const iso8601DateTimeSchema = z.regexp(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[-+]\d{2}:\d{2})?/,
);

export const routeDataSchema = z.record(z.string(), z.json());
const routePropertySchemas = {
    type: z.literal("route"),
    userId: z.string(),
    routeId: z.string(),
    routeName: z.string(),
    description: z.string(),
    note: z.string(),
    data: routeDataSchema,
    coordinates: z.string(),
};
const serverRouteSchema = z.strictObject({
    ...routePropertySchemas,
    updatedAt: iso8601DateTimeSchema,
});
export type ServerRoute = z.infer<typeof serverRouteSchema>;
export const routeSchema = z.strictObject(routePropertySchemas);
export type Route = z.infer<typeof routeSchema>;

const routeColumns = [
    z.literal("route"),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.number(),
] as const;
export const routeRowSchema = z.tuple(routeColumns);
export type RouteRow = z.infer<typeof routeRowSchema>;

export const queryRowSchema = z.tuple([z.number(), ...routeColumns]);
export type QueryRow = z.infer<typeof queryRowSchema>;

const errorResponseSchema = z.strictObject({
    type: z.literal("error"),
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

const okResponseSchema = z.strictObject({
    type: z.literal("success"),
    value: z.any(),
});

export const jsonResponseSchema = z.union([
    okResponseSchema,
    errorResponseSchema,
]);
export type JsonResponse = z.infer<typeof jsonResponseSchema>;

type ParameterSchemaKind = Schema<Record<string, string>>;
export interface GetApiSchema {
    path: string;
    parameter: ParameterSchemaKind;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: Schema<any>;
}
export type ApiSchema = GetApiSchema;

export const interfaces = {
    getRoutes: {
        path: "get-routes",
        parameter: z.strictObject({
            "user-id": z.string(),
            since: iso8601DateTimeSchema.optional(),
        }),
        result: z.strictObject({
            routes: z.array(serverRouteSchema),
        }),
    },
    setRoute: {
        path: "set-route",
        parameter: z.strictObject({
            type: z.literal("route"),
            "user-id": z.string(),
            "route-id": z.string(),
            "route-name": z.string(),
            description: z.string(),
            note: z.string(),
            coordinates: z.string(),
            data: z.string(),
        }),
        result: z.strictObject({
            /** ISO8601 */
            updatedAt: iso8601DateTimeSchema,
        }),
    },
    deleteRoute: {
        path: "delete-route",
        parameter: z.strictObject({
            "route-id": z.string(),
        }),
        result: z.strictObject({
            /** ISO8601 */
            updatedAt: iso8601DateTimeSchema,
        }),
    },
    clearRoutes: {
        path: "clear-routes",
        parameter: z.strictObject({
            "user-id": z.string(),
        }),
        result: z.strictObject({
            /** ISO8601 */
            updatedAt: iso8601DateTimeSchema,
        }),
    },
} as const satisfies Record<string, ApiSchema>;

export const requestPathSchema = z.union([
    z.literal(interfaces.getRoutes.path),
    z.literal(interfaces.setRoute.path),
    z.literal(interfaces.deleteRoute.path),
    z.literal(interfaces.clearRoutes.path),
]);
