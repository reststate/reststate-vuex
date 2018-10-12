module.exports = {
  extends: 'codingitwrong',
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
