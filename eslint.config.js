export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", ".npm-cache/**", "work/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-constant-condition": "error"
    }
  }
];
