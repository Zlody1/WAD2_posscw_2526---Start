// jest.config.mjs
export default {
  testEnvironment: "node",
  transform: {}, // disable transforms unless you use Babel/ts-jest
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  maxWorkers: 1, // Run tests serially to avoid file lock conflicts on OneDrive
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "models/**/*.js",
    "middlewares/**/*.js",
    "routes/**/*.js",
    "!models/_db.js",   // infrastructure, not business logic
  ],
  coverageReporters: ["text", "lcov"],
  coverageDirectory: "coverage",
};
