/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index'),
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    ...require('./index').rules,
    'no-process-exit': 'error',
  },
};
