// spell-checker: ignore datetime ARRAYFORMULA
import { expect } from "./assertion";
import { z } from "./json-schema";
import {
    ErrorResponse,
    Route,
    RouteRow,
    requestPathSchema,
    routeDataSchema,
    interfaces,
    ServerRoute,
    queryRowSchema,
} from "./schemas";
import Json = z.Json;

function withScriptLock<T>(process: () => T) {
    let lock;
    try {
        lock = LockService.getScriptLock();
        while (!lock.tryLock(2000));
        return process();
    } finally {
        lock?.releaseLock();
    }
}
function getFirstFileByName(fileName: string) {
    const iterator = DriveApp.getFilesByName(fileName);
    return iterator.hasNext() ? iterator.next() : undefined;
}
function writeLogToFile(logFileName: string) {
    const content = Logger.getLog();
    const mimeType = MimeType.PLAIN_TEXT;

    const file = getFirstFileByName(logFileName);
    if (file) {
        if (file.getMimeType() === mimeType) {
            file.setContent(content);
            return;
        }
        DriveApp.removeFile(file);
    }
    DriveApp.createFile(logFileName, Logger.getLog(), MimeType.PLAIN_TEXT);
}
function withLogFile<T>(logFileName: string, process: () => T) {
    try {
        return process();
    } finally {
        writeLogToFile(logFileName);
    }
}

function dateToSqlUTCDateTime(date: Date) {
    return `${date.getUTCFullYear()}-${
        date.getUTCMonth() + 1
    }-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}.${date.getUTCMilliseconds()}`;
}
function toSheetStringLiteral(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
}
function toSheetSheetNameLiteral(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}
function toSqlStringLiteral(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}
function buildTemplate(
    template: TemplateStringsArray,
    parameters: readonly string[],
) {
    let result = template[0]!;
    for (let i = 0; i < parameters.length; i++) {
        result += parameters[i]! + template[i + 1]!;
    }
    return result;
}
/**
 * SQL クエリ式に文字列リテラルとしてパラメータを埋め込む
 * @example ```js
 * spl`${new Date(0)}` === "datetime '1970-01-01 00:00:00'"
 * ```
 */
function sql(
    template: TemplateStringsArray,
    ...parameters: (string | Date | number)[]
) {
    return buildTemplate(
        template,
        parameters.map((p) => {
            return typeof p === "string"
                ? toSqlStringLiteral(p)
                : typeof p === "number"
                ? String(p)
                : `datetime ${toSqlStringLiteral(dateToSqlUTCDateTime(p))}`;
        }),
    );
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

function createStore(
    fileName: string,
    resultSheetName: string,
    querySheetName: string,
) {
    function openRoutesSpreadsheet() {
        const spreadsheetFile = DriveApp.getRootFolder()
            .getFilesByName(fileName)
            .next();

        const spreadsheet = SpreadsheetApp.open(spreadsheetFile);
        const routesSheet =
            spreadsheet.getSheetByName(resultSheetName) ??
            spreadsheet.insertSheet(resultSheetName);
        const querySheet =
            spreadsheet.getSheetByName(querySheetName) ??
            spreadsheet.insertSheet(querySheetName);
        return {
            routesSheet,
            querySheet,
        };
    }
    function evaluateRoutesQuery(query: string) {
        const { routesSheet, querySheet } = openRoutesSpreadsheet();
        const routeSheetName = routesSheet.getName();

        // 日時として扱われる数値が混じるとクエリ結果が空になる時があるので、
        // TO_PURE_NUMBER で日時として扱われない数値に変換する。
        querySheet
            .getRange(1, 1)
            .setValue(
                `=QUERY({ARRAYFORMULA(ROW(${toSheetSheetNameLiteral(
                    routeSheetName,
                )}!A:Z)), ARRAYFORMULA(TO_PURE_NUMBER(${toSheetSheetNameLiteral(
                    routeSheetName,
                )}!A:Z))}, ${toSheetStringLiteral(query)})`,
            );

        let results: unknown[][];
        if (querySheet.getRange(1, 1).getDisplayValue() === "#N/A") {
            results = [];
        } else {
            results = querySheet.getSheetValues(
                1,
                1,
                querySheet.getLastRow(),
                querySheet.getLastColumn(),
            );
        }
        querySheet.getRange(1, 1).clearContent();
        return { routesSheet, querySheet, results };
    }
    function getRoutes(userId: string, since?: Date) {
        since ??= new Date(0);
        const routes: ServerRoute[] = [];
        const { results } = evaluateRoutesQuery(
            sql`select * where Col2 = 'route' and Col3 = ${userId} and Col10 > ${since.getTime()} order by Col10`,
        );
        for (const row of results) {
            const [
                ,
                type,
                rowUserId,
                routeId,
                routeName,
                description,
                note,
                data,
                coordinates,
                updatedAtTime,
            ] = queryRowSchema.parse(row);
            routes.push({
                type,
                userId: rowUserId,
                routeId,
                routeName,
                description,
                note,
                data: routeDataSchema.parse(JSON.parse(data)),
                coordinates,
                updatedAt: new Date(updatedAtTime).toISOString(),
            });
        }
        return { routes };
    }
    function deleteRowsByQuery(query: string) {
        const { routesSheet, results } = evaluateRoutesQuery(query);
        const sortedRowNumbers = results
            .map((r) => queryRowSchema.parse(r)[0])
            .sort((a, b) => b - a);

        const lastColumn = routesSheet.getLastColumn();
        for (const rowNumber of sortedRowNumbers) {
            routesSheet
                .getRange(rowNumber, 1, 1, lastColumn)
                .deleteCells(SpreadsheetApp.Dimension.ROWS);
        }
    }
    function deleteRoute(routeId: string) {
        deleteRowsByQuery(
            sql`select * where Col2 = 'route' and Col4 = ${routeId}`,
        );
        return {
            updatedAt: new Date(Date.now()).toISOString(),
        };
    }
    function clearRoutes(userId: string) {
        deleteRowsByQuery(
            sql`select * where Col2 = 'route' and Col3 = ${userId}`,
        );
        return {
            updatedAt: new Date(Date.now()).toISOString(),
        };
    }
    function setRoute(route: Route) {
        deleteRoute(route.routeId);

        const { routesSheet } = openRoutesSpreadsheet();
        const now = new Date(Date.now());
        const row = [
            route.type,
            route.userId,
            route.routeId,
            route.routeName,
            route.description,
            route.note,
            JSON.stringify(route.data),
            route.coordinates,
            now.getTime(),
        ] satisfies RouteRow;
        routesSheet.appendRow(row);

        return {
            updatedAt: now.toISOString(),
        };
    }
    return {
        getRoutes,
        setRoute,
        clearRoutes,
        deleteRoute,
    };
}

type ApiResult<name extends keyof typeof interfaces> = z.infer<
    (typeof interfaces)[name]["result"]
>;

const defaultStore = createStore("Routes", "routes", "_query_result");
function dispatchRequest(
    path: string,
    parameter: GoogleAppsScript.RequestEvent["parameter"],
) {
    try {
        const functionName = requestPathSchema.parse(path);
        switch (functionName) {
            case "get-routes": {
                const { "user-id": userId, since } =
                    interfaces.getRoutes.parameter.parse(parameter);
                return okResponse(
                    defaultStore.getRoutes(
                        userId,
                        since != null ? new Date(since) : since,
                    ) satisfies ApiResult<"getRoutes">,
                );
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
                    data,
                } = interfaces.setRoute.parameter.parse(parameter);
                return okResponse(
                    defaultStore.setRoute({
                        type,
                        userId,
                        routeId,
                        routeName,
                        description,
                        note,
                        coordinates,
                        data: JSON.parse(data),
                    }) satisfies ApiResult<"setRoute">,
                );
            }
            case "delete-route": {
                const { "route-id": routeId } =
                    interfaces.deleteRoute.parameter.parse(parameter);
                return okResponse(
                    defaultStore.deleteRoute(
                        routeId,
                    ) satisfies ApiResult<"deleteRoute">,
                );
            }
            case "clear-routes": {
                const { "user-id": userId } =
                    interfaces.clearRoutes.parameter.parse(parameter);
                return okResponse(
                    defaultStore.clearRoutes(
                        userId,
                    ) satisfies ApiResult<"clearRoutes">,
                );
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
    withScriptLock(() =>
        withLogFile(`gas-drive-tunnel.log`, () => doRequest("GET", e)),
    )) satisfies GoogleAppsScript.RequestHandler;

global["doPost"] = ((e) =>
    withScriptLock(() =>
        withLogFile(`gas-drive-tunnel.log`, () => doRequest("POST", e)),
    )) satisfies GoogleAppsScript.RequestHandler;

function testStore(store: typeof defaultStore) {
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
    const coordinates = "48.8584,2.2945,48.8606,2.3376";
    const userId = "user345678";
    const { updatedAt: dateA } = store.setRoute(
        route(userId, "routeA000000", "routeA", coordinates),
    );
    const { updatedAt: dateB } = store.setRoute(
        route(userId, "routeA000001", "routeB", coordinates),
    );
    const { updatedAt: dateC } = store.setRoute(
        route(userId, "routeA000002", "routeC", coordinates),
    );
    const { updatedAt: dateB2 } = store.setRoute(
        route(userId, "routeA000001", "routeB2", coordinates),
    );

    const routeNames = store
        .getRoutes(userId)
        .routes.map(({ routeName, updatedAt }) => [routeName, updatedAt]);
    expect(routeNames).toStrictEqual([
        ["routeA", dateA],
        ["routeC", dateC],
        ["routeB2", dateB2],
    ]);

    const routes1 = store
        .getRoutes(userId, new Date(dateA))
        .routes.map((r) => r.routeName);
    expect(routes1).toStrictEqual(["routeC", "routeB2"]);

    const routes2 = store
        .getRoutes(userId, new Date(dateB))
        .routes.map((r) => r.routeName);
    expect(routes2).toStrictEqual(["routeC", "routeB2"]);

    const routes3 = store
        .getRoutes(userId, new Date(dateC))
        .routes.map((r) => r.routeName);
    expect(routes3).toStrictEqual(["routeB2"]);

    store.setRoute({
        ...route(userId, "spotD", "spotD", coordinates),
        data: { kind: "spot" },
    });
    const routes4 = store.getRoutes(userId).routes.map((r) => r.data);
    expect(routes4).toStrictEqual([{}, {}, {}, { kind: "spot" }]);
}
global["sandbox"] = function () {
    const routes = defaultStore.getRoutes("user789012");
    Logger.log(routes.routes.length);

    const testSheetFileName = "Routes";
    const testSheetName = "_test_routes";
    const testQuerySheetName = "_test_query_result";

    function deleteTestSheets() {
        const spreadsheetFile = DriveApp.getRootFolder()
            .getFilesByName(testSheetFileName)
            .next();

        const sheetNames = [testSheetName, testQuerySheetName];
        for (const sheetName of sheetNames) {
            const spreadsheet = SpreadsheetApp.open(spreadsheetFile);
            const sheet = spreadsheet.getSheetByName(sheetName);
            if (sheet != null) {
                spreadsheet.deleteSheet(sheet);
            }
        }
    }
    deleteTestSheets();
    try {
        testStore(
            createStore(testSheetFileName, testSheetName, testQuerySheetName),
        );
    } finally {
        deleteTestSheets();
    }
};
