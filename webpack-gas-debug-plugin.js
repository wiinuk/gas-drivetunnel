//@ts-check
const esprima = require("esprima");
const webpack = require("webpack");
const pluginName = "GasDebugPlugin";

/**
 * @param {string} char
 */
function escapeChar(char) {
    const code = char.codePointAt(0);
    const hex = ("000" + code?.toString(16)).slice(-4);
    return `$u${hex}`;
}
/**
 * @param {string} identifier
 */
function escapeIdentifier(identifier) {
    return identifier.replace(/[^a-zA-Z_]/g, escapeChar);
}
/**
 * @param {esprima.Token[]} tokens
 * @param {number} index
 */
function getGlobalAssign(tokens, index) {
    // `global.??? =`
    if (
        tokens[index]?.type === "Identifier" &&
        tokens[index]?.value === "global" &&
        tokens[index + 1]?.type === "Punctuator" &&
        tokens[index + 1]?.value === "." &&
        tokens[index + 2]?.type === "Identifier" &&
        tokens[index + 3]?.type === "Punctuator" &&
        tokens[index + 3]?.value === "="
    ) {
        return tokens[index + 2];
    }

    // `global["???"] =`
    if (
        tokens[index]?.type === "Identifier" &&
        tokens[index]?.value === "global" &&
        tokens[index + 1]?.type === "Punctuator" &&
        tokens[index + 1]?.value === "[" &&
        tokens[index + 2]?.type === "String" &&
        tokens[index + 3]?.type === "Punctuator" &&
        tokens[index + 3]?.value === "]" &&
        tokens[index + 4]?.type === "Punctuator" &&
        tokens[index + 4]?.value === "="
    ) {
        return tokens[index + 2];
    }

    // `__webpack_require__.g["???"] =`
    if (
        tokens[index]?.type === "Identifier" &&
        tokens[index]?.value === "__webpack_require__" &&
        tokens[index + 1]?.type === "Punctuator" &&
        tokens[index + 1]?.value === "." &&
        tokens[index + 2]?.type === "Identifier" &&
        tokens[index + 2]?.value === "g" &&
        tokens[index + 3]?.type === "Punctuator" &&
        tokens[index + 3]?.value === "[" &&
        tokens[index + 4]?.type === "String" &&
        tokens[index + 5]?.type === "Punctuator" &&
        tokens[index + 5]?.value === "]" &&
        tokens[index + 6]?.type === "Punctuator" &&
        tokens[index + 6]?.value === "="
    ) {
        return tokens[index + 4];
    }
}
/**
 * @param {string} source
 */
function addGlobalStabs(source) {
    /** @type {Map<string, string>} */
    const idToName = new Map();
    esprima
        .tokenize(source)
        .map(
            (token, i, tokens) =>
                /** @type {esprima.Token} */ (getGlobalAssign(tokens, i)),
        )
        .filter((x) => x)
        .forEach(({ type, value }) => {
            /** @type {string} */
            const name = type === "String" ? eval(value) : value;
            idToName.set(escapeIdentifier(name), name);
        });

    let newSource = source;

    const newLine = "\r\n";
    if (idToName.size !== 0) {
        newSource += newLine;
    }
    for (const [id, name] of idToName) {
        newSource += `${newLine}function ${id}() { this[${JSON.stringify(
            name,
        )}](); }`;
    }
    return { newSource, idToName };
}
class GasDebugPlugin {
    apply(/** @type {webpack.Compiler} */ compiler) {
        compiler.hooks.compilation.tap(
            {
                name: pluginName,
                stage: webpack.Compilation
                    .PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY,
            },
            (compilation) => {
                compilation.hooks.processAssets.tapPromise(
                    { name: pluginName },
                    async (assets) => {
                        for (const [pathName, source] of Object.entries(
                            assets,
                        )) {
                            if (pathName.endsWith(".js")) {
                                const asset = compilation.assets[pathName];
                                const source = asset.source().toString();
                                const { newSource } = addGlobalStabs(source);
                                compilation.assets[pathName] =
                                    new webpack.sources.RawSource(newSource);
                            }
                        }
                    },
                );
            },
        );
    }
}

module.exports = GasDebugPlugin;
