// eslint-disable-next-line no-var
declare var global: typeof globalThis & { [name: string]: unknown };

declare namespace GoogleAppsScript {
    interface PostData {
        /**
         * GetRequestEvent["contentLength"] と同じ
         * @example `332`
         */
        readonly length: number;
        /**
         * POST 本文の MIME タイプ
         * @example `"text/csv"`
         */
        readonly type: string;
        /**
         * POST 本文のコンテンツ テキスト
         * @example `"Alice,21"`
         */
        readonly contents: string;
        /** 常に値「postData」 */
        readonly name: "postData";
    }
    interface RequestEvent {
        /**
         * URL のクエリ文字列部分の値。クエリ文字列が指定されていない場合は null の値。
         * @example `name=alice&n=1&n=2`
         */
        readonly queryString: string | null;
        /**
         * リクエスト パラメータに対応する Key-Value ペアのオブジェクト。 複数の値を持つパラメータの場合は、最初の値のみが返されます。
         * @example `{"name": "alice", "n": "1"}`
         */
        readonly parameter: Readonly<Record<string, string>>;
        /**
         * e.parameter に類似しているが、各キーに値の配列を持つオブジェクト
         * @example `{"name": ["alice"], "n": ["1", "2"]}`
         */
        readonly parameters: Readonly<Record<string, readonly string[]>>;
        /**
         * /exec または /dev の後の URL パス。たとえば、URL パスが /exec/hello で終わる場合、パス情報は hello です。
         */
        readonly pathInfo?: string;
        /** 使用しません。常に空の文字列になります。 */
        readonly contextPath: "";
        /**
         * POST リクエストの場合はリクエスト本文の長さ、GET リクエストの場合は -1 の長さ
         * @example `332`
         */
        readonly contentLength: number;
        readonly postData: PostData;
    }
    type RequestHandler = (
        e: RequestEvent,
    ) => Content.TextOutput | HTML.HtmlOutput;
}
