import fs from "node:fs";
import path from "node:path";

const SOURCE_DIRECTORIES = ["app", "components", "lib"];
const SOURCE_EXTENSION = /\.(?:tsx?|jsx?)$/;
const ROUTE_FILE = /\/(?:page|route)\.(?:tsx?|jsx?)$/;
const NON_ROUTE_STRINGS = new Map([
  [
    "app/api/integrations/telegram/webhook/route.ts",
    new Set(["/help", "/start", "/status", "/stop"]),
  ],
  ["app/student/results/page.tsx", new Set(["/100"])],
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) return walk(filePath);
    return SOURCE_EXTENSION.test(entry.name) ? [filePath] : [];
  });
}

function routeFromFile(filePath) {
  const directory = path.dirname(filePath).replace(/^app\/?/, "");
  return `/${directory.split("/").filter(Boolean).join("/")}`;
}

function routePattern(route) {
  const pattern = route
    .replace(/\[\.\.\.[^/]+\]/g, ".+")
    .replace(/\[[^/]+\]/g, "[^/]+");

  return new RegExp(`^${pattern}/?$`);
}

function normalizeReference(reference) {
  return reference
    .replace(/\$\{[^}]+\}/g, "sample")
    .split(/[?#]/)[0];
}

function shouldSkipReference(filePath, reference, pathname) {
  if (
    filePath === "components/navigation/Breadcrumbs.tsx" &&
    reference.startsWith("/${segments.slice")
  ) {
    return true;
  }
  if (NON_ROUTE_STRINGS.get(filePath)?.has(pathname)) return true;
  if (!pathname || pathname.includes(" ")) {
    return true;
  }
  if (/[<>={}]/.test(reference.replace(/\$\{[^}]+\}/g, ""))) return true;
  if (/\.(?:css|ico|png|svg|woff2?)$/i.test(pathname)) return true;
  return pathname.startsWith("/uploads/");
}

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walk);
const routes = walk("app").filter((filePath) => ROUTE_FILE.test(filePath));
const routePatterns = routes.map(routeFromFile).map(routePattern);
const missingReferences = [];
let checkedReferences = 0;

for (const filePath of sourceFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  const internalString = /(["'`])(\/(?!\/)[^\n]*?)\1/g;

  for (const match of source.matchAll(internalString)) {
    const reference = match[2];
    const pathname = normalizeReference(reference);

    if (shouldSkipReference(filePath, reference, pathname)) continue;

    checkedReferences += 1;

    if (
      pathname === "/" ||
      routePatterns.some((pattern) => pattern.test(pathname))
    ) {
      continue;
    }

    const line = source.slice(0, match.index).split("\n").length;
    missingReferences.push(`${filePath}:${line}  ${reference}`);
  }
}

if (missingReferences.length > 0) {
  console.error("Найдены ссылки на отсутствующие внутренние маршруты:");
  console.error([...new Set(missingReferences)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Проверено ${checkedReferences} внутренних ссылок: отсутствующих маршрутов нет.`
  );
}
