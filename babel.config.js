module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: ["last 2 versions"],
          node: "current",
        },
      },
    ],
    "@babel/preset-react",
  ],
  plugins: [
    [
      "@babel/plugin-transform-runtime",
      {
        regenerator: true,
      },
      "@babel/plugin-syntax-jsx",
    ],
  ],
};
