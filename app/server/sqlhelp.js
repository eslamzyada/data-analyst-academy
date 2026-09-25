// Turns a query that did not run into help a beginner can act on: what went wrong, in plain
// words, and what to do next (the tables or columns that do exist, the closest name, an example
// in this app's dialect). The learner never has to reverse-engineer the database.
//
// help = { kind, title, message, tables?, columns?, suggestion?, example, databases? }
// kinds: empty, several, unknown-database, unavailable, timeout, db-prefix, other-dialect,
//        unknown-table, unknown-column, ambiguous-column, aggregate-in-where, group-by,
//        incomplete, syntax, error

function distance(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/** The closest name in `names` (a typo, a plural, a different case), or null. */
export function closest(name, names) {
  let best = null; let bestD = Infinity;
  for (const n of names) {
    const d = n.toLowerCase() === name.toLowerCase() ? 0 : distance(name, n);
    const plural = n.toLowerCase() === `${name.toLowerCase()}s` || `${n.toLowerCase()}s` === name.toLowerCase();
    const score = plural ? 0.5 : d;
    if (score < bestD) { best = n; bestD = score; }
  }
  const limit = name.length <= 4 ? 1 : name.length <= 8 ? 2 : 3;
  return best !== null && bestD <= limit ? best : null;
}

/** The tables a query names after FROM or JOIN. */
export function tablesInQuery(sql) {
  const out = [];
  for (const m of String(sql).matchAll(/\b(?:from|join)\s+("?)([A-Za-z_][A-Za-z0-9_.]*)\1/gi)) if (!out.includes(m[2])) out.push(m[2]);
  return out;
}

const starterTable = (db) => (db.tables.find((t) => /customer/i.test(t.name)) || db.tables[0] || { name: 'table_name' }).name;
const example = (db, table = starterTable(db)) => `SELECT *\nFROM ${table}\nLIMIT 10;`;

/**
 * @param error  the SQL engine's message (or null when the problem is found before running)
 * @param sql    what the learner ran
 * @param db     { id, title, tables: [{ name, columns: [name] }] } or null when the database is unknown
 * @param extra  { kind, databases: [{ id, title }], dialect }
 */
export function sqlHelp(error, sql, db, extra = {}) {
  const msg = String(error || '');
  const tables = db ? db.tables.map((t) => t.name) : [];
  const base = (h) => ({ dialect: extra.dialect || 'SQLite', ...h });

  if (extra.kind === 'unknown-database' || !db) {
    const dbs = extra.databases || [];
    return base({
      kind: 'unknown-database', title: 'That database could not be found',
      message: `There is no practice database called "${extra.asked || ''}". Pick one of these: ${dbs.map((d) => d.title).join(', ')}.`,
      databases: dbs, example: 'SELECT *\nFROM customers\nLIMIT 10;',
    });
  }
  if (extra.kind === 'empty') return base({ kind: 'empty', title: 'Write a query first', message: 'The editor is empty. Start with the example below, then change it.', tables, example: example(db) });
  if (extra.kind === 'several') return base({ kind: 'several', title: 'One query at a time', message: 'The SQL Lab runs one query at a time. Remove everything after the first semicolon (;), or run the queries one by one.', tables, example: example(db) });
  if (extra.kind === 'unavailable') {
    return base({ kind: 'unavailable', title: 'The practice database is unavailable', message: `${db.title} could not be opened. This is a problem with the app's practice files, not with your query: your query is kept. Try again in a moment, or restart the Academy.`, example: null });
  }
  if (extra.kind === 'timeout') {
    return base({ kind: 'timeout', title: 'Your query took too long and was stopped', message: 'It ran for more than 8 seconds. This usually means a JOIN is missing its ON condition, so every row was matched with every other row.', tables, example: 'SELECT o.order_id, c.full_name\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nLIMIT 10;' });
  }

  const upper = String(sql || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (/^USE\b/.test(upper)) {
    return base({ kind: 'other-dialect', title: 'No USE needed here', message: `You are already connected to ${db.title}. Write the query straight away: name the table after FROM.`, tables, example: example(db) });
  }
  if (/^SHOW\s+TABLES\b|^\.TABLES\b/.test(upper)) {
    return base({ kind: 'other-dialect', title: 'SQLite has no SHOW TABLES', message: `The tables of ${db.title} are: ${tables.join(', ')}. (In SQLite you can also list them with SELECT name FROM sqlite_master WHERE type = 'table'.)`, tables, example: "SELECT name\nFROM sqlite_master\nWHERE type = 'table';" });
  }
  if (/^(DESCRIBE|DESC)\s+\w+|^SHOW\s+COLUMNS\b/.test(upper)) {
    const t = /^(?:DESCRIBE|DESC)\s+(\w+)/.exec(upper)?.[1]?.toLowerCase() || starterTable(db);
    return base({ kind: 'other-dialect', title: 'SQLite has no DESCRIBE', message: 'Open the table in the schema to see its columns, or ask SQLite with PRAGMA table_info.', tables, example: `SELECT name, type\nFROM pragma_table_info('${t}');` });
  }
  if (/\bSELECT\s+TOP\s+\d+/.test(upper)) {
    return base({ kind: 'other-dialect', title: 'SQLite uses LIMIT, not TOP', message: 'SELECT TOP 5 is SQL Server. Here (SQLite) you put LIMIT 5 at the end of the query.', tables, example: `SELECT *\nFROM ${starterTable(db)}\nLIMIT 5;` });
  }

  let m = /no such table: ([^\s]+)/i.exec(msg);
  if (m) {
    const name = m[1];
    const dot = name.indexOf('.');
    if (dot > 0) {
      const prefix = name.slice(0, dot).toLowerCase();
      const rest = name.slice(dot + 1);
      const names = [db.id, ...db.title.toLowerCase().split(/[^a-z0-9]+/)];
      if (names.includes(prefix) || tables.includes(rest)) {
        return base({ kind: 'db-prefix', title: 'No database name needed', message: `In this app you write the table name on its own: FROM ${rest}, not FROM ${name}. You are already connected to ${db.title}.`, tables, suggestion: tables.includes(rest) ? rest : closest(rest, tables), example: example(db, tables.includes(rest) ? rest : starterTable(db)) });
      }
    }
    const suggestion = closest(name, tables);
    return base({ kind: 'unknown-table', title: `Table "${name}" does not exist`, message: `${db.title} has no table called "${name}". Its tables are listed below.`, tables, suggestion, example: example(db, suggestion || starterTable(db)) });
  }
  m = /no such column: ([^\s]+)/i.exec(msg);
  if (m) {
    const name = m[1];
    const bare = name.includes('.') ? name.split('.').pop() : name;
    const used = tablesInQuery(sql).map((t) => t.toLowerCase()).filter((t) => tables.includes(t));
    const from = (used.length ? used : tables).map((t) => db.tables.find((x) => x.name === t));
    const columns = [...new Set(from.flatMap((t) => t.columns.map((c) => (used.length > 1 ? `${t.name}.${c}` : c))))];
    const suggestion = closest(bare, from.flatMap((t) => t.columns));
    const where = used.length ? used.join(' and ') : `the tables of ${db.title}`;
    return base({ kind: 'unknown-column', title: `Column "${name}" does not exist`, message: `There is no column "${name}" in ${where}. Check the spelling, and which table the column belongs to.`, columns, suggestion, tables: used.length ? used : tables, example: example(db, used[0]) });
  }
  if (/ambiguous column name: ([^\s]+)/i.test(msg)) {
    const name = /ambiguous column name: ([^\s]+)/i.exec(msg)[1];
    return base({ kind: 'ambiguous-column', title: `"${name}" is in more than one table`, message: `Two of the tables in your query have a column called ${name}. Say which one you mean: give each table a short alias and write alias.${name} (for example o.${name}).`, tables, example: `SELECT o.${name}\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nLIMIT 10;` });
  }
  if (/misuse of aggregate/i.test(msg)) {
    return base({ kind: 'aggregate-in-where', title: 'Totals can\'t be filtered in WHERE', message: 'WHERE filters rows before they are added up, so SUM, COUNT and AVG can\'t be used there. Filter the totals with HAVING, after GROUP BY.', tables, example: 'SELECT region, COUNT(*) AS customers\nFROM customers\nGROUP BY region\nHAVING COUNT(*) > 100;' });
  }
  if (/incomplete input/i.test(msg)) {
    return base({ kind: 'incomplete', title: 'The query stops too early', message: 'Something is missing at the end: a table name after FROM, a closing bracket, or a closing quote mark.', tables, example: example(db) });
  }
  m = /near "([^"]*)": syntax error/i.exec(msg);
  if (m) {
    return base({ kind: 'syntax', title: 'SQL could not read your query', message: `It stopped at "${m[1]}". Look just before that word for a missing comma, bracket, quote mark or keyword (SELECT ... FROM ... WHERE ... GROUP BY ... ORDER BY ... LIMIT).`, tables, example: example(db) });
  }
  return base({ kind: 'error', title: 'The query could not run', message: msg || 'The query could not run.', tables, example: example(db) });
}
