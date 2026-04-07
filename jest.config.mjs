// jest.config.mjs
export default {
  testEnvironment: "node",
  transform: {}, // disable transforms unless you use Babel/ts-jest
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  maxWorkers: 1, // Run tests serially to avoid file lock conflicts on OneDrive
  // If you need .js treated as ESM explicitly:
  // extensionsToTreatAsEsm: ['.js'],
};
