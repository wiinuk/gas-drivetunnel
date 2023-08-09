// @ts-check
const path = require("node:path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");

const entryPoint = path.join(__dirname, "source", "Code.ts");

/** @type {import("webpack").Configuration} */
const config = {
    mode: "development",
    target: ["web", "es5"],
    devtool: false,
    entry: {
        Code: entryPoint,
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".js", ".json", ".ts"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: {
                    transpileOnly: true,
                },
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: "./source/appsscript.json" }],
        }),
        // @ts-ignore
        new WebpackShellPluginNext({
            onAfterDone: {
                scripts: ["echo 'clasp push'", "npx clasp push --force"],
                blocking: true,
            },
        }),
    ],
    optimization: {
        minimize: false,
    },
};
module.exports = config;
