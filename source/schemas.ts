import { z } from "./json-schema";
import { Schema } from "./json-schema-core";

export const routeDataSchema = z.strictObject({});
export const routeSchema = z.strictObject({
    type: z.literal("route"),
    userId: z.string(),
    routeId: z.string(),
    routeName: z.string(),
    description: z.string(),
    note: z.string(),
    data: routeDataSchema,
    coordinates: z.string(),
});
export type Route = z.infer<typeof routeSchema>;

export const routeRowSchema = z.tuple([
    z.literal("route"),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
]);
export type RouteRow = z.infer<typeof routeRowSchema>;

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
        }),
        result: z.array(routeSchema),
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
        }),
        result: z.null(),
    },
    deleteRoute: {
        path: "delete-route",
        parameter: z.strictObject({
            "route-id": z.string(),
        }),
        result: z.null(),
    },
    clearRoutes: {
        path: "clear-routes",
        parameter: z.strictObject({
            "user-id": z.string(),
        }),
        result: z.null(),
    },
} as const satisfies Record<string, ApiSchema>;

export const requestPathSchema = z.union([
    z.literal(interfaces.getRoutes.path),
    z.literal(interfaces.setRoute.path),
    z.literal(interfaces.deleteRoute.path),
    z.literal(interfaces.clearRoutes.path),
]);
