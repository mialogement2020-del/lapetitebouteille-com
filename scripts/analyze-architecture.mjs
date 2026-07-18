import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const outputPath = join(root, "docs", "architecture", "generated", "architecture-scan.json");

const walk = (dir, extensions, files = []) => {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extensions, files);
    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) files.push(full);
  }
  return files;
};

const read = (file) => readFileSync(file, "utf8");
const rel = (file) => relative(root, file).replaceAll("\\", "/");
const unique = (items) => [...new Set(items)].sort();

const sourceFiles = walk(join(root, "src"), [".ts", ".tsx"]);
const migrationFiles = walk(join(root, "supabase", "migrations"), [".sql"]);
const edgeFunctionFiles = walk(join(root, "supabase", "functions"), [".ts"]);

const importEdges = [];
const rpcCalls = [];
const edgeCalls = [];
const tableReads = [];

for (const file of sourceFiles) {
  const content = read(file);
  const from = rel(file);
  for (const match of content.matchAll(/import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g)) {
    importEdges.push({ from, to: match[1] });
  }
  for (const match of content.matchAll(/\.rpc\(["']([^"']+)["']/g)) {
    rpcCalls.push({ file: from, rpc: match[1] });
  }
  for (const match of content.matchAll(/functions\.invoke\(["']([^"']+)["']/g)) {
    edgeCalls.push({ file: from, function: match[1] });
  }
  for (const match of content.matchAll(/\.from\(["']([^"']+)["']/g)) {
    tableReads.push({ file: from, table: match[1] });
  }
}

const sqlFunctions = [];
const sqlTables = [];
const sqlViews = [];
const sqlPolicies = [];

for (const file of migrationFiles) {
  const content = read(file);
  const migration = rel(file);
  for (const match of content.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)/g)) {
    sqlFunctions.push({ migration, name: match[1] });
  }
  for (const match of content.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.([a-zA-Z0-9_]+)/g)) {
    sqlTables.push({ migration, name: match[1] });
  }
  for (const match of content.matchAll(/CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.([a-zA-Z0-9_]+)/g)) {
    sqlViews.push({ migration, name: match[1] });
  }
  for (const match of content.matchAll(/CREATE\s+POLICY\s+"([^"]+)"/g)) {
    sqlPolicies.push({ migration, name: match[1] });
  }
}

const edgeFunctions = unique(
  edgeFunctionFiles
    .map((file) => rel(file).match(/^supabase\/functions\/([^/]+)\//)?.[1])
    .filter(Boolean),
);

const documentedRpc = new Set();
const documentedEdge = new Set();
for (const file of migrationFiles) {
  const content = read(file);
  for (const match of content.matchAll(/INSERT INTO public\.platform_rpc_contracts[\s\S]*?'([^']+)'/g)) {
    documentedRpc.add(match[1]);
  }
  for (const match of content.matchAll(/INSERT INTO public\.platform_edge_function_contracts[\s\S]*?'([^']+)'/g)) {
    documentedEdge.add(match[1]);
  }
}

const rpcNames = unique(sqlFunctions.map((item) => item.name));
const undocumentedRpc = rpcNames.filter((name) => !documentedRpc.has(name) && !name.startsWith("platform_"));
const undocumentedEdgeFunctions = edgeFunctions.filter((name) => !documentedEdge.has(name));

const report = {
  generated_at: new Date().toISOString(),
  counts: {
    source_files: sourceFiles.length,
    migrations: migrationFiles.length,
    edge_functions: edgeFunctions.length,
    sql_functions: sqlFunctions.length,
    sql_tables: sqlTables.length,
    sql_views: sqlViews.length,
    sql_policies: sqlPolicies.length,
    frontend_rpc_calls: rpcCalls.length,
    frontend_edge_calls: edgeCalls.length,
    frontend_table_reads: tableReads.length,
  },
  modules: {
    detected_from_admin_tabs: unique(
      read(join(root, "src", "pages", "Admin.tsx")).match(/\{ id: '[^']+'/g)?.map((value) => value.replace("{ id: '", "")) ?? [],
    ),
    edge_functions: edgeFunctions,
  },
  dependencies: {
    imports: importEdges,
    rpc_calls: rpcCalls,
    edge_calls: edgeCalls,
    table_reads: tableReads,
  },
  sql: {
    functions: sqlFunctions,
    tables: sqlTables,
    views: sqlViews,
    policies: sqlPolicies,
  },
  findings: {
    undocumented_rpc: undocumentedRpc,
    undocumented_edge_functions: undocumentedEdgeFunctions,
    circular_dependencies: [],
    note: "Static scan only. It does not block the build and should be reviewed by a technical admin.",
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Architecture scan written to ${relative(root, outputPath)}`);
console.log(JSON.stringify(report.counts, null, 2));
