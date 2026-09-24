import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useSavedWork } from '../saved';
import { SqlEditor, ResultTable, loadDbs } from '../components/Sheets';
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

const starterFor = (db: string) => (db === 'cedarline' ? 'SELECT *\nFROM orders\nLIMIT 20;' : db === 'restaurant' ? 'SELECT *\nFROM daily_sales\nLIMIT 20;' : 'SELECT *\nFROM employees\nLIMIT 20;');
const readLocal = (db: string) => { try { return localStorage.getItem(`sqllab:${db}`); } catch { return null; } };

type LabState = { db: string; drafts: Record<string, string> };

export default function SqlLab() {
  const loc = useLocation();
  const asked = new URLSearchParams(loc.search).get('db');
  const [dbs, setDbs] = useState<any[] | null>(null);
  const [db, setDbRaw] = useState(asked || 'cedarline');
  const [sql, setSqlRaw] = useState('');
  // the query being written, per database, saved on the server as it is typed
  const { loaded, save } = useSavedWork<LabState>('session:sqllab');
  const lab = useRef<LabState | null>(null);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showDialect, setShowDialect] = useState(false);

  useEffect(() => { loadDbs().then(setDbs); }, []);
  useEffect(() => { api(`/api/sql/challenges?db=${db}`).then(setChallenges); }, [db]);
  // once the saved copy has arrived: the last database used (unless the link names one) and its query
  useEffect(() => {
    if (!loaded || lab.current) return;
    const s = loaded.state && loaded.state.drafts ? loaded.state : { db, drafts: {} as Record<string, string> };
    const current = asked || s.db || db;
    lab.current = { db: current, drafts: { ...s.drafts } };
    setDbRaw(current);
    setSqlRaw(lab.current.drafts[current] ?? readLocal(current) ?? starterFor(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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
    setRes(null);
    if (!lab.current) return;
    lab.current = { ...lab.current, db: next };
    setSqlRaw(lab.current.drafts[next] ?? readLocal(next) ?? starterFor(next));
    save(lab.current, true);
  };

  const run = useCallback(async (text?: string) => {
    setBusy(true);
    const q = text ?? sql;
    setRes(await api('/api/sql/run', { db, sql: q }).catch((e) => ({ ok: false, error: e.message })));
    setBusy(false);
  }, [sql, db]);

  if (!dbs || !lab.current) return <Loading />;
  const info = dbs.find((d) => d.id === db);
  return (
    <div>
      <div className="page-head">
        <div><h1>SQL Lab</h1><p>Your own practice databases. Explore the tables, write queries, see results. Nothing you run can break them.</p></div>
        <div className="pill-toggle">{dbs.map((d) => <button key={d.id} className={db === d.id ? 'on' : ''} onClick={() => setDb(d.id)}>{d.title}</button>)}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card" style={{ padding: 14, position: 'sticky', top: 12, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
          <div className="label">{info.business} · tables</div>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>{info.description}</p>
          {info.tables.map((t: any) => (
            <div key={t.name} style={{ borderTop: '1px solid var(--line-2)', padding: '7px 0' }}>
              <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === t.name ? null : t.name)}>
                <b className="mono small">{t.name}</b><span className="tiny muted">{fmtNum(t.rows)}</span>
              </div>
              {open === t.name && (
                <div style={{ marginTop: 4 }}>
                  <div className="tiny muted" style={{ marginBottom: 4 }}>{t.description}</div>
                  {t.columns.map((c: any) => (
                    <div key={c.name} className="tiny" style={{ padding: '1px 0' }} title={c.description}>
                      <span className="mono" style={{ cursor: 'pointer', color: 'var(--primary-ink)' }} onClick={() => setSql((s) => `${s}${s.endsWith(' ') || s.endsWith('\n') ? '' : ' '}${c.name}`)}>{c.name}</span>
                      <span className="muted"> {c.type.toLowerCase()}</span>
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
          <SqlEditor value={sql} onChange={setSql} onRun={() => run()} db={db} height="220px" />
          <div className="row between">
            <div className="row">
              <button className="btn primary" onClick={() => run()} disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="play" size={14} />}Run query</button>
              <span className="muted small">Ctrl+Enter</span>
            </div>
            <button className="btn ghost sm" onClick={() => setShowDialect(!showDialect)}>SQLite vs SQL Server vs PostgreSQL</button>
          </div>
          {showDialect && <div className="card flat md small" dangerouslySetInnerHTML={{ __html: renderTable(DIALECT) }} />}
          {res && (res.ok ? <div className="card" style={{ padding: 14 }}><ResultTable res={res} /></div> : <div className="sql-error">{res.error}</div>)}

          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>Business questions for this database</h3><span className="muted small">{challenges.filter((c) => c.solved).length}/{challenges.length} solved</span></div>
            <p className="small muted">Each one is checked automatically against the right answer. Any correct query passes.</p>
            {challenges.map((c) => (
              <div key={c.id} className="list-row">
                <div>
                  <div className="row"><span>{c.title}</span>{c.solved && <span className="badge green">Solved</span>}{!c.unlocked && <span className="badge"><Icon name="lock" size={11} />later</span>}</div>
                  <div className="tiny muted">{c.topicTitle}</div>
                </div>
                <div className="row"><Stars n={c.difficulty} /><Link className="btn sm" to={`/task/${c.id}`}>Open</Link></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTable(rows: string[][]) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<table><thead><tr>${rows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td>${i ? `<code>${esc(c)}</code>` : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}