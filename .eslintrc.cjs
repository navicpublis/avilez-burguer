/* Config mínima; ajuste conforme o padrão do time. */
module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};
