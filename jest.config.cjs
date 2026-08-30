module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          react: { runtime: 'automatic' },
          optimizer: {
            globals: {
              vars: {
                'import.meta.env.VITE_API_BASE_URL': 'process.env.VITE_API_BASE_URL',
                'import.meta.env.DEV': 'process.env.VITE_DEV === "true"',
                'import.meta.env.PROD': 'process.env.VITE_PROD === "true"',
              },
            },
          },
        },
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
    'src/api/**/*.ts',
    'src/config/api-client.ts',
    'src/constants/api.ts',
    'src/hooks/profile/*.ts',
    'src/hooks/route-comparison/*.ts',
    'src/lib/get-api-error-message.ts',
    'src/lib/route-air-quality.ts',
    'src/components/common/ConceptBadge.tsx',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: { global: { branches: 70, functions: 80, lines: 80, statements: 80 } },
}
