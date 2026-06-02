/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    // Cherche uniquement dans tests/ — ignore dist/, test.ts à la racine, etc.
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    // Force l'arrêt après les tests (wolf_chat.test.ts a des timers internes longs)
    forceExit: true,
};
