//spell-checker: ignore rulesdir
//@ts-check
const rulesDirPlugin = require("eslint-plugin-rulesdir");
rulesDirPlugin.RULES_DIR = "./eslint/rules";

/** @type {import("eslint").Linter.Config<import("eslint").Linter.RulesRecord>} */
const config = {
    root: true,
    env: {
        es6: true,
        browser: true,
        node: true,
        commonjs: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2018,
        ecmaFeatures: {
            jsx: true,
        },
        sourceType: "module",
        project: "./tsconfig.json",
    },
    plugins: ["rulesdir", "@typescript-eslint", "es-x"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:es-x/restrict-to-es5",
        "prettier",
    ],
    ignorePatterns: "*.js",
    rules: {
        "rulesdir/no-unused-await": "warn",
        "rulesdir/no-unused-optional-chain": "warn",
        "rulesdir/no-unused-spell-checker-directive": "warn",
        "@typescript-eslint/no-floating-promises": [
            "warn",
            { ignoreVoid: true },
        ],
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
        ],
        "object-shorthand": "warn",
        "no-useless-rename": "warn",
        "no-duplicate-imports": "warn",

        "es-x/no-modules": "off",
        "es-x/no-rest-parameters": "off",
        "es-x/no-block-scoped-variables": "off",
        "es-x/no-destructuring": "off",
        "es-x/no-template-literals": "off",
        "es-x/no-nullish-coalescing-operators": "off",
        "es-x/no-optional-chaining": "off",
        "es-x/no-property-shorthands": "off",
        "es-x/no-trailing-function-commas": "off",
        "es-x/no-for-of-loops": "off",
        "es-x/no-arrow-functions": "off",
        "es-x/no-rest-spread-properties": "off",
        "es-x/no-classes": "off",
    },
};
module.exports = config;
