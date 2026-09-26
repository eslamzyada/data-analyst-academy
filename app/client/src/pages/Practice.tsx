import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fileUrl, SKILL_NAMES, trackActivity } from '../api';
import ItemRunner from '../components/ItemRunner';
import { DataTable } from '../components/Sheets';
import Icon from '../components/Icon';
import { Loading, ErrorBox, Stars, SkillTag, useApi, LEVEL_WORD } from '../components/ui';
import { typeLabel, ActivityBadge } from './Topic';

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'data' ? 'data' : 'tasks';
  const setTab = (t: 'tasks' | 'data') => setParams(t === 'data' ? { tab: 'data' } : {}, { replace: true });
  return (
    <div>
      <div className="page-head"><div><h1>Practice</h1><p>Real business tasks on real data. Hands-on work is where skill is built.</p></div></div>
      <div className="tabs">
        <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Practice tasks</button>
        <button className={tab === 'data' ? 'on' : ''} onClick={() => setTab('data')}>Data library</button>
      </div>
      {tab === 'tasks' ? <TaskList /> : <DataLibrary />}
    </div>
  );
}

function TaskList() {
  const { data, error } = useApi<any>('/api/practice');
  const [params, setParams] = useSearchParams();
  const f = {
    skill: params.get('skill') || 'all', topic: params.get('topic') || 'all', area: params.get('area') || 'all',
    level: params.get('level') || 'all', diff: params.get('diff') || 'all', status: params.get('status') || 'open',
  };
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set('tab', 'tasks');
    if (v === 'all' || (k === 'status' && v === 'open')) p.delete(k); else p.set(k, v);
    if (k === 'skill') p.delete('topic');
    setParams(p, { replace: true });
  };
  const tasks = data?.tasks || [];
  const topics = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tasks) if (f.skill === 'all' || t.skill === f.skill) seen.set(t.topicId, t.topicTitle);
    return [...seen.entries()];
  }, [tasks, f.skill]);
  const areas = useMemo(() => [...new Set(tasks.map((t: any) => t.business).filter(Boolean))].sort() as string[], [tasks]);
  const list = useMemo(() => tasks.filter((t: any) =>
    (f.skill === 'all' || t.skill === f.skill) && (f.topic === 'all' || t.topicId === f.topic) &&
    (f.area === 'all' || t.business === f.area) && (f.level === 'all' || t.level === f.level) &&
    (f.diff === 'all' || String(t.difficulty) === f.diff) &&
    (f.status === 'all' || (f.status === 'open' && t.status !== 'completed') || t.status === f.status)), [tasks, params]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const rec = tasks.find((t: any) => t.id === data.recommended);
  const counts = { done: tasks.filter((t: any) => t.status === 'completed').length, total: tasks.length };
  const filtered = ['skill', 'topic', 'area', 'level', 'diff', 'status'].some((k) => params.get(k));
  return (
    <div className="stack">
      {rec && rec.status !== 'completed' && (
        <div className="card tint">
          <div className="label">Recommended for you</div>
          <div className="row between" style={{ marginTop: 6 }}>
            <div><h3 style={{ margin: 0 }}>{rec.title}</h3><div className="small muted">{data.reason} · {rec.topicTitle}</div></div>
            <Link className="btn primary" to={`/task/${rec.id}`}><Icon name="play" size={14} />{rec.status === 'in-progress' ? 'Carry on' : 'Start'}</Link>
          </div>
        </div>
      )}
      <div className="filters">
        <select value={f.skill} onChange={(e) => set('skill', e.target.value)} aria-label="Skill"><option value="all">All skills</option>{Object.entries(SKILL_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={f.topic} onChange={(e) => set('topic', e.target.value)} aria-label="Topic"><option value="all">All topics</option>{topics.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
        <select value={f.area} onChange={(e) => set('area', e.target.value)} aria-label="Business area"><option value="all">All business areas</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <select value={f.level} onChange={(e) => set('level', e.target.value)} aria-label="Level"><option value="all">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
        <select value={f.diff} onChange={(e) => set('diff', e.target.value)} aria-label="Difficulty"><option value="all">Any difficulty</option>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={String(d)}>{'★'.repeat(d)} {LEVEL_WORD[d]}</option>)}</select>
        <div className="pill-toggle">{[['open', 'To do'], ['in-progress', 'In progress'], ['completed', 'Completed'], ['all', 'All']].map(([k, v]) => <button key={k} className={f.status === k ? 'on' : ''} onClick={() => set('status', k)}>{v}</button>)}</div>
        {filtered && <button className="linky small" onClick={() => setParams(new URLSearchParams({ tab: 'tasks' }), { replace: true })}>Clear filters</button>}
        <span className="muted small" style={{ marginLeft: 'auto' }}>{list.length} shown · {counts.done} of {counts.total} completed</span>
      </div>
      {list.length === 0 && <div className="card empty">No tasks match these filters.</div>}
      <div className="grid two">
        {list.map((t: any) => (
          <div key={t.id} className="card" style={{ opacity: t.unlocked ? 1 : 0.65 }}>
            <div className="row between">
              <SkillTag skill={t.skill} name={SKILL_NAMES[t.skill]} />
              <ActivityBadge status={t.status} />
            </div>
            <h3 style={{ margin: '10px 0 4px' }}>{t.title || 'Practice task'}</h3>
            <div className="small muted">{t.topicTitle} · {t.level} curriculum{t.isChallenge ? ' · Challenge' : ''}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <Stars n={t.difficulty} />
              <span className="badge">{typeLabel(t.type)}</span>{t.business && <span className="badge">{t.business}</span>}
              {t.minutes && <span className="small muted"><Icon name="clock" size={12} /> {t.minutes} min</span>}
              {!t.unlocked && <span className="badge"><Icon name="lock" size={11} />Topic locked</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className={`btn sm ${t.status === 'completed' ? '' : 'primary'}`} to={`/task/${t.id}`}>
                {t.status === 'completed' ? 'Do it again' : t.status === 'in-progress' ? 'Carry on' : 'Start'} <Icon name="arrow" size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataLibrary() {
  const { data, error } = useApi<any[]>('/api/datasets');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div className="grid two">
      {data.map((d) => (
        <div key={d.id} className="card">
          <div className="row between"><span className="badge">{d.business}</span>{d.messy ? <span className="badge amber">Messy: needs cleaning</span> : <span className="badge green">Clean: focus on analysis</span>}</div>
          <h3 style={{ margin: '10px 0 4px' }}>{d.title}</h3>
          <div className="small muted" style={{ marginBottom: 8 }}>{d.size}</div>
          <p className="small" style={{ margin: '0 0 12px' }}>{d.description}</p>
          <div className="row">
            {d.hasPreview && <Link className="btn sm" to={`/data/${d.id}`}><Icon name="table" size={14} />Open in the app</Link>}
            {d.download && <a className="btn sm" href={fileUrl(d.download)}><Icon name="download" size={14} />Download</a>}
            {d.sqlDb && <Link className="btn sm ghost" to={`/sql?db=${d.sqlDb}`}><Icon name="sql" size={14} />SQL Lab</Link>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DatasetPage() {
  const { id } = useParams();
  const { data } = useApi<any[]>('/api/datasets');
  const d = data?.find((x) => x.id === id);
  const [part, setPart] = useState<string | undefined>(undefined);
  useEffect(() => { setPart(undefined); }, [id]);
  if (!data) return <Loading />;
  if (!d) return <ErrorBox error="Dataset not found" />;
  return (
    <div>
      <div className="page-head">
        <div><Link to="/practice" className="small">← Practice</Link><h1 style={{ marginTop: 6 }}>{d.title}</h1><p>{d.description}</p></div>
        <div className="row">
          {d.download && <a className="btn primary" href={fileUrl(d.download)}><Icon name="download" size={15} />Download</a>}
          {(d.extra || []).map((x: any) => <a key={x.path} className="btn" href={fileUrl(x.path)}><Icon name="download" size={14} />{x.label}</a>)}
          {d.sqlDb && <Link className="btn" to={`/sql?db=${d.sqlDb}`}><Icon name="sql" size={15} />Open in SQL Lab</Link>}
        </div>
      </div>
      {d.parts && <div className="tabs">{d.parts.map((p: any) => <button key={p.key} className={(part || d.parts[0].key) === p.key ? 'on' : ''} onClick={() => setPart(p.key)}>{p.label}</button>)}</div>}
      <div className="card"><DataTable datasetId={d.id} part={part} /></div>
      {d.messy && <p className="muted small" style={{ marginTop: 10 }}>This is the raw data exactly as delivered, problems included. Finding them is part of the job.</p>}
    </div>
  );
}

export function TaskPage() {
  const { id } = useParams();
  const { data: item, error } = useApi<any>(`/api/items/${id}`, [id]);
  useEffect(() => { if (item) trackActivity(`/task/${item.id}`, item.title || 'Practice task'); }, [item?.id]);
  if (error) return <ErrorBox error={error} />;
  if (!item) return <Loading />;
  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <Link to={item.topicId ? `/topic/${item.topicId}?tab=practice` : '/practice'} className="small">← Back to the topic</Link>
        <span className="muted small">{LEVEL_WORD[item.difficulty]}</span>
      </div>
      <div className="card" style={{ padding: 26 }}>
        <ItemRunner item={item} source={item.source === 'challenge' ? 'challenge' : item.source === 'quiz' ? 'quiz' : item.source === 'tryit' ? 'tryit' : 'practice'}
          key={item.id} ctx="task" />
      </div>
    </div>
  );
}
