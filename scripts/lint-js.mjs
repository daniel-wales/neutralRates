import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectJsFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return collectJsFiles(path);
    return path.endsWith(".js") ? [path] : [];
  });
}

const files = collectJsFiles("js");
for (const file of files) {
  execFileSync("node", ["--check", file], { stdio: "inherit" });
}

console.log(`Checked ${files.length} JavaScript files.`);
