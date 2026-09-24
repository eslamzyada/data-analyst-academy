import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { api } from '../api';
import { fmtNum } from './ui';
import Icon from './Icon';

// ------------------------------------------------------------------ spreadsheet grid for formula tasks
const colLetter = (i: number) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const parseAddr = (a: string) => { const m = /^([A-Z]+)(\d+)$/.exec(a); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return { col: c - 1, row: Number(m[2]) - 1 }; };
const show = (v: any) => (v && typeof v === 'object' && v.error ? v.error : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v === 'number' ? fmtNum(Math.round(v * 10000) / 10000) : v ?? '');

export function FormulaGrid({ grid, target, fillTo, cells, spill, correct }: { grid: any; target: string; fillTo?: string | null; cells?: any[]; spill?: any[][] | null; correct?: boolean | null }) {
  const t = parseAddr(target);
  const f = fillTo ? parseAddr(fillTo) : t;
  const results: Record<string, any> = {};
  for (const c of cells || []) results[c.addr] = c.value;
  const spillMap: Record<string, any> = {};
  (spill || []).forEach((row, i) => row.forEach((v, j) => { spillMap[`${colLetter(t.col + j)}${t.row + 1 + i}`] = v; }));
  const height = Math.max(grid.rows.length, f.row + 1, t.row + (spill ? spill.length : 1));
  const width = Math.max(...grid.rows.map((r: any[]) => r.length), f.col + 1, t.col + (spill && spill[0] ? spill[0].length : 1));
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead><tr><th />{Array.from({ length: width }, (_, i) => <th key={i}>{colLetter(i)}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: height }, (_, r) => (
            <tr key={r}>
              <td className="rh">{r + 1}</td>
              {Array.from({ length: width }, (_, c) => {
                const addr = `${colLetter(c)}${r + 1}`;
                const raw = grid.rows[r] ? grid.rows[r][c] : null;
                const inFill = r >= t.row && r <= f.row && c >= t.col && c <= f.col;
                const res = addr in results ? results[addr] : addr in spillMap ? spillMap[addr] : undefined;
                const cls = [
                  r === 0 && typeof raw === 'string' ? 'hdr' : '',
                  typeof (res ?? raw) === 'number' ? 'num' : '',
                  addr === target ? 'target' : inFill ? 'fill' : '',
                  res !== undefined && addr in results ? (correct === true ? 'res-ok' : correct === false ? 'res-bad' : '') : '',
                  res !== undefined && !(addr in results) ? 'spill' : '',
                ].join(' ');
                return <td key={c} className={cls}>{res !== undefined ? show(res) : show(raw)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ SQL editor (CodeMirror)
let dbCache: any[] | null = null;
export async function loadDbs() {
  if (!dbCache) dbCache = await api('/api/sql/dbs');
  return dbCache;
}

export function SqlEditor({ value, onChange, onRun, db, height = '180px' }: { value: string; onChange: (v: string) => void; onRun?: () => void; db?: string; height?: string }) {
  const [schema, setSchema] = useState<any>(undefined);
  useEffect(() => {
    if (!db) return;
    loadDbs().then((dbs) => {
      const d = dbs.find((x) => x.id === db);
      if (d) setSchema(Object.fromEntries(d.tables.map((t: any) => [t.name, t.columns.map((c: any) => c.name)])));
    }).catch(() => {});
  }, [db]);
  const extensions = useMemo(() => [
    sqlLang({ dialect: SQLite, schema, upperCaseKeywords: true }),
    Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { onRun && onRun(); return true; } }])),
  ], [schema, onRun]);
  return (
    <div className="cm-wrap">
      <CodeMirror value={value} height={height} extensions={extensions} onChange={onChange} basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, autocompletion: true }} />
    </div>
  );
}

/** Query results show numbers as they are: no thousands separators on IDs or years. */
const raw = (v: any) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : v);

export function ResultTable({ res }: { res: any }) {
  if (!res) return null;
  if (!res.columns || !res.columns.length) {
    return <div className="muted small">The statement ran{res.changed ? ` and would change ${res.changed} row(s)` : ''}. Practice databases are read-only, so nothing was saved.</div>;
  }
  return (
    <div>
      <div className="row between small muted" style={{ marginBottom: 6 }}>
        <span>{fmtNum(res.total)} row{res.total === 1 ? '' : 's'}{res.truncated ? ` (showing the first ${res.rows.length})` : ''}</span>
        {res.ms !== undefined && <span>{res.ms} ms</span>}
      </div>
      <div className="table-wrap" style={{ maxHeight: 360 }}>
        <table className="data">
          <thead><tr>{res.columns.map((c: string, i: number) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>
            {res.rows.map((r: any[], i: number) => (
              <tr key={i}>{r.map((v, j) => <td key={j} className={v === null ? 'null' : typeof v === 'number' ? 'num' : ''}>{v === null ? 'NULL' : raw(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ table browser drawer (used inside SQL tasks)
export function SchemaDrawer({ db, onClose, onInsert }: { db: string; onClose: () => void; onInsert?: (text: string) => void }) {
  const [info, setInfo] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { loadDbs().then((d) => setInfo(d.find((x) => x.id === db))); }, [db]);
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer">
        <div className="row between"><h3 style={{ margin: 0 }}>{info?.title || 'Tables'}</h3><button className="btn ghost sm" onClick={onClose}><Icon name="x" /></button></div>
        {info && <p className="muted small" style={{ marginTop: 8 }}>{info.description}</p>}
        {info?.notes?.length > 0 && <ul className="small" style={{ paddingLeft: 18 }}>{info.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>}
        {info?.tables.map((t: any) => (
          <div key={t.name} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
            <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === t.name ? null : t.name)}>
              <b className="mono">{t.name}</b><span className="muted tiny">{fmtNum(t.rows)} rows</span>
            </div>
            <div className="muted small">{t.description}</div>
            {open === t.name && (
              <div style={{ marginTop: 6 }}>
                {t.columns.map((c: any) => (
                  <div key={c.name} className="small" style={{ padding: '2px 0' }}>
                    <span className="mono" style={{ cursor: onInsert ? 'pointer' : 'default', color: 'var(--primary-ink)' }} onClick={() => onInsert && onInsert(c.name)}>{c.name}</span>
                    <span className="muted tiny"> {c.type.toLowerCase()}</span>{c.description && <span className="muted tiny"> · {c.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ dataset viewer
export function DataTable({ datasetId, part }: { datasetId: string; part?: string }) {
  const [state, setState] = useState({ offset: 0, q: '', sort: '', desc: false });
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const limit = 50;
  useEffect(() => {
    const qs = new URLSearchParams({ offset: String(state.offset), limit: String(limit), q: state.q, desc: state.desc ? '1' : '0' });
    if (state.sort) qs.set('sort', state.sort);
    if (part) qs.set('part', part);
    api(`/api/datasets/${datasetId}/preview?${qs}`).then(setData).catch((e) => setErr(e.message));
  }, [datasetId, part, state]);
  if (err) return <div className="sql-error">{err}</div>;
  if (!data) return <div className="loading"><span className="spinner" /> Opening the data…</div>;
  return (
    <div className="stack">
      <div className="row between">
        <input type="text" placeholder="Search all columns…" style={{ maxWidth: 280 }} defaultValue={state.q}
          onKeyDown={(e) => { if (e.key === 'Enter') setState({ ...state, q: (e.target as HTMLInputElement).value, offset: 0 }); }} />
        <span className="muted small">{fmtNum(data.total)} rows · click a column to sort</span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr>{data.columns.map((c: string) => (
            <th key={c} onClick={() => setState({ ...state, sort: c, desc: state.sort === c ? !state.desc : false, offset: 0 })}>
              {c}{state.sort === c ? (state.desc ? ' ↓' : ' ↑') : ''}
            </th>))}</tr></thead>
          <tbody>
            {data.rows.map((r: any[], i: number) => (
              <tr key={i}>{r.map((v, j) => <td key={j} className={v === null || v === '' ? 'null' : typeof v === 'number' ? 'num' : ''}>{v === null || v === '' ? '(empty)' : raw(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button className="btn sm" disabled={state.offset === 0} onClick={() => setState({ ...state, offset: Math.max(0, state.offset - limit) })}>Previous</button>
        <span className="muted small">rows {data.total ? state.offset + 1 : 0}–{Math.min(state.offset + limit, data.total)}</span>
        <button className="btn sm" disabled={state.offset + limit >= data.total} onClick={() => setState({ ...state, offset: state.offset + limit })}>Next</button>
      </div>
    </div>
  );
}
