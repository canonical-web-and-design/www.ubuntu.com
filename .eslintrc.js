module.exports = {
  env: {
    node: true,
    browser: true,
    es6: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "eslint-config-prettier",
    "plugin:cypress/recommended",
    "plugin:react/recommended",
  ],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    dataLayer: "readonly",
    d3: "readonly",
    topojson: "readonly",
    ga: "readonly",
    grecaptcha: "readonly",
    serialize: "readonly",
  },
  parser: "@babel/eslint-parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    requireConfigFile: false,
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx", "@babel/preset-react"],
    },
  },
  rules: {
    semi: ["error", "always"],
    "no-prototype-builtins": "off",
  },
};
