module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|adhan))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '^../lib/supabase$': '<rootDir>/src/__mocks__/supabase.ts',
    '^../../lib/supabase$': '<rootDir>/src/__mocks__/supabase.ts',
    '^../../../lib/supabase$': '<rootDir>/src/__mocks__/supabase.ts',
  },
};
