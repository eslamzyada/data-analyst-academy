import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SKILL_COLORS } from '../api';
import Icon from '../components/Icon';
import { Bar, Blocks, Loading, ErrorBox, StatusBadge, useApi } from '../components/ui';
import { Dims, NextSteps, StageLadder, StageTag } from '../components/Mastery';

export default function Progress() {
  const { data: p, error } = useApi<any>('/api/progress');
  const { data: quizzes } = useApi<any>('/api/quiz-sessions?finished=1&limit=8');
  const loc = useLocation();
  // "All my mistakes" from a quiz result lands here: show that list
  const focus = new URLSearchParams(loc.search).get('focus');
  useEffect(() => {
    if (!p || !focus) return undefined;
    const t = setTimeout(() => document.getElementById(focus)?.scrollIntoView({ block: 'start' }), 50);
    return () => clearTimeout(t);
  }, [p, focus]);
  if (error) return <ErrorBox error={error} />;
  if (!p) return <Loading />;
  return (
    <div>
      <div className="page-head">
        <div><h1>My progress</h1><p>Everything here comes from your own graded work. Finishing an activity is not the same as mastering it: stages move up only when your work shows you can do the thing, on real problems, without help.</p></div>
        <div className="kpi" style={{ textAlign: 'right' }}><span className="label">Topics covered</span><span className="v">{p.overall}%</span></div>
      </div>

      <AtAGlance g={p.glance} />
      <StagesExplained stages={p.mastery?.stages} />
      <Milestones m={p.milestones} />
      <WhatYouCanDo mastery={p.mastery} />

      <div className="grid two section">
        <div className="card">
          <h3>Skills</h3>
          {p.skills.map((s: any) => (
            <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
              <div className="row between"><b style={{ color: SKILL_COLORS[s.id] }}>{s.name}</b><span className="small">{s.stage} · <b>{s.progress}%</b> of topics</span></div>
              <Blocks value={s.progress} />
              <div className="row small muted" style={{ gap: 14, marginTop: 2 }}>{s.tiers.map((t: any) => <span key={t.tier}>{t.tier}: {t.avg}%</span>)}</div>
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="card">
            <h3>You are good at</h3>
            {p.strengths.length === 0 ? <p className="muted small">Not enough evidence yet. Topics appear here once your own work shows them at 75% or more.</p>
              : p.strengths.map((s: any) => <div key={s.topicId} className="list-row"><Link to={`/topic/${s.topicId}`}>{s.title}</Link><span className="badge green">{s.mastery}%</span></div>)}
          </div>
          <div className="card">
            <h3>Practice more</h3>
            {p.weaknesses.length === 0 ? <p className="muted small">Nothing flagged. Weak spots appear here when mistakes repeat or scores stay low.</p>
              : p.weaknesses.map((w: any) => <div key={w.topicId} className="list-row"><div><div>{w.title}</div><div className="tiny muted">{w.why}</div></div><Link className="btn sm" to={`/topic/${w.topicId}?tab=practice`}>Practise</Link></div>)}
          </div>
          <div className="card tint">
            <div className="label">Next</div>
            <div className="row between" style={{ marginTop: 6 }}><div><b>{p.next.title}</b><div className="small muted">{p.next.reason}</div></div><Link className="btn primary sm" to="/today"><Icon name="play" size={13} />Start today</Link></div>
          </div>
        </div>
      </div>

      <div className="grid two section">
        <div className="card" id="mistakes" style={{ scrollMarginTop: 16 }}>
          <h3>Mistakes you're still working on</h3>
          {p.mistakes.length === 0 && <p className="muted small">No open mistakes.</p>}
          {p.mistakes.map((m: any, i: number) => (
            <div key={i} className="list-row">
              <div><div><b>{m.conceptName}</b> <span className="badge red">{m.count}×</span></div><div className="tiny muted">{m.topicTitle} · {m.label}</div></div>
              {m.topicId && <Link className="btn sm" to={`/topic/${m.topicId}?tab=practice`}>Practise</Link>}
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 8 }}>A mistake is cleared after you answer that kind of question correctly twice (without big hints).</p>
        </div>
        <div className="card">
          <h3>Activity</h3>
          <div className="grid three" style={{ marginBottom: 12 }}>
            <div className="kpi"><span className="label">Answered</span><span className="v">{p.stats.answered}</span></div>
            <div className="kpi"><span className="label">Correct</span><span className="v">{p.stats.correct}</span></div>
            <div className="kpi"><span className="label">Active days</span><span className="v">{p.stats.activeDays}</span></div>
          </div>
          <h3>Recent quizzes</h3>
          {!quizzes || quizzes.sessions.length === 0 ? <p className="muted small">No finished quizzes yet.</p>
            : quizzes.sessions.map((q: any) => (
              <div key={q.id} className="list-row">
                <div><div>{q.title || 'Quiz'}</div><div className="tiny muted">{String(q.finishedAt).slice(0, 10)} · {q.correct} of {q.total} right</div></div>
                <div className="row"><span className={`badge ${q.state === 'completed' ? 'green' : 'amber'}`}>{Math.round((q.score || 0) * 100)}%</span><Link className="btn sm" to={`/quiz/session/${q.id}`}>Review</Link></div>
              </div>
            ))}
          <h3 style={{ marginTop: 14 }}>Exams</h3>
          {p.exams.length === 0 ? <p className="muted small">No exams taken yet. <Link to="/quizzes">See exams</Link></p>
            : p.exams.map((e: any, i: number) => <div key={i} className="list-row"><span>{e.title}</span><span className="small">{Math.round(e.score * 100)}% · {e.ts.slice(0, 10)}</span></div>)}
        </div>
      </div>

      <details className="section card every-topic">
        <summary><h3 style={{ display: 'inline' }}>Show every topic</h3> <span className="small muted">stage, status and reviews for all {p.topics.length} topics</span></summary>
        <div className="table-wrap" style={{ maxHeight: 440, marginTop: 10 }}>
          <table className="data">
            <thead><tr><th>Topic</th><th>Skill</th><th>Level</th><th>Stage</th><th>Status</th><th>Progress</th><th>Review</th></tr></thead>
            <tbody>
              {p.topics.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.status === 'locked' ? t.title : <Link to={`/topic/${t.id}`}>{t.title}</Link>}</td>
                  <td style={{ color: SKILL_COLORS[t.skill] }}>{t.skill.toUpperCase()}</td><td>{t.level}</td>
                  <td><span className="row" style={{ gap: 6 }}><StageLadder stage={t.stage} compact />{t.stageLabel}</span></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ minWidth: 120 }}><Bar value={t.mastery} size="thin" color={SKILL_COLORS[t.skill]} /></td>
                  <td className="small">{t.reviewDue ? <span className="badge amber">Due</span> : t.nextReview ? t.nextReview.slice(0, 10) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ------------------------------------------------------------------ the page in four lines
function AtAGlance({ g }: { g: any }) {
  if (!g) return null;
  return (
    <div className="card glance">
      <div className="glance-row"><span className="label">You are learning</span><span><b>{g.learning.skill}</b> · <Link to={`/topic/${g.learning.topicId}`}>{g.learning.topic}</Link></span></div>
      <div className="glance-row"><span className="label">Getting better at</span><span>{g.betterAt ? <><b>{g.betterAt.name}</b>{g.betterAt.skill && <span className="muted small"> ({g.betterAt.skill})</span>}</> : <span className="muted small">Not enough recent work yet: a few good answers will show it here.</span>}</span></div>
      <div className="glance-row"><span className="label">Practise more</span><span>{g.practiseMore ? <><Link to={`/topic/${g.practiseMore.topicId}?tab=practice`}>{g.practiseMore.title}</Link> <span className="muted small">· {g.practiseMore.why}</span></> : <span className="muted small">Nothing flagged. Weak spots appear when mistakes repeat.</span>}</span></div>
      <div className="glance-row"><span className="label">Next</span><span><Link className="btn primary sm" to={g.next.to}><Icon name="play" size={13} />{g.next.title}</Link> <span className="muted small">{g.next.reason}</span></span></div>
    </div>
  );
}

// ------------------------------------------------------------------ the six stages, in plain words
function StagesExplained({ stages }: { stages: any[] }) {
  if (!stages?.length) return null;
  return (
    <details className="card stages-explained">
      <summary className="small"><b>What the stages mean</b> <span className="muted">({stages.map((s) => s.label).join(' → ')})</span></summary>
      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
        {stages.map((s) => <div key={s.id} className="small"><b>{s.label}:</b> {s.meaning}</div>)}
      </div>
    </details>
  );
}

// ------------------------------------------------------------------ milestones
function Milestones({ m }: { m: any }) {
  if (!m) return null;
  return (
    <div className="card">
      <div className="row between"><h3 style={{ margin: 0 }}>Milestones</h3><span className="small muted">{m.achieved} of {m.list.length} earned</span></div>
      <p className="small muted" style={{ margin: '4px 0 12px' }}>Earned from what you have shown across several different tasks, on different days. Reading lessons never earns one.</p>
      <div className="grid three">
        {m.list.map((x: any) => (
          <div key={x.id} className={`milestone ${x.achieved ? 'won' : ''}`}>
            <div className="row between"><b>{x.name}</b>{x.achieved ? <span className="badge green">Earned {String(x.achievedAt).slice(0, 10)}</span> : <span className="badge">{x.met} of {x.total}</span>}</div>
            <div className="tiny muted" style={{ margin: '4px 0 8px' }}>{x.blurb}</div>
            {x.requirements.map((r: any, i: number) => (
              <div key={i} className={`req ${r.met ? 'met' : ''}`}>
                <span className="req-mark">{r.met ? '✓' : '○'}</span>
                <span className="small">{r.label}{r.detail && <span className="tiny muted" style={{ display: 'block' }}>{r.detail}</span>}</span>
                <span className="tiny muted">{Math.min(r.have, r.need)}/{r.need}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ what you can do, ability by ability
function WhatYouCanDo({ mastery }: { mastery: any }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!mastery) return null;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 2 }}>What you can do</h3>
      <p className="small muted" style={{ margin: '0 0 10px' }}>
        Each skill is judged ability by ability, on four kinds of evidence: <b>understands it</b>, <b>can do it</b>, <b>uses it on real problems</b>, and <b>does it without help</b>.
        Stages: {mastery.stages.map((st: any) => st.label).join(' → ')}.
      </p>
      {mastery.skills.map((sk: any) => (
        <div key={sk.id} className="mastery-skill">
          <button className="mastery-head" onClick={() => setOpen(open === sk.id ? null : sk.id)} aria-expanded={open === sk.id}>
            <b style={{ color: SKILL_COLORS[sk.id], minWidth: 150 }}>{sk.name}</b>
            <StageLadder stage={sk.stage} /><StageTag stage={sk.stage} />
            <span className="small muted" style={{ flex: 1 }}>{sk.summary}</span>
            <span className="small">{open === sk.id ? 'Hide' : 'Show abilities'}</span>
          </button>
          {sk.next && <div className="tiny muted" style={{ margin: '0 0 6px 150px' }}>To reach {sk.next.stageLabel}: {sk.next.text}</div>}
          {open === sk.id && (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ability</th><th>Stage</th><th>Evidence</th><th>What would move it up</th></tr></thead>
                <tbody>
                  {sk.competencies.map((c: any) => (
                    <tr key={c.id}>
                      <td><b>{c.name}</b><div className="tiny muted">{c.can}</div>{c.topics?.[0] && <Link className="tiny" to={`/topic/${c.topics[0]}`}>Practise it</Link>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><StageLadder stage={c.stage} compact /> <StageTag stage={c.stage} /></td>
                      <td><Dims dims={c.dims} /></td>
                      <td style={{ minWidth: 260 }}><NextSteps next={c.next} limit={2} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
