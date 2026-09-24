import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, SKILL_COLORS, trackActivity } from '../api';
import ItemRunner from '../components/ItemRunner';
import QuizSession from '../components/QuizSession';
import Icon from '../components/Icon';
import { Bar, Loading, ErrorBox, Markdown, Stars, StatusBadge, useApi, LEVEL_WORD } from '../components/ui';
import { STATE, STATE_LABEL } from '../../../shared/lifecycle.js';
import { Dims, NextSteps, StageLadder, StageTag } from '../components/Mastery';

export default function Topic() {
  const { id } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  // tab and open task live in the address, so a refresh comes back to exactly this screen
  const params = new URLSearchParams(loc.search);
  const tab = params.get('tab') || 'learn';
  const taskId = params.get('task');
  const { data: t, error, reload } = useApi<any>(`/api/topics/${id}`, [id]);

  const goTo = (nextTab: string, nextTask?: string | null) => {
    const p = new URLSearchParams();
    p.set('tab', nextTab);
    if (nextTask) p.set('task', nextTask);
    nav(`/topic/${id}?${p.toString()}`);
  };
  const setTab = (k: string) => goTo(k, null);
  const setTask = (p: any) => goTo('practice', p ? p.id : null);
  const task = taskId && t ? t.practice.find((p: any) => p.id === taskId) : null;

  useEffect(() => { if (t) trackActivity(`/topic/${t.id}${loc.search}`, `${t.skillName}: ${t.title}`); }, [t?.id, loc.search]);
  // checklist and next step change as work is completed elsewhere on the page
  useEffect(() => { if (t) reload(); }, [loc.search]);

  if (error) return <ErrorBox error={error} />;
  if (!t) return <Loading />;

  if (t.status === 'locked') {
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <Link to={`/learn/${t.skill}`} className="small">← {t.skillName} path</Link>
        <h1 style={{ marginTop: 8 }}><Icon name="lock" size={22} /> {t.title}</h1>
        <p className="muted">This topic builds on: <b>{t.prereqs.join(', ')}</b>. It unlocks when those are at 50% or more. That's the fastest route, because this topic assumes you can already do them.</p>
        <div className="row">
          <Link className="btn primary" to={`/learn/${t.skill}`}>Back to the path</Link>
          <button className="btn ghost" onClick={async () => { await api(`/api/topics/${t.id}/unlock`, {}); reload(); }}>Unlock anyway</button>
        </div>
      </div>
    );
  }

  const tabs = [['learn', 'Learn'], ['practice', `Practice (${t.practice.length})`], ['quiz', `Quiz (${t.quizCount})`], ['challenge', 'Challenge']];
  const lessonDone = t.lessonState === STATE.COMPLETED;

  async function completeLesson() {
    await api(`/api/topics/${t.id}/lesson-done`, {});
    reload();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to={`/learn/${t.skill}`} className="small">← {t.skillName} path</Link>
          <h1 style={{ marginTop: 6 }}>{t.title}</h1>
          <p>{t.summary}</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <div className="row between small"><span className="row"><span className="badge" style={{ color: SKILL_COLORS[t.skill] }}>{t.skillName} · {t.level}</span><StatusBadge status={t.status} /></span><b>{t.mastery}%</b></div>
          <Bar value={t.mastery} color={SKILL_COLORS[t.skill]} />
          {t.reviewDue && <div className="small" style={{ marginTop: 6, color: 'var(--warn)' }}>Due for a review, so it stays fresh.</div>}
        </div>
      </div>

      {t.masteryView && <MasteryPanel m={t.masteryView} />}
      <Checklist steps={t.checklist} onGo={(s: any) => goTo(s.tab, s.task)} next={t.next} />

      <div className="tabs">
        {tabs.map(([k, label]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {tab === 'learn' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="card" style={{ padding: 26 }}>
            <Markdown text={t.lesson} />
          </div>
          {t.tryIt && (
            <div className="card" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 8 }}>Try it yourself</div>
              <ItemRunner item={t.tryIt} source="tryit" showHeader={false} showDone={false}
                onAnswered={() => reload()} />
            </div>
          )}
          {lessonDone ? (
            <div className="donebar card" role="status">
              <span className="done-flag"><Icon name="check" size={16} />Lesson completed</span>
              {t.afterLesson && <Link className="btn primary" to={t.afterLesson.to}>{t.afterLesson.label.replace(/^Next: /, 'Continue: ')}<Icon name="arrow" size={16} /></Link>}
            </div>
          ) : (
            <div className="row">
              <button className="btn primary" onClick={completeLesson}><Icon name="check" size={15} />Mark lesson complete</button>
              <span className="muted small">Read it through, try the example, then mark it complete.</span>
            </div>
          )}
        </div>
      )}

      {tab === 'practice' && !task && (
        <div className="stack">
          {t.mistakes.length > 0 && (
            <div className="card" style={{ borderColor: '#f5c2c2', background: 'var(--bad-soft)' }}>
              <b>You've struggled with this before:</b>
              {t.mistakes.map((m: any, i: number) => <div key={i} className="small">• {m.label} ({m.count}×)</div>)}
            </div>
          )}
          {t.practice.length === 0 && <div className="card empty">This topic is practised through its quiz{t.challenge ? ' and challenge' : ''}. The real hands-on work for it is in the projects.</div>}
          {t.practice.map((p: any) => (
            <div key={p.id} className={`card ${p.id === t.recommendedPractice && p.status !== STATE.COMPLETED ? 'tint' : ''}`}>
              <div className="row between">
                <div>
                  <div className="row"><h3 style={{ margin: 0 }}>{p.title || 'Practice'}</h3><ActivityBadge status={p.status} />{p.id === t.recommendedPractice && p.status !== STATE.COMPLETED && <span className="badge blue">Recommended for you</span>}</div>
                  <div className="row small muted" style={{ marginTop: 4 }}><Stars n={p.difficulty} /><span>{LEVEL_WORD[p.difficulty]}</span>{p.business && <span className="badge">{p.business}</span>}{p.minutes && <span>{p.minutes} min</span>}<span className="badge">{typeLabel(p.type)}</span></div>
                </div>
                <button className={`btn ${p.status === STATE.COMPLETED ? '' : 'primary'}`} onClick={() => setTask(p)}>{startLabel(p.status)}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'practice' && task && (
        <div className="stack">
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setTask(null)}><Icon name="back" size={14} />All practice tasks</button>
          <div className="card" style={{ padding: 24 }}>
            <ItemRunner key={task.id} item={task} source="practice" ctx="topic" onAnswered={() => reload()} />
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        t.quizCount
          ? <QuizSession quizKey={t.quizKey} n={6} title={`${t.title} quiz`} onFinish={() => reload()} continueTo={t.afterQuiz} />
          : <div className="card empty">This topic has no quiz yet.</div>
      )}

      {tab === 'challenge' && (
        t.challenge ? (
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 8 }}><span className="label">Business challenge</span><ActivityBadge status={t.challenge.status} /></div>
            <ItemRunner key={t.challenge.id} item={t.challenge} source="challenge" ctx="topic" onAnswered={() => reload()} />
          </div>
        ) : <div className="card empty">No separate challenge for this topic. Try the <Link to="/projects">projects</Link>, where it gets used for real.</div>
      )}
    </div>
  );
}

/** ✓ Lesson  ✓ Practice 1  • Challenge  ○ Quiz, and the one thing to do next. */
function Checklist({ steps, onGo, next }: { steps: any[]; onGo: (s: any) => void; next: any }) {
  const done = steps.filter((s) => s.status === STATE.COMPLETED).length;
  const nav = useNavigate();
  return (
    <div className="stack" style={{ gap: 8, margin: '4px 0 14px' }}>
      <div className="checklist" style={{ margin: 0 }}>
        {steps.map((s) => (
          <button key={s.key} className={`chk chk-${s.status}`} onClick={() => onGo(s)} title={STATE_LABEL[s.status as keyof typeof STATE_LABEL] || s.status}>
            <span className="chk-mark">{s.status === STATE.COMPLETED ? <Icon name="check" size={12} stroke={3} /> : s.status === STATE.NOT_STARTED ? '○' : '•'}</span>
            {s.label}
          </button>
        ))}
        <span className="muted small" style={{ marginLeft: 'auto' }}>{done} of {steps.length} done</span>
      </div>
      {next && (
        <div className="nextbar">
          <span className="small muted">{done === steps.length ? 'This topic is complete.' : 'Your next step:'}</span>
          <button className="btn sm primary" onClick={() => nav(next.to)}>{done === steps.length ? next.label : next.label.replace(/^(Next|Continue):\s*/, '')}<Icon name="arrow" size={14} /></button>
        </div>
      )}
    </div>
  );
}

const startLabel = (status: string) => (status === STATE.COMPLETED ? 'Do it again' : status === STATE.NOT_STARTED ? 'Start' : 'Carry on');

export function ActivityBadge({ status }: { status?: string }) {
  if (!status || status === STATE.NOT_STARTED) return <span className="badge">Not started</span>;
  if (status === STATE.COMPLETED) return <span className="badge green"><Icon name="check" size={12} />Completed</span>;
  if (status === STATE.EVALUATED) return <span className="badge red">Try again</span>;
  if (status === STATE.SUBMITTED) return <span className="badge amber">Submitted</span>;
  return <span className="badge amber">In progress</span>;
}

export function typeLabel(type: string) {
  return ({ formula: 'Formula', sql: 'SQL', file: 'Excel file', numbers: 'Hands-on', open: 'Written', mc: 'Question', tf: 'True/false', fill: 'Fill in', number: 'Number', order: 'Order' } as any)[type] || type;
}

/** Where this topic stands: the stage, the four kinds of evidence, what would move it up, and why the next questions look the way they do. */
function MasteryPanel({ m }: { m: any }) {
  return (
    <div className="card mastery-panel">
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <span className="label" style={{ margin: 0 }}>Stage</span><StageLadder stage={m.stage} /><StageTag stage={m.stage} />
        <span className="small muted" style={{ flex: 1, minWidth: 200 }}>{m.meaning}</span>
        <Dims dims={m.dims} />
      </div>
      {m.stage !== 'strong' && m.next?.length > 0 && (
        <div className="row" style={{ gap: 10, marginTop: 8, alignItems: 'flex-start' }}>
          <span className="label" style={{ margin: '2px 0 0' }}>To move up</span>
          <div style={{ flex: 1 }}><NextSteps next={m.next} limit={3} /></div>
        </div>
      )}
      {m.adapt?.message && <div className="adapt-note small"><Icon name="target" size={14} /> {m.adapt.message}</div>}
    </div>
  );
}
