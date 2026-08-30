module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: { react: { runtime: 'automatic' } },
      },
      module: { type: 'commonjs' },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/styleMock.cjs',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/tests/fileMock.cjs',
  },
  collectCoverageFrom: [
    'src/lib/get-api-error-message.ts',
    'src/lib/route-air-quality.ts',
    'src/components/common/ConceptBadge.tsx',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: { global: { branches: 70, functions: 80, lines: 80, statements: 80 } },
}
