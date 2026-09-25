// Real Analyst mode: work requests, cross-tool challenges and mixed assessments.
// Nobody names the tool, the formula or the technique: the learner decides, then sees how it went.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileUrl, trackActivity } from '../api';
import Icon from '../components/Icon';
import { Loading, ErrorBox, Markdown, Stars, useApi } from '../components/ui';
import { CriteriaProfile, ReasoningCheck, ScopeResult, SelectResult, ToolVerdicts } from '../components/Mastery';
import { useSavedWork } from '../saved';
import { ActivityBadge } from './Topic';

// ------------------------------------------------------------------ the inbox
export default function Analyst() {
  const { data, error } = useApi<any>('/api/analyst');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const byKind = (k: string) => data.tasks.filter((t: any) => t.kind === k);
  const rec = data.tasks.find((t: any) => t.recommended);
  const due = data.assessment?.due ? data.tasks.find((t: any) => t.id === data.assessment.taskId) : null;
  const done = data.tasks.filter((t: any) => t.state === 'completed').length;
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Real Analyst</h1>
          <p>Work as it arrives. Nobody tells you which tool, formula or technique to use: you decide how to go about it, and you are judged on the result and on how you got there.</p>
        </div>
        <div className="small muted">{done} of {data.tasks.length} done</div>
      </div>

      <div className={`card analyst-intro ${data.readiness && !data.readiness.ready ? 'early' : ''}`}>
        <b>Nobody will tell you which tool to use. Your job is to investigate.</b>
        <p className="small" style={{ margin: '6px 0 0' }}>This is a step up from the topics: a real request, some data, and a question. You decide what the question really is, which data you need, which tool fits, and what the numbers mean.</p>
        {data.readiness && !data.readiness.ready && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>{data.readiness.why} You can still look around and try one now.</p>
        )}
      </div>

      <div className="grid two">
        {due ? (
          <div className="card arrival">
            <div className="label"><Icon name="alert" size={14} /> A new problem has arrived</div>
            <h3 style={{ margin: '6px 0' }}>{due.title}</h3>
            <p className="small" style={{ margin: '0 0 10px' }}>From {due.from.name}, {due.from.role}: "{due.preview}"</p>
            <p className="tiny muted" style={{ margin: '0 0 10px' }}>A mixed assessment: an unfamiliar problem, on data you have not used, with no hints. Take it when you have an hour.</p>
            <Link className="btn primary" to={`/analyst/${due.id}`}>Open it <Icon name="arrow" size={14} /></Link>
          </div>
        ) : (
          <div className="card">
            <div className="label">Mixed assessments</div>
            <p className="small" style={{ margin: '6px 0 0' }}>{data.assessment?.why}</p>
            <p className="tiny muted" style={{ margin: '6px 0 0' }}>They arrive on their own, now and then, on data you have not seen before.</p>
          </div>
        )}
        {rec && (
          <div className="card tint">
            <div className="label">Next work request · {rec.levelName}</div>
            <h3 style={{ margin: '6px 0' }}>{rec.title}</h3>
            <p className="small muted" style={{ margin: '0 0 10px' }}>From {rec.from.name}, {rec.from.role}</p>
            <Link className="btn primary" to={`/analyst/${rec.id}`}>{rec.state === 'in-progress' ? 'Carry on' : 'Start'} <Icon name="arrow" size={14} /></Link>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Work requests</h2>
        <p className="small muted" style={{ marginTop: -4 }}>They get less clear as you go: from a clear brief, to one you have to sharpen, to a one-line ask where deciding what to answer is the job.</p>
        {[1, 2, 3].map((lv) => {
          const list = byKind('request').filter((t: any) => t.level === lv);
          if (!list.length) return null;
          return (
            <div key={lv} style={{ marginBottom: 14 }}>
              <div className="label" style={{ margin: '10px 0 8px' }}>Level {lv} · {data.levels[lv]}</div>
              <div className="grid three">{list.map((t: any) => <TaskCard key={t.id} t={t} />)}</div>
            </div>
          );
        })}
      </div>

      <div className="section">
        <h2>Cross-tool challenges</h2>
        <p className="small muted" style={{ marginTop: -4 }}>{data.kinds.toolchoice.blurb} Short, and good practice for the decision every real task starts with.</p>
        <div className="grid three">{byKind('toolchoice').map((t: any) => <TaskCard key={t.id} t={t} />)}</div>
      </div>

      <div className="section">
        <h2>Mixed assessments</h2>
        <p className="small muted" style={{ marginTop: -4 }}>{data.kinds.assessment.blurb}</p>
        <div className="grid three">{byKind('assessment').map((t: any) => <TaskCard key={t.id} t={t} />)}</div>
      </div>
    </div>
  );
}

function TaskCard({ t }: { t: any }) {
  return (
    <div className={`card task-card ${t.recommended || t.due ? 'rec' : ''}`}>
      <div className="row between"><span className="badge">{t.business}</span><ActivityBadge status={t.state} /></div>
      <h3 style={{ margin: 0 }}>{t.title}</h3>
      <div className="tiny muted">From {t.from.name}, {t.from.role}</div>
      <p className="small muted" style={{ margin: 0, flex: 1 }}>"{t.preview}"</p>
      <div className="row small muted" style={{ gap: 10 }}>
        <Stars n={t.difficulty} /><span><Icon name="clock" size={13} /> about {t.minutes} min</span>
      </div>
      <div className="row between">
        <span className="small">{t.score !== null ? <>Result <b>{Math.round(t.score * 100)}%</b></> : `${t.done} of ${t.parts} parts`}</span>
        <Link className={`btn sm ${t.state === 'completed' ? '' : 'primary'}`} to={`/analyst/${t.id}`}>{t.state === 'completed' ? 'Review' : t.state === 'in-progress' ? 'Continue' : 'Open'} <Icon name="arrow" size={13} /></Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ one task
type Draft = { answers: Record<string, any>; ticks: Record<string, { points?: boolean[]; reasoning?: boolean[] }>; at?: string };

export function AnalystTask() {
  const { id } = useParams();
  const { data: t, error, setData } = useApi<any>(`/api/analyst/${id}`, [id]);
  const { loaded, save } = useSavedWork<Draft>(id ? `analyst:${id}` : null);
  const [work, setWork] = useState<Draft>({ answers: {}, ticks: {} });
  const current = useRef<Draft>(work);
  const ready = useRef(false);

  useEffect(() => { if (t) trackActivity(`/analyst/${t.id}`, `Real Analyst: ${t.title}`); }, [t?.id]);
  useEffect(() => {
    ready.current = false;
    if (loaded) {
      const restored = { answers: loaded.state?.answers || {}, ticks: loaded.state?.ticks || {} };
      current.current = restored; setWork(restored); ready.current = true;
    }
  }, [loaded]);
  const update = (fn: (w: Draft) => Draft, now = false) => {
    const next = fn(current.current);
    current.current = next; setWork(next);
    if (ready.current) save({ ...next, at: new Date().toISOString() }, now);
  };

  if (error) return <ErrorBox error={error} />;
  if (!t || !loaded) return <Loading />;
  const finished = t.state === 'completed';

  return (
    <div>
      <div className="page-head">
        <div><Link to="/analyst" className="small">← Real Analyst</Link><h1 style={{ marginTop: 6 }}>{t.title}</h1>
          <div className="row small muted"><span className="badge violet">{t.kindLabel}</span>{t.kind === 'request' && <span className="badge">Level {t.level} · {t.levelName}</span>}<Stars n={t.difficulty} /><span>about {t.minutes} min</span></div>
        </div>
        <div className="small muted">{t.done} of {t.totalParts} parts done</div>
      </div>

      {finished && t.summary && <TaskResult t={t} />}

      <div className="grid project-layout">
        <div className="stack">
          <div className="card message">
            <div className="msg-head"><span className="avatar">{t.from.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</span><div><b>{t.from.name}</b><div className="tiny muted">{t.from.role}</div></div></div>
            <Markdown text={t.message} />
          </div>
          {t.parts.map((p: any, i: number) => (
            <Part key={p.id} task={t} part={p} n={i + 1}
              draft={work.answers[p.id]} ticks={work.ticks[p.id] || {}}
              onDraft={(a) => update((w) => ({ ...w, answers: { ...w.answers, [p.id]: a } }))}
              onTicks={(tk) => update((w) => ({ ...w, ticks: { ...w.ticks, [p.id]: tk } }), true)}
              onChecked={(r) => setData(r.task)} />
          ))}
          {!finished && t.parts.length < t.totalParts && (
            <div className="card flat muted small">The next part opens once this one is checked. {t.totalParts - t.parts.length} more to come.</div>
          )}
        </div>
        <div className="card side-panel">
          <div className="label">What you have</div>
          <div className="stack" style={{ marginTop: 10 }}>
            {(t.data.files || []).map((f: any) => <a key={f.path} className="btn sm" href={fileUrl(f.path)}><Icon name="download" size={14} />{f.label}</a>)}
            {t.data.db && <Link className="btn sm" to={`/sql?db=${t.data.db}`}><Icon name="sql" size={14} />Open the database in SQL Lab</Link>}
            {(t.data.datasets || []).map((d: string) => <Link key={d} className="btn sm ghost" to={`/data/${d}`}><Icon name="table" size={14} />View {d}</Link>)}
            {!t.data.files && !t.data.db && !t.data.datasets && <span className="small muted">Nothing but the situation described: this one is about judgement.</span>}
          </div>
          {t.context && <><div className="divider" /><div className="label">Background</div><Markdown text={t.context} className="small" /></>}
          <div className="divider" />
          <div className="label">The objective</div>
          <p className="small" style={{ margin: '6px 0 0' }}>{t.objective || (t.kind === 'toolchoice' ? 'Choose how you would do it, and say why.' : 'Not given. Working out what is really needed is part of the task.')}</p>
          {t.constraints.length > 0 && <><div className="divider" /><div className="label">Constraints</div><ul className="small tight">{t.constraints.map((c: string) => <li key={c}>{c}</li>)}</ul></>}
          <div className="divider" />
          <p className="tiny muted" style={{ margin: 0 }}>Parts open one at a time, so you plan before you calculate. Choices are final once checked; findings can be checked again. What you find counts towards the tool you said you would use.</p>
        </div>
      </div>
    </div>
  );
}

function TaskResult({ t }: { t: any }) {
  const s = t.summary;
  const pct = Math.round((s.score || 0) * 100);
  return (
    <div className="card result-card" id="task-result">
      <div className="row between" style={{ alignItems: 'flex-end', gap: 16 }}>
        <div>
          <span className="done-flag"><Icon name="check" size={15} />Done</span>
          <div className="big-number" style={{ marginTop: 8 }}>{pct}%</div>
          <div className="muted small">Average over every part.</div>
        </div>
        <div className="scorebar"><span style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)' }} /></div>
      </div>
      <div className="label" style={{ marginTop: 14 }}>How the work did, criterion by criterion</div>
      <CriteriaProfile criteria={s.criteria} />
      {s.reasoning && (
        <>
          <div className="label" style={{ marginTop: 14 }}>Your reasoning</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {s.reasoning.map((r: any) => <span key={r.label} className={`badge ${r.detected ? 'green' : r.ticked ? 'amber' : r.warning ? 'red' : ''}`}>{r.label}</span>)}
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>Green: found in your text. Amber: you ticked it, the app could not see it. Red: a claim the data may not support.</p>
        </>
      )}
      <div className="divider" />
      <div className="label">What a strong answer looked like</div>
      <Markdown text={s.debrief} />
      {s.routes?.length > 0 && (
        <>
          <div className="label" style={{ marginTop: 10 }}>More than one way to get there</div>
          {s.routes.map((r: any) => <p key={r.tool} className="small" style={{ margin: '4px 0' }}><b>{r.tool}:</b> {r.how}</p>)}
        </>
      )}
      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn primary" to="/analyst">Back to Real Analyst <Icon name="arrow" size={14} /></Link>
        <Link className="btn ghost" to="/progress">See my progress</Link>
      </div>
    </div>
  );
}

type PartProps = { task: any; part: any; n: number; draft: any; ticks: { points?: boolean[]; reasoning?: boolean[] }; onDraft: (a: any) => void; onTicks: (t: any) => void; onChecked: (r: any) => void };

function blank(part: any) {
  if (part.type === 'numbers') return part.questions.map(() => '');
  if (part.type === 'select') return [];
  if (part.type === 'tools') return { tools: [], why: '' };
  if (part.type === 'conclusion') return '';
  return null;
}

function Part({ task, part, n, draft, ticks, onDraft, onTicks, onChecked }: PartProps) {
  const saved = part.saved;
  const answer = useMemo(() => draft ?? saved?.answer ?? blank(part), [draft, saved, part]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<any>(null);
  const result = fresh ?? saved?.result ?? null;
  const scored = saved?.score !== null && saved?.score !== undefined;
  const final = !!saved?.final;
  const locked = final || (scored && part.type !== 'numbers' && part.type !== 'conclusion');
  const later = task.parts.slice(task.parts.indexOf(part) + 1).some((p: any) => p.saved?.checks > 0);

  async function check(extra: any = {}) {
    setBusy(true); setErr(null);
    try {
      const r = await api(`/api/analyst/${task.id}/parts/${part.id}`, { answer, ...extra });
      setFresh(r.result);
      if (part.type === 'conclusion' && !extra.ticks) onTicks({ points: (r.result.points || []).map((p: any) => p.detected), reasoning: (r.result.reasoning || []).map((x: any) => x.detected) });
      onChecked(r);
    } catch (e: any) { setErr(`${e.message}. Your answer is still saved.`); }
    setBusy(false);
  }
  const set = (a: any) => { onDraft(a); setFresh(null); };
  const canEdit = !locked && !later;

  return (
    <div className="card" id={`part-${part.id}`} style={{ padding: 22 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{n} · {part.title}</h3>
        {scored ? <span className={`badge ${saved.score >= 0.999 ? 'green' : saved.score >= 0.5 ? 'amber' : 'red'}`}>{Math.round(saved.score * 100)}%</span> : draft ? <span className="badge amber">In progress</span> : <span className="badge">Open</span>}
      </div>
      <div style={{ marginTop: 8 }}><Markdown text={part.prompt} /></div>

      {part.type === 'scope' && (
        <div className="options">
          {part.options.map((o: string, i: number) => (
            <button key={i} disabled={!canEdit} className={`option ${answer === i ? 'sel' : ''}`} onClick={() => set(i)}>{o}</button>
          ))}
          {canEdit && <div><button className="btn primary" disabled={answer === null || answer === undefined || busy} onClick={() => check()}>Check</button></div>}
        </div>
      )}

      {part.type === 'select' && (
        <div className="stack" style={{ margin: '10px 0' }}>
          {part.options.map((o: string, i: number) => (
            <label key={i} className="check-row"><input type="checkbox" disabled={!canEdit} checked={(answer || []).includes(i)}
              onChange={(e) => set(e.target.checked ? [...(answer || []), i] : (answer || []).filter((x: number) => x !== i))} /><span>{o}</span></label>
          ))}
          {canEdit && <div><button className="btn primary" disabled={busy} onClick={() => check()}>Check</button></div>}
        </div>
      )}

      {part.type === 'tools' && (
        <div className="stack" style={{ margin: '10px 0' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {part.tools.map((tl: any) => {
              const on = (answer?.tools || []).includes(tl.id);
              return <button key={tl.id} disabled={!canEdit} className={`btn ${on ? 'primary' : ''}`} onClick={() => set({ ...answer, tools: on ? answer.tools.filter((x: string) => x !== tl.id) : [...(answer?.tools || []), tl.id] })}>{on && <Icon name="check" size={14} />}{tl.name}</button>;
            })}
          </div>
          <div className="field"><label>Why? What decided it?</label><textarea disabled={!canEdit} value={answer?.why || ''} onChange={(e) => set({ ...answer, why: e.target.value })} style={{ minHeight: 70 }} /></div>
          <div className="tiny muted">Things that usually decide it: {part.criteriaHelp.join(', ')}.</div>
          {canEdit && <div><button className="btn primary" disabled={busy || !(answer?.tools || []).length} onClick={() => check()}>Check</button></div>}
        </div>
      )}

      {part.type === 'numbers' && (
        <div className="stack">
          {part.questions.map((q: any, i: number) => {
            const pr = result?.parts?.[i];
            return (
              <div key={i} className="row">
                <span style={{ flex: '1 1 320px' }}>{q.label}</span>
                <input type="text" disabled={later} style={{ flex: '0 1 220px', borderColor: pr ? (pr.correct ? '#86d4a3' : '#f1a7a7') : undefined }} value={answer[i] ?? ''}
                  onChange={(e) => { const a = [...answer]; a[i] = e.target.value; set(a); }} />
                {pr && <span style={{ color: pr.correct ? 'var(--good)' : 'var(--bad)' }}><Icon name={pr.correct ? 'check' : 'x'} /></span>}
              </div>
            );
          })}
          {!later && <div><button className="btn primary" disabled={busy || !answer.some((x: string) => String(x || '').trim())} onClick={() => check()}>{scored ? 'Check again' : 'Check'}</button></div>}
          {later && <p className="tiny muted">A later part is checked, so these findings are final.</p>}
        </div>
      )}

      {part.type === 'conclusion' && (
        <div className="stack">
          <textarea disabled={later} value={answer || ''} onChange={(e) => set(e.target.value)} style={{ minHeight: 160 }} placeholder="Write it as you would send it." />
          {!result?.reasoning && <div><button className="btn primary" disabled={busy || !String(answer || '').trim()} onClick={() => check()}>Submit my answer</button></div>}
          {result?.reasoning && (
            <div className="feedback info">
              <h4>Check your answer</h4>
              <p className="small muted">Ticked = the app found it in your text. Tick anything else you really did, then save. What only you ticked counts a little less.</p>
              <div className="label">The reasoning</div>
              <ReasoningCheck items={result.reasoning} ticks={ticks.reasoning || []} onTicks={(r) => onTicks({ ...ticks, reasoning: r })} />
              {part.checklist?.length > 0 && <>
                <div className="label" style={{ marginTop: 10 }}>The key points</div>
                {part.checklist.map((c: string, i: number) => (
                  <label key={i} className="check-row"><input type="checkbox" checked={!!(ticks.points || [])[i]} onChange={(e) => { const pts = [...(ticks.points || [])]; pts[i] = e.target.checked; onTicks({ ...ticks, points: pts }); }} /><span>{c}</span></label>
                ))}
              </>}
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary" disabled={busy} onClick={() => check({ ticks: { reasoning: ticks.reasoning || [], points: ticks.points || [] } })}>{scored ? 'Save again' : 'Save and finish'}</button>
                <button className="btn ghost" disabled={busy} onClick={() => check()}>I changed my text: look again</button>
              </div>
            </div>
          )}
        </div>
      )}

      {err && <div className="sql-error" style={{ marginTop: 10 }}>{err}</div>}
      {result && part.type === 'tools' && result.score !== undefined && <div className={`feedback ${result.score >= 0.8 ? 'ok' : 'no'}`}><h4>{result.feedback}</h4><ToolVerdicts result={result} /></div>}
      {result && part.type === 'select' && <div className={`feedback ${result.score >= 0.8 ? 'ok' : 'no'}`}><h4>{result.feedback}</h4><SelectResult result={result} /></div>}
      {result && part.type === 'scope' && <div className={`feedback ${result.score >= 0.999 ? 'ok' : 'no'}`}><h4>{result.feedback}</h4><ScopeResult result={result} /></div>}
      {result && part.type === 'numbers' && <div className={`feedback ${result.score >= 0.999 ? 'ok' : 'no'}`}><h4>{result.feedback}</h4>{result.score < 0.999 && !later && <p className="small" style={{ margin: 0 }}>Look again at the ones marked wrong, then check again. Your first check is the one that counts as working on your own.</p>}</div>}
    </div>
  );
}
