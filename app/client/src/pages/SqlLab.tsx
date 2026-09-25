import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useSavedWork } from '../saved';
import { SqlEditor, ResultTable, SqlError, SchemaDrawer, loadDbs, plainTitle } from '../components/Sheets';
import Icon from '../components/Icon';
import { Loading, Stars, fmtNum } from '../components/ui';

const DIALECT: string[][] = [
  ['You want', 'This app (SQLite)', 'SQL Server', 'PostgreSQL'],
  ['first 10 rows', 'LIMIT 10', 'SELECT TOP 10', 'LIMIT 10'],
  ['month label', "strftime('%Y-%m', d)", "FORMAT(d,'yyyy-MM')", "TO_CHAR(d,'YYYY-MM')"],
  ['year', "strftime('%Y', d)", 'YEAR(d)', 'EXTRACT(YEAR FROM d)'],
  ['days between', 'julianday(b) - julianday(a)', 'DATEDIFF(day,a,b)', 'b - a'],
  ['add 90 days', "date(d, '+90 days')", 'DATEADD(day,90,d)', 'd + 90'],
  ['join text', "a || ' ' || b", "CONCAT(a,' ',b)", "a || ' ' || b"],
];

const readLocal = (db: string) => { try { return localStorage.getItem(`sqllab:${db}`); } catch { return null; } };

type LabState = { db: string; drafts: Record<string, string> };

export default function SqlLab() {
  const loc = useLocation();
  const asked = new URLSearchParams(loc.search).get('db');
  const [dbs, setDbs] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [db, setDbRaw] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [sql, setSqlRaw] = useState('');
  // the query being written, per database, saved on the server as it is typed
  const { loaded, save } = useSavedWork<LabState>('session:sqllab');
  const lab = useRef<LabState | null>(null);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [schema, setSchema] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showDialect, setShowDialect] = useState(false);
  const editorBox = useRef<HTMLDivElement>(null);

  const fetchDbs = useCallback(() => {
    setLoadError(null);
    loadDbs().then(setDbs).catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => { fetchDbs(); }, [fetchDbs]);
  useEffect(() => { if (db) api(`/api/sql/challenges?db=${db}`).then(setChallenges).catch(() => setChallenges([])); }, [db]);

  const starterOf = (id: string) => (dbs || []).find((d) => d.id === id)?.starter?.sql || 'SELECT *\nFROM customers\nLIMIT 10;';
  // once the databases and the saved copy are both here: the database to show (a link or the last
  // one used; an unknown name falls back to the first database, with a note) and its query
  useEffect(() => {
    if (!loaded || !dbs || lab.current) return;
    const s = loaded.state && loaded.state.drafts ? loaded.state : { db: '', drafts: {} as Record<string, string> };
    const wanted = asked || s.db || dbs[0].id;
    const known = dbs.some((d) => d.id === wanted);
    if (!known) setNotice(`There is no practice database called "${wanted}". Showing ${dbs[0].title} instead.`);
    const current = known ? wanted : dbs[0].id;
    lab.current = { db: current, drafts: { ...s.drafts } };
    setDbRaw(current);
    setSqlRaw(lab.current.drafts[current] ?? readLocal(current) ?? starterOf(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, dbs]);

  const setSql = (v: string | ((s: string) => string)) => {
    setSqlRaw((prev) => {
      const text = typeof v === 'function' ? v(prev) : v;
      if (lab.current) {
        lab.current = { ...lab.current, drafts: { ...lab.current.drafts, [lab.current.db]: text } };
        save(lab.current);
      }
      return text;
    });
  };
  const setDb = (next: string) => {
    setDbRaw(next);
    setRes(null); setNotice(null);
    if (!lab.current) return;
    lab.current = { ...lab.current, db: next };
    setSqlRaw(lab.current.drafts[next] ?? readLocal(next) ?? starterOf(next));
    save(lab.current, true);
  };
  const insert = (text: string) => setSql((s) => `${s}${!s || s.endsWith(' ') || s.endsWith('\n') ? '' : ' '}${text}`);
  const backToEditor = () => { editorBox.current?.scrollIntoView({ block: 'center' }); (editorBox.current?.querySelector('.cm-content') as HTMLElement | null)?.focus(); };

  const run = useCallback(async (text?: string) => {
    setBusy(true);
    const q = text ?? sql;
    setRes(await api('/api/sql/run', { db, sql: q }).catch((e) => ({ ok: false, error: e.message, help: { kind: 'unavailable', title: 'The query could not be sent', message: `${e.message}. Your query is kept: try again in a moment.` } })));
    setBusy(false);
  }, [sql, db]);

  if (loadError) {
    return (
      <div>
        <div className="page-head"><div><h1>SQL Lab</h1></div></div>
        <div className="sql-error-card" role="alert">
          <b>The practice databases could not be loaded</b>
          <p className="small" style={{ margin: '6px 0 10px' }}>{loadError}. Nothing is lost; this is a problem on the app's side.</p>
          <button className="btn sm" onClick={fetchDbs}><Icon name="refresh" size={14} />Try again</button>
        </div>
      </div>
    );
  }
  if (!dbs || !lab.current || !db) return <Loading text="Opening the practice databases…" />;
  const info = dbs.find((d) => d.id === db) || dbs[0];
  const ready = info.status !== 'unavailable';
  const isStarter = sql.trim() === String(info.starter?.sql || '').trim();
  return (
    <div>
      <div className="page-head">
        <div><h1>SQL Lab</h1><p>Your own practice databases. Explore the tables, write queries, see results. Nothing you run can change them.</p></div>
        <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
          <span className="tiny muted">Choose a database</span>
          <div className="pill-toggle">{dbs.map((d) => <button key={d.id} className={db === d.id ? 'on' : ''} onClick={() => setDb(d.id)}>{d.title}</button>)}</div>
        </div>
      </div>
      {notice && <div className="resumed" role="status"><Icon name="bulb" size={15} /><span>{notice}</span></div>}

      <div className="card db-header" data-db={info.id}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="label">Database</div>
            <h2 style={{ margin: '2px 0 4px' }}>{info.title}</h2>
            <div className="small muted">{info.business} · {info.description}</div>
          </div>
          <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
            <span className={`db-status ${ready ? 'ok' : 'down'}`}><span className="dot" />{ready ? 'Connected' : 'Unavailable'}</span>
            <span className="small muted">SQL dialect: <b>{info.dialect || 'SQLite'}</b></span>
          </div>
        </div>
        <p className="small" style={{ margin: '10px 0 6px' }}>
          <b>How to query it:</b> you're already connected, so write table names directly, with no database name: <code>SELECT * FROM {info.starter?.table || info.tables[0]?.name} LIMIT 10;</code>
        </p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <span className="small muted">Tables:</span>
          {info.tables.map((t: any) => <button key={t.name} className="chip mono" title={t.description} onClick={() => insert(t.name)}>{t.name}</button>)}
          <button className="btn ghost sm" onClick={() => setSchema(true)}><Icon name="table" size={14} />View schema</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', alignItems: 'start', marginTop: 12 }}>
        <div className="card" style={{ padding: 14, position: 'sticky', top: 12, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
          <div className="label">Tables and columns</div>
          <p className="tiny muted" style={{ margin: '6px 0 10px' }}>Click a table to see its columns; click a column to add it to your query.</p>
          {info.tables.map((t: any) => (
            <div key={t.name} style={{ borderTop: '1px solid var(--line-2)', padding: '7px 0' }}>
              <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === t.name ? null : t.name)}>
                <b className="mono small">{t.name}</b><span className="tiny muted">{t.rows === null ? '' : `${fmtNum(t.rows)} rows`}</span>
              </div>
              {open === t.name && (
                <div style={{ marginTop: 4 }}>
                  <div className="tiny muted" style={{ marginBottom: 4 }}>{t.description}</div>
                  {t.columns.map((c: any) => (
                    <div key={c.name} className="tiny" style={{ padding: '1px 0' }} title={c.description}>
                      <span className="mono" style={{ cursor: 'pointer', color: 'var(--primary-ink)' }} onClick={() => insert(c.name)}>{c.name}</span>
                      <span className="muted"> {String(c.type || '').toLowerCase()}</span>
                    </div>
                  ))}
                  <button className="btn sm" style={{ marginTop: 6 }} onClick={() => { const q = `SELECT *\nFROM ${t.name}\nLIMIT 20;`; setSql(q); run(q); }}>Show 20 rows</button>
                </div>
              )}
            </div>
          ))}
          {info.notes.length > 0 && <div className="small" style={{ marginTop: 12 }}><div className="label">Good to know</div><ul style={{ paddingLeft: 16, margin: '6px 0' }}>{info.notes.map((n: string, i: number) => <li key={i} className="tiny">{n}</li>)}</ul></div>}
        </div>

        <div className="stack">
          {isStarter && info.starter?.explain && (
            <div className="starter-note small"><Icon name="bulb" size={14} /> <span>{info.starter.explain}</span></div>
          )}
          <div ref={editorBox}><SqlEditor value={sql} onChange={setSql} onRun={() => run()} db={db} height="220px" /></div>
          <div className="row between">
            <div className="row">
              <button className="btn primary" onClick={() => run()} disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="play" size={14} />}Run query</button>
              <span className="muted small">Ctrl+Enter</span>
            </div>
            <button className="btn ghost sm" onClick={() => setShowDialect(!showDialect)}>SQLite vs SQL Server vs PostgreSQL</button>
          </div>
          {showDialect && <div className="card flat md small" dangerouslySetInnerHTML={{ __html: renderTable(DIALECT) }} />}
          {res && (res.ok
            ? <div className="card" style={{ padding: 14 }}><ResultTable res={res} /></div>
            : <SqlError res={res} dbTitle={info.title} onInsert={insert} onBack={backToEditor} />)}

          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>Business questions for this database</h3><span className="muted small">{challenges.filter((c) => c.solved).length}/{challenges.length} solved</span></div>
            <p className="small muted">Each one is checked automatically against the right answer. Any correct query passes.</p>
            {challenges.map((c) => (
              <div key={c.id} className="list-row">
                <div>
                  <div className="row"><span>{plainTitle(c.title)}</span>{c.solved && <span className="badge green">Solved</span>}{!c.unlocked && <span className="badge"><Icon name="lock" size={11} />later</span>}</div>
                  <div className="tiny muted">{c.topicTitle}</div>
                </div>
                <div className="row"><Stars n={c.difficulty} /><Link className="btn sm" to={`/task/${c.id}`}>Open</Link></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {schema && <SchemaDrawer db={db} onClose={() => setSchema(false)} onInsert={insert} />}
    </div>
  );
}

function renderTable(rows: string[][]) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<table><thead><tr>${rows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td>${i ? `<code>${esc(c)}</code>` : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
