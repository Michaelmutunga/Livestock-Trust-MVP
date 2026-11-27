import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: directory });
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "@prisma/client", message: "Use an approved server-side data-access service; route handlers must not access Prisma directly." },
          { name: "../lib/db/client", message: "Use an approved server-side data-access service; route handlers must not access Prisma directly." },
          { name: "../../lib/db/client", message: "Use an approved server-side data-access service; route handlers must not access Prisma directly." },
        ],
      }],
    },
  },
];
