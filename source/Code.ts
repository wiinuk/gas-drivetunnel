type Primitive = undefined | null | boolean | number | string | bigint;
type Json =
    | Exclude<Primitive, undefined>
    | readonly Json[]
    | { readonly [key: string]: Json };
function error(template: TemplateStringsArray, ...args: Primitive[]): never {
    let message = template[0];
    for (let i = 1; i < template.length; i++) {
        message += String(args[i - 1]);
        message += template[i]!;
    }
    throw new Error(message);
}

type ErrorResponse = {
    type: "error";
    name: string;
    message: string;
    stack?: string;
};
type OkResponse<T extends Json> = {
    type: "success";
    value: T;
};
type JsonResponse = ErrorResponse | OkResponse<Json>;
function okResponse<T extends Json>(value: T): OkResponse<T> {
    return {
        type: "success",
        value,
    };
}
function errorResponse(error: unknown): ErrorResponse {
    if (error instanceof Error) {
        return {
            type: "error",
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    } else {
        return { type: "error", name: "", message: "unknown error" };
    }
}

type Coordinates = string;
type RouteRow = [
    type: "route",
    userId: string,
    routeId: string,
    routeName: string,
    description: string,
    note: string,
    data: string,
    coordinates: Coordinates,
];
type RouteData = Record<string, never>;
type Route = {
    type: "route";
    userId: string;
    routeId: string;
    routeName: string;
    description: string;
    note: string;
    data: RouteData;
    coordinates: Coordinates;
};
function getRoutes(userId: string) {
    const results: Route[] = [];
    const spreadsheetFile = DriveApp.getRootFolder()
        .getFilesByName("Gas-drivetunnel")
        .next();
    const sheet =
        SpreadsheetApp.open(spreadsheetFile).getSheetByName("routes") ??
        error`sheet 'routes' is not found`;

    const rows = sheet.getSheetValues(
        1,
        1,
        sheet.getLastRow(),
        sheet.getLastColumn(),
    );
    for (const row of rows) {
        const [
            type,
            rowUserId,
            routeId,
            routeName,
            description,
            note,
            data,
            coordinates,
        ]: unknown[] = row;
        if (type === "route" && String(rowUserId) === userId) {
            results.push({
                type: "route",
                userId: String(rowUserId),
                routeId: String(routeId),
                routeName: String(routeName),
                description: String(description),
                note: String(note),
                data: data === "" ? {} : JSON.parse(String(data)),
                coordinates: String(coordinates),
            });
        }
    }
    return results;
}

function dispatchGetRequest(
    path: string,
    parameters: GoogleAppsScript.RequestEvent["parameters"],
) {
    try {
        if (path === "routes") {
            const userId =
                parameters["user-id"]?.[0] ??
                error`user-id parameter is required`;

            return okResponse(getRoutes(userId));
        }
        return error`unknown path: ${path}`;
    } catch (e) {
        return errorResponse(e);
    }
}
global["doGet"] = function doGet(e) {
    Logger.log(`doGet request: ${JSON.stringify(e)}`);
    const response = dispatchGetRequest(
        e.pathInfo ?? "",
        e.parameters,
    ) satisfies JsonResponse;
    const json = JSON.stringify(response);
    Logger.log(`doGet response: ${json}`);
    return ContentService.createTextOutput(json).setMimeType(
        ContentService.MimeType.JSON,
    );
} satisfies GoogleAppsScript.RequestHandler;
