/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation
        'style',     // Formatting
        'refactor',  // Refactoring
        'perf',      // Performance
        'test',      // Tests
        'build',     // Build system
        'ci',        // CI/CD
        'chore',     // Maintenance
        'revert',    // Revert commit
        'security',  // Security patches
        'migration', // DB migrations
        'infra',     // Infrastructure
        'release',   // Release
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
