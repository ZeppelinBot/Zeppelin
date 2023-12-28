module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/ban-ts-comment": 0,
    "@typescript-eslint/no-non-null-assertion": 0,
    "no-async-promise-executor": 0,
    "@typescript-eslint/no-empty-interface": 0,
    "no-constant-condition": ["error", {
      checkLoops: false,
    }],
    "prefer-const": ["error", {
      destructuring: "all",
      ignoreReadBeforeAssign: true,
    }],
    "@typescript-eslint/no-namespace": ["error", {
      allowDeclarations: true,
    }],
  },
};
