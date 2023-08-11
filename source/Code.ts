import {
    ErrorResponse,
    Route,
    RouteRow,
    requestPathSchema,
    routeDataSchema,
    routeRowSchema,
    interfaces,
} from "./schemas";

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

function openRoutesSpreadsheet() {
    const spreadsheetFile = DriveApp.getRootFolder()
        .getFilesByName("Routes")
        .next();
    return (
        SpreadsheetApp.open(spreadsheetFile).getSheetByName("routes") ??
        error`sheet 'routes' is not found`
    );
}
const getRoutes = (global["getRoutes"] = function (userId: string): Route[] {
    const result: Route[] = [];
    const sheet = openRoutesSpreadsheet();
    if (!(1 <= sheet.getLastRow())) {
        return result;
    }
    const rows = sheet.getSheetValues(
        1,
        1,
        sheet.getLastRow(),
        sheet.getLastColumn(),
    );
    for (const row of rows) {
        if (row[0] === "route" && row[1] === userId) {
            const [
                type,
                rowUserId,
                routeId,
                routeName,
                description,
                note,
                data,
                coordinates,
            ] = routeRowSchema.parse(row);
            result.push({
                type,
                userId: rowUserId,
                routeId,
                routeName,
                description,
                note,
                data: routeDataSchema.parse(JSON.parse(data)),
                coordinates,
            });
        }
    }
    return result;
});

function deleteRowsBy(filter: (row: unknown[]) => boolean) {
    const sheet = openRoutesSpreadsheet();
    const lastColumn = sheet.getLastColumn();
    for (let i = sheet.getLastRow(); i !== 0; i--) {
        const rowRange = sheet.getRange(i, 1, 1, lastColumn);
        const row = rowRange.getValues()[0] ?? error`internal error`;
        if (filter(row)) {
            rowRange.deleteCells(SpreadsheetApp.Dimension.ROWS);
        }
    }
}
const deleteRoute = (global["deleteRoute"] = function (routeId: string) {
    deleteRowsBy(([type, , id]) => type === "route" && id === routeId);
    return null;
});
const clearRoutes = (global["deleteRoutes"] = function (userId: string) {
    deleteRowsBy(([type, id]) => type === "route" && id === userId);
    return null;
});
const setRoute = (global["setRoute"] = function (route: Route) {
    deleteRoute(route.routeId);

    const sheet = openRoutesSpreadsheet();
    const row = [
        route.type,
        route.userId,
        route.routeId,
        route.routeName,
        route.description,
        route.note,
        JSON.stringify(route.data),
        route.coordinates,
    ] satisfies RouteRow;
    sheet.appendRow(row);
    return null;
});

function dispatchRequest(
    path: string,
    parameter: GoogleAppsScript.RequestEvent["parameter"],
) {
    try {
        const functionName = requestPathSchema.parse(path);
        switch (functionName) {
            case "get-routes": {
                const { "user-id": userId } =
                    interfaces.getRoutes.parameter.parse(parameter);
                return okResponse(getRoutes(userId));
            }
            case "set-route": {
                const {
                    type,
                    "user-id": userId,
                    "route-id": routeId,
                    "route-name": routeName,
                    description,
                    note,
                    coordinates,
                } = interfaces.setRoute.parameter.parse(parameter);
                return okResponse(
                    setRoute({
                        type,
                        userId,
                        routeId,
                        routeName,
                        description,
                        note,
                        coordinates,
                        data: {},
                    }),
                );
            }
            case "delete-route": {
                const { "route-id": routeId } =
                    interfaces.deleteRoute.parameter.parse(parameter);
                return okResponse(deleteRoute(routeId));
            }
            case "clear-routes": {
                const { "user-id": userId } =
                    interfaces.clearRoutes.parameter.parse(parameter);
                return okResponse(clearRoutes(userId));
            }
            default: {
                throw new Error(
                    `invalid path: ${functionName satisfies never}`,
                );
            }
        }
    } catch (e) {
        return errorResponse(e);
    }
}

function doRequest(type: "GET" | "POST", e: GoogleAppsScript.RequestEvent) {
    Logger.log(`${type} request: ${JSON.stringify(e)}`);
    const result = dispatchRequest(
        e.pathInfo ?? "",
        e.parameter,
    ) satisfies JsonResponse;

    let response = JSON.stringify(result);
    let mimeType = ContentService.MimeType.JSON;
    const callbackName = e.parameters["jsonp-callback"]?.[0];
    if (callbackName != null) {
        // TODO: \u2028, \u2029 の問題
        response = `globalThis[${JSON.stringify(callbackName)}](${response})`;
        mimeType = ContentService.MimeType.JAVASCRIPT;
    }

    Logger.log(`${type} response: ${response}`);
    return ContentService.createTextOutput(response).setMimeType(mimeType);
}
global["doGet"] = ((e) =>
    doRequest("GET", e)) satisfies GoogleAppsScript.RequestHandler;

global["doPost"] = ((e) =>
    doRequest("POST", e)) satisfies GoogleAppsScript.RequestHandler;

global["sandbox"] = function () {
    function route(
        userId: string,
        routeId: string,
        routeName: string,
        coordinates: string,
    ): Route {
        return {
            type: "route",
            userId,
            routeId,
            routeName,
            description: "",
            note: "",
            coordinates,
            data: {},
        };
    }
    clearRoutes("user789012");
    const routes = [
        route(
            "user789012",
            "route789012",
            "京都駅から清水寺まで",
            "34.9855,135.7586,34.9949,135.7850",
        ),
        route(
            "user345678",
            "route345678",
            "ニューヨークのセントラルパークを一周する",
            "40.7681,-73.9819,40.7829,-73.9654,40.7968,-73.9493,40.7819,-73.9345,40.7671,-73.9490",
        ),
        route(
            "user901234",
            "route901234",
            "パリのエッフェル塔からルーブル美術館まで",
            "48.8584,2.2945,48.8606,2.3376",
        ),
        route(
            "user345678",
            "route567890",
            "ロンドンのビッグベンからタワーブリッジまで",
            "51.5007,-0.1246,51.5055,-0.0754",
        ),
        route(
            "user789012",
            "route234567",
            "シドニーのオペラハウスからハーバーブリッジまで",
            "-33.8568,151.2153,-33.8523,151.2108",
        ),
        route(
            "user678901",
            "route678901",
            "カイロのピラミッドからスフィンクスまで",
            "29.9792,31.1342,29.9753,31.1376",
        ),
    ];
    for (const route of routes) {
        setRoute(route);
    }
};
