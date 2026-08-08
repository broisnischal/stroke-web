/**
 * The complete set of things the desktop app may report.
 *
 * An allowlist rather than a naming convention, because the failure mode of
 * free-form event names in a database client is a table name arriving as
 * telemetry. Anything not on this list is dropped at ingest and counted as
 * rejected, so a mistake shows up as a number instead of as a leak.
 *
 * Adding an event is a deliberate act: add it here, and it starts being
 * counted. Nothing else needs to change.
 */
export const TELEMETRY_EVENTS = [
  // Session
  "app_launch",

  // Connecting — which engines people actually use, never which servers
  "connect_postgres",
  "connect_mysql",
  "connect_mariadb",
  "connect_cockroachdb",
  "connect_sqlite",
  "connect_libsql",
  "connect_d1",
  "connect_clickhouse",
  "connect_duckdb",
  "connect_mssql",
  "connect_redis",
  "connect_provider",
  "connect_discovered",
  "connect_ssh_tunnel",

  // Core surfaces
  "table_open",
  "sql_run",
  "row_insert",
  "row_edit",
  "row_delete",
  "export_data",

  // Feature pages
  "open_erd",
  "open_charts",
  "open_dashboard",
  "open_diagrams",
  "open_map",
  "open_insights",
  "open_schema_timeline",
  "open_data_diff",
  "open_notebook",
  "open_codegen",
  "open_backup",
  "open_search",
  "open_objects",
  "open_extensions",

  // AI
  "ai_message",
  "ai_provider_free",
  "ai_provider_own_key",
  "ai_provider_local",

  // Integrations
  "mcp_start",
  "backup_export",
  "backup_restore",
  "docker_launch",
] as const;

export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number];

const ALLOWED = new Set<string>(TELEMETRY_EVENTS);

export function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  return typeof value === "string" && ALLOWED.has(value);
}

/** Platforms we record. Anything else is stored as "" rather than as itself. */
const OS_VALUES = new Set(["macos", "windows", "linux"]);

export function normalizeOs(value: unknown): string {
  return typeof value === "string" && OS_VALUES.has(value) ? value : "";
}

/**
 * Versions are matched against a shape, not trusted. An unbounded string here
 * would be a free-form field by another name, and it is a primary key column.
 */
export function normalizeVersion(value: unknown): string {
  return typeof value === "string" && /^\d{1,3}(\.\d{1,4}){0,3}(-[a-z0-9.]{1,16})?$/i.test(value)
    ? value
    : "";
}

/** UTC day, the bucket everything is counted into. */
export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}
