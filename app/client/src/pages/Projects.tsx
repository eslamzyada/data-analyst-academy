import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileUrl, trackActivity } from '../api';
import Icon from '../components/Icon';
import { Loading, ErrorBox, Markdown, Stars, useApi } from '../components/ui';
import { useSavedWork } from '../saved';
import { ActivityBadge } from './Topic';
import { CriteriaProfile, ReasoningCheck, SelectResult, ToolVerdicts } from '../components/Mastery';

// ------------------------------------------------------------------ project library
export default function Projects() {
  const { data, error } = useApi<any[]>('/api/projects');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const areas = [...new Set(data.map((p) => p.business))].sort();
  const shown = data.filter((p) => (!area || p.business === area) && (!status || p.status === status));
  const done = data.filter((p) => p.status === 'completed').length;
  return (
    <div>
      <div className="page-head">
        <div><h1>Projects</h1><p>Real situations with real data. Nobody tells you which formulas to use: you investigate, conclude and recommend.</p></div>
        <div className="small muted">{done} of {data.length} finished</div>
      </div>
      <div className="filters">
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Business area">
          <option value="">All business areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="not-started">Not started</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        {(area || status) && <button className="linky small" onClick={() => { setArea(''); setStatus(''); }}>Clear filters</button>}
      </div>
      {shown.length === 0 && <div className="card empty">No projects match these filters.</div>}
      <div className="grid three">
        {shown.map((p) => (
          <div key={p.id} className="card project-card">
            <div className="row between"><span className="badge">{p.business}</span><ActivityBadge status={p.status} /></div>
            <h3 style={{ margin: 0 }}>{p.title}</h3>
            <p className="small muted" style={{ margin: 0, flex: 1 }}>{p.summary}</p>
            <div className="row small muted" style={{ gap: 10 }}>
              <Stars n={p.difficulty} />
              {p.minutes && <span><Icon name="clock" size={13} /> about {p.minutes} min</span>}
              {p.tool && <span>{p.tool}</span>}
            </div>
            <div className="small muted">Skills: {p.skills.join(', ')}<br />Best after: {p.recommendedAfter}</div>
            <div className="meter"><span style={{ width: `${Math.round((p.done / p.steps) * 100)}%` }} /></div>
            <div className="row between">
              <span className="small">{p.done} of {p.steps} steps{p.finalScore !== null && <> · score <b>{Math.round(p.finalScore * 100)}%</b></>}</span>
              <Link className={`btn sm ${p.status === 'completed' ? '' : 'primary'}`} to={`/projects/${p.id}`}>
                {p.status === 'completed' ? 'Review' : p.status === 'in-progress' ? 'Continue' : 'Start'} <Icon name="arrow" size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ one project
type Draft = { drafts: Record<string, any>; hints: Record<string, string[]>; ticks: Record<string, boolean[]>; rticks?: Record<string, boolean[]>; summary?: any; at?: string };

export function ProjectPage() {
  const { id } = useParams();
  const { data: p, error, reload } = useApi<any>(`/api/projects/${id}`, [id]);
  const { loaded, save } = useSavedWork<Draft>(id ? `project:${id}` : null);
  const [work, setWork] = useState<Draft>({ drafts: {}, hints: {}, ticks: {} });
  const current = useRef<Draft>(work);
  const ready = useRef(false);

  useEffect(() => { if (p) trackActivity(`/projects/${p.id}`, `Project: ${p.title}`); }, [p?.id]);
  useEffect(() => {
    ready.current = false;
    if (loaded) {
      const s = loaded.state;
      const restored = { drafts: s?.drafts || {}, hints: s?.hints || {}, ticks: s?.ticks || {}, rticks: s?.rticks || {}, summary: s?.summary };
      current.current = restored;
      setWork(restored);
      ready.current = true;
    }
  }, [loaded]);

  const update = (fn: (w: Draft) => Draft, now = false) => {
    const next = fn(current.current);
    current.current = next;
    setWork(next);
    if (ready.current) save({ ...next, at: new Date().toISOString() }, now);
  };

  if (error) return <ErrorBox error={error} />;
  if (!p || !loaded) return <Loading />;

  const stepDone = (s: any) => s.saved && s.saved.score !== null && s.saved.score !== undefined;
  const doneCount = p.steps.filter(stepDone).length;
  const finished = stepDone(p.steps[p.steps.length - 1]);
  const firstOpen = p.steps.find((s: any) => !stepDone(s));

  return (
    <div>
      <div className="page-head">
        <div><Link to="/projects" className="small">← Projects</Link><h1 style={{ marginTop: 6 }}>{p.title}</h1></div>
        <div className="small muted">{doneCount} of {p.steps.length} steps done</div>
      </div>

      {finished && <ProjectResult project={p} summary={work.summary ?? p.summary} />}

      <div className="grid project-layout">
        <div className="stack">
          <div className="card" style={{ padding: 24 }}><Markdown text={p.brief} /></div>
          {p.steps.map((s: any, i: number) => (
            <Step key={s.id} project={p} step={s} n={i + 1}
              next={p.steps[i + 1] || null}
              draft={work.drafts[s.id]}
              hints={work.hints[s.id] || []}
              ticks={work.ticks[s.id] || []}
              rticks={(work.rticks || {})[s.id] || []}
              onDraft={(a) => update((w) => ({ ...w, drafts: { ...w.drafts, [s.id]: a } }))}
              onHints={(h) => update((w) => ({ ...w, hints: { ...w.hints, [s.id]: h } }), true)}
              onTicks={(t) => update((w) => ({ ...w, ticks: { ...w.ticks, [s.id]: t } }))}
              onRTicks={(t) => update((w) => ({ ...w, rticks: { ...(w.rticks || {}), [s.id]: t } }))}
              onSummary={(sum) => update((w) => ({ ...w, summary: sum }), true)}
              onSaved={reload}
              projectNext={p.next} />
          ))}
        </div>
        <div className="card side-panel">
          <div className="label">Your materials</div>
          <div className="stack" style={{ marginTop: 10 }}>
            {(p.files || []).map((f: any) => <a key={f.path} className="btn sm" href={fileUrl(f.path)}><Icon name="download" size={14} />{f.label}</a>)}
            {p.db && <Link className="btn sm" to={`/sql?db=${p.db}`}><Icon name="sql" size={14} />Open the database in SQL Lab</Link>}
            {p.datasets.map((d: string) => <Link key={d} className="btn sm ghost" to={`/data/${d}`}><Icon name="table" size={14} />View {d}</Link>)}
          </div>
          <div className="divider" />
          <div className="label">Steps</div>
          {p.steps.map((s: any, i: number) => {
            const sc = s.saved?.score;
            const state = sc === null || sc === undefined ? (work.drafts[s.id] ? 'draft' : 'open') : sc >= 0.999 ? 'good' : 'part';
            return (
              <a key={s.id} href={`#step-${s.id}`} className={`step-link step-${state}`} onClick={(e) => { e.preventDefault(); document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <span className="step-dot">{state === 'good' ? <Icon name="check" size={12} stroke={3} /> : state === 'part' ? `${Math.round(sc * 100)}` : i + 1}</span>
                <span>{s.title}</span>
              </a>
            );
          })}
          {!finished && firstOpen && (
            <button className="btn primary sm" style={{ marginTop: 12, width: '100%' }} onClick={() => document.getElementById(`step-${firstOpen.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {doneCount || Object.keys(work.drafts).length ? 'Carry on' : 'Start'} with step {p.steps.indexOf(firstOpen) + 1}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectResult({ project, summary }: { project: any; summary: any }) {
  const final = project.steps[project.steps.length - 1].saved;
  const pct = Math.round((summary?.projectScore ?? final?.score ?? 0) * 100);
  const next = project.next;
  return (
    <div className="card result-card" id="project-result" style={{ scrollMarginTop: 16 }}>
      <div className="row between" style={{ alignItems: 'flex-end', gap: 16 }}>
        <div>
          <span className="done-flag"><Icon name="check" size={15} />Project completed</span>
          <div className="big-number" style={{ marginTop: 8 }}>{pct}%</div>
          <div className="muted small">Average over every step. A skipped step counts as zero.</div>
        </div>
        <div className="scorebar"><span style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)' }} /></div>
      </div>
      {(summary?.criteria || project.criteria) && (
        <>
          <div className="label" style={{ marginTop: 14 }}>Judged on ten criteria, not only the numbers</div>
          <CriteriaProfile criteria={summary?.criteria || project.criteria} />
        </>
      )}
      {summary ? (
        <div className="grid two" style={{ marginTop: 14 }}>
          <div>
            <div className="label" style={{ color: 'var(--good)' }}>What you did well</div>
            {summary.strong.length ? summary.strong.map((t: string) => <div key={t} className="small"><Icon name="check" size={13} /> {t}</div>) : <div className="small muted">No step fully right yet.</div>}
            {summary.covered.length > 0 && <div className="small muted" style={{ marginTop: 6 }}>Your report covered {summary.covered.length} of {summary.covered.length + summary.missed.length} key points.</div>}
          </div>
          <div>
            <div className="label" style={{ color: 'var(--bad)' }}>What needs another look</div>
            {summary.weak.map((w: any) => <div key={w.title} className="small"><Icon name="x" size={13} /> {w.title} ({Math.round(w.score * 100)}%)</div>)}
            {summary.skipped.map((t: string) => <div key={t} className="small"><Icon name="x" size={13} /> {t} (not answered)</div>)}
            {summary.missed.slice(0, 4).map((m: string) => <div key={m} className="small muted">• Report did not cover: {m}</div>)}
            {!summary.weak.length && !summary.skipped.length && !summary.missed.length && <div className="small muted">Nothing. That is a complete piece of work.</div>}
          </div>
        </div>
      ) : <p className="small muted">You can change any step below and check it again; the score updates when you re-save the final report.</p>}
      <div className="row" style={{ marginTop: 14 }}>
        {next ? <Link className="btn primary" to={next.to}>{next.label} <Icon name="arrow" size={14} /></Link>
          : <Link className="btn primary" to="/projects">Back to projects <Icon name="arrow" size={14} /></Link>}
        <button className="btn" onClick={() => document.getElementById(`step-${project.steps[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Icon name="eye" size={15} />Review my answers</button>
        <Link className="btn ghost" to="/progress">See my progress</Link>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Want a better score? Change any step below, check it again, then save the final report again.</p>
    </div>
  );
}

type StepProps = {
  project: any; step: any; n: number; next: any;
  draft: any; hints: string[]; ticks: boolean[]; rticks: boolean[];
  onDraft: (a: any) => void; onHints: (h: string[]) => void; onTicks: (t: boolean[]) => void; onRTicks: (t: boolean[]) => void; onSummary: (s: any) => void; onSaved: () => void;
  projectNext?: { label: string; to: string } | null;
};

function blankAnswer(step: any) {
  if (step.type === 'numbers') return step.questions.map(() => '');
  if (step.type === 'report') return Object.fromEntries(step.fields.map((f: string) => [f, '']));
  if (step.type === 'select') return [];
  if (step.type === 'tools') return { tools: [], why: '' };
  return null;
}

function Step({ project, step, n, next, draft, hints, ticks, rticks, onDraft, onHints, onTicks, onRTicks, onSummary, onSaved, projectNext }: StepProps) {
  const saved = step.saved;
  // an unsaved draft wins over the last checked answer: it is the newer work
  const answer = useMemo(() => draft ?? saved?.answer ?? blankAnswer(step), [draft, saved, step]);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setAnswer = (a: any) => { onDraft(a); setRes(null); };
  // after a refresh, a handed-in report comes back at its self-check (unless it has been edited since)
  const review = res ?? (!draft && saved?.detected ? { detected: saved.detected, reasoning: saved.reasoning, model: saved.model } : null);
  useEffect(() => {
    if (step.type === 'report' && review?.detected && !ticks.length) onTicks(review.detected.map((d: any) => d.detected));
    if (step.type === 'report' && review?.reasoning && !rticks.length) onRTicks(review.reasoning.map((d: any) => d.detected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!review?.detected]);
  // a choosing step's verdict: fresh from the check, or kept from before
  const verdict = res?.result ?? (!draft ? saved?.result : null) ?? null;
  const finalChoice = ['select', 'tools'].includes(step.type) && saved?.score !== null && saved?.score !== undefined;

  async function submit(extra: any = {}) {
    setBusy(true); setErr(null);
    try {
      const r = await api(`/api/projects/${project.id}/steps/${step.id}`, { answer, ...extra });
      setRes(r);
      if (r.detected && !extra.ticks) onTicks(r.detected.map((d: any) => d.detected));
      if (r.reasoning && !extra.ticks) onRTicks(r.reasoning.map((d: any) => d.detected));
      if (r.summary) onSummary(r.summary);
      if (r.score !== null) onSaved();
    } catch (e: any) {
      setErr(`${e.message}. Your answer is still saved, so you can try again.`);
    }
    setBusy(false);
  }
  async function getHint() {
    const r = await api(`/api/projects/${project.id}/steps/${step.id}/hint`, { level: hints.length + 1 });
    onHints([...hints, r.text]);
  }

  const score = res?.score ?? saved?.score;
  const checked = score !== null && score !== undefined;
  const goNext = () => next && document.getElementById(`step-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="card" id={`step-${step.id}`} style={{ padding: 22, scrollMarginTop: 16 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>Step {n} · {step.title}</h3>
        {checked
          ? <span className={`badge ${score >= 0.999 ? 'green' : score >= 0.5 ? 'amber' : 'red'}`}>{score >= 0.999 ? 'Completed' : `${Math.round(score * 100)}%`}</span>
          : draft ? <span className="badge amber">In progress</span> : <span className="badge">Not started</span>}
      </div>
      <div style={{ marginTop: 8 }}><Markdown text={step.prompt} /></div>

      {step.type === 'numbers' && (
        <div className="stack">
          {step.questions.map((q: any, i: number) => {
            const part = res?.parts?.[i];
            return (
              <div key={i} className="row">
                <span style={{ flex: '1 1 320px' }}>{q.label}</span>
                <input type="text" style={{ flex: '0 1 220px', borderColor: part ? (part.correct ? '#86d4a3' : '#f1a7a7') : undefined }} value={answer[i] ?? ''}
                  onChange={(e) => { const a = [...answer]; a[i] = e.target.value; setAnswer(a); }} />
                {part && <span style={{ color: part.correct ? 'var(--good)' : 'var(--bad)' }}><Icon name={part.correct ? 'check' : 'x'} /></span>}
              </div>
            );
          })}
          <div className="row">
            <button className="btn primary" disabled={busy || !answer.some((x: string) => String(x || '').trim())} onClick={() => submit()}>{busy ? <span className="spinner" /> : <Icon name="check" size={15} />}{checked ? 'Check again' : 'Check'}</button>
            {step.hints > hints.length && <button className="btn sm" onClick={getHint}><Icon name="bulb" size={14} />{hints.length ? 'Another hint' : 'Hint'}</button>}
          </div>
        </div>
      )}
      {step.criteria?.length > 0 && <div className="tiny muted" style={{ marginTop: -2, marginBottom: 6 }}>Shows: {step.criteria.join(' · ')}</div>}
      {step.type === 'select' && (
        <div className="stack" style={{ margin: '10px 0' }}>
          {step.options.map((o: string, i: number) => (
            <label key={i} className="check-row"><input type="checkbox" disabled={finalChoice} checked={(answer || []).includes(i)}
              onChange={(e) => setAnswer(e.target.checked ? [...(answer || []), i] : (answer || []).filter((x: number) => x !== i))} /><span>{o}</span></label>
          ))}
          {!finalChoice && <div><button className="btn primary" disabled={busy} onClick={() => submit()}>Check</button></div>}
          {verdict && <div className={`feedback ${verdict.score >= 0.8 ? 'ok' : 'no'}`}><h4>{verdict.feedback}</h4><SelectResult result={verdict} /></div>}
        </div>
      )}
      {step.type === 'tools' && (
        <div className="stack" style={{ margin: '10px 0' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {step.tools.map((tl: any) => {
              const on = (answer?.tools || []).includes(tl.id);
              return <button key={tl.id} disabled={finalChoice} className={`btn ${on ? 'primary' : ''}`} onClick={() => setAnswer({ ...answer, tools: on ? answer.tools.filter((x: string) => x !== tl.id) : [...(answer?.tools || []), tl.id] })}>{on && <Icon name="check" size={14} />}{tl.name}</button>;
            })}
          </div>
          <div className="field"><label>Why? What decided it?</label><textarea disabled={finalChoice} value={answer?.why || ''} onChange={(e) => setAnswer({ ...answer, why: e.target.value })} style={{ minHeight: 60 }} /></div>
          <div className="tiny muted">Things that usually decide it: {(step.criteriaHelp || []).join(', ')}.</div>
          {!finalChoice && <div><button className="btn primary" disabled={busy || !(answer?.tools || []).length} onClick={() => submit()}>Check</button></div>}
          {verdict && <div className={`feedback ${verdict.score >= 0.8 ? 'ok' : 'no'}`}><h4>{verdict.feedback}</h4><ToolVerdicts result={verdict} /></div>}
        </div>
      )}
      {step.type === 'choice' && (
        <div className="options">
          {step.options.map((o: string, i: number) => (
            <button key={i} className={`option ${answer === i ? (res ? (res.score === 1 ? 'right' : 'wrong') : 'sel') : ''}`} onClick={() => setAnswer(i)}>{o}</button>
          ))}
          <div><button className="btn primary" disabled={answer === null || answer === undefined || busy} onClick={() => submit()}>Check</button></div>
        </div>
      )}
      {step.type === 'report' && (
        <div className="stack">
          {step.fields.map((f: string) => (
            <div key={f} className="field"><label>{f}</label><textarea value={answer[f] || ''} onChange={(e) => setAnswer({ ...answer, [f]: e.target.value })} style={{ minHeight: 80 }} /></div>
          ))}
          <div><button className="btn primary" disabled={busy || !Object.values(answer || {}).some((v) => String(v || '').trim())} onClick={() => submit()}>Submit my findings</button></div>
          {review?.detected && (
            <div className="feedback info">
              <h4>Check your report against the key points</h4>
              <p className="small muted">Ticked = the app found it in your answer. Tick anything else you really covered, then save.</p>
              {step.checklist.map((c: string, i: number) => (
                <label key={i} className="check-row"><input type="checkbox" checked={!!ticks[i]} onChange={(e) => { const t = [...ticks]; t[i] = e.target.checked; onTicks(t); }} /><span>{c}</span></label>
              ))}
              {review.reasoning && (
                <>
                  <div className="label" style={{ marginTop: 12 }}>And the reasoning</div>
                  <p className="tiny muted" style={{ margin: '2px 0 4px' }}>Not right or wrong: what a manager looks for in a conclusion. What only you ticked counts a little less.</p>
                  <ReasoningCheck items={review.reasoning.map((r: any, i: number) => ({ ...r, hint: step.reasoningLabels?.[i]?.hint }))} ticks={rticks} onTicks={onRTicks} />
                </>
              )}
              <button className="btn primary" style={{ marginTop: 10 }} disabled={busy} onClick={() => submit(review.reasoning ? { ticks, reasoningTicks: rticks } : { ticks })}>Save and finish the project</button>
              {review.model && <div className="helptext answer"><div className="label">A strong answer</div><Markdown text={review.model} /></div>}
            </div>
          )}
        </div>
      )}

      {err && <div className="sql-error" style={{ marginTop: 10 }}>{err}</div>}
      {hints.map((h, i) => <div key={i} className="helptext"><div className="label">Hint {i + 1}</div>{h}</div>)}
      {res?.explain && step.type !== 'report' && <div className={`feedback ${res.score >= 0.999 ? 'ok' : 'no'}`}><h4>{res.score >= 0.999 ? 'Right' : res.score > 0 ? `${Math.round(res.score * 100)}% right` : 'Not quite'}</h4><Markdown text={res.explain} /></div>}
      {!res && checked && !['report', 'select', 'tools'].includes(step.type) && <p className="small muted" style={{ marginTop: 8 }}>Last checked: {Math.round(score * 100)}%. Change your answer and check again at any time.</p>}

      {checked && step.type === 'report' && (
        <div className="donebar" role="status">
          <span className="done-flag"><Icon name="check" size={15} />Project completed</span>
          <div className="donebar-actions">
            <button className="btn" onClick={() => document.getElementById('project-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>See my result</button>
            {(res?.next || projectNext) && <Link className="btn primary" to={(res?.next || projectNext).to}>{(res?.next || projectNext).label} <Icon name="arrow" size={15} /></Link>}
          </div>
        </div>
      )}
      {checked && step.type !== 'report' && (
        <div className="donebar">
          {score >= 0.999 ? <span className="done-flag"><Icon name="check" size={15} />Step completed</span> : <span className="small muted">You can move on and come back to this step later.</span>}
          {next && <button className="btn primary" onClick={goNext}>Next: {next.title} <Icon name="arrow" size={15} /></button>}
        </div>
      )}
    </div>
  );
}
