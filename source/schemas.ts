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

export const getRoutesUrlParametersSchema = z.strictObject({
    "user-id": z.tuple([z.string()]),
});
export const addRoutesPostDataSchema = z.array(routeSchema);
export const removeRoutesParametersSchema = getRoutesUrlParametersSchema;
export const syncRoutesParametersSchema = getRoutesUrlParametersSchema;
export const syncRoutesPostDataSchema = addRoutesPostDataSchema;

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

type ParametersSchemaKind = Schema<Record<string, string[]>>;
export interface GetApiSchema {
    method: "GET";
    path: string;
    parameters: ParametersSchemaKind;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: Schema<any>;
}
interface PostApiSchema {
    method: "POST";
    path: string;
    parameters: ParametersSchemaKind;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postData: Schema<any>;
}
export type ApiSchema = GetApiSchema | PostApiSchema;

export const interfaces = {
    getRoutes: {
        method: "GET",
        path: "get-routes",
        parameters: getRoutesUrlParametersSchema,
        result: z.array(routeSchema),
    },
    addRoutes: {
        method: "POST",
        path: "add-routes",
        parameters: z.strictObject({}),
        postData: addRoutesPostDataSchema,
    },
    removeRoutes: {
        method: "POST",
        path: "remove-routes",
        parameters: removeRoutesParametersSchema,
        postData: z.never(),
    },
    syncRoutes: {
        method: "POST",
        path: "sync-routes",
        parameters: syncRoutesParametersSchema,
        postData: syncRoutesPostDataSchema,
    },
} as const satisfies Record<string, ApiSchema>;

export const requestPathSchema = z.union([
    z.literal(interfaces.getRoutes.path),
    z.literal(interfaces.addRoutes.path),
    z.literal(interfaces.removeRoutes.path),
    z.literal(interfaces.syncRoutes.path),
]);
