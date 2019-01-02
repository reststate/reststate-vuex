module.exports = {
  extends: [
    'codingitwrong',
    'plugin:prettier/recommended',
  ],
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: [
    'jest',
  ],
  env: {
    'es6': true,
    'jest/globals': true,
    'node': true,
  },
};
