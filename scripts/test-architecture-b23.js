const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src");
const allowedPrismaFiles = new Set([
  path.join(sourceRoot, "lib", "db", "client.ts"),
  path.join(sourceRoot, "lib", "authz", "auth-boundary.ts"),
  path.join(sourceRoot, "lib", "authz", "policy.ts"),
  path.join(sourceRoot, "lib", "authz", "consent-service.ts"),
  path.join(sourceRoot, "lib", "authz", "professional-service.ts"),
  path.join(sourceRoot, "lib", "authz", "protected-data-service.ts"),
]);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

const violations = [];
for (const file of files(sourceRoot)) {
  const text = fs.readFileSync(file, "utf8");
  if (/from\s+["'](?:@prisma\/client|(?:@\/|\.\.?\/)+.*(?:db\/client|auth-boundary))["']/.test(text) && !allowedPrismaFiles.has(file)) {
    violations.push(path.relative(root, file));
  }
}

assert.deepEqual(violations, [], `Protected Prisma/auth-boundary imports outside approved modules: ${violations.join(", ")}`);
console.log("Architecture boundary test passed: protected Prisma and actor-boundary imports are restricted to approved modules.");
