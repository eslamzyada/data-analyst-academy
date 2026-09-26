import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, trackActivity } from '../api';
import ItemRunner, { NextAction } from '../components/ItemRunner';
import QuizSession from '../components/QuizSession';
import Icon from '../components/Icon';
import { Loading, ErrorBox, Markdown, SkillTag, useApi } from '../components/ui';
import { ActivityBadge } from './Topic';
import { STATE } from '../../../shared/lifecycle.js';

export default function Today() {
  const { data: plan, error, reload } = useApi<any>('/api/today');
  const loc = useLocation();
  const nav = useNavigate();
  // the open step lives in the address, so a refresh reopens it
  const open = new URLSearchParams(loc.search).get('step');
  const setOpen = (key: string | null) => nav(key ? `/today?step=${key}` : '/today', { replace: true });
  const [lesson, setLesson] = useState<any>(null);
  const [items, setItems] = useState<Record<string, any>>({});

  useEffect(() => { trackActivity(`/today${open ? `?step=${open}` : ''}`, "Today's plan"); }, [open]);
  useEffect(() => {
    if (!plan || !open) return;
    const step = plan.steps.find((s: any) => s.key === open);
    if (open === 'learn' && !lesson) api(`/api/topics/${plan.topicId}`).then(setLesson).catch(() => {});
    if (step?.itemId && !items[step.itemId]) api(`/api/items/${step.itemId}`).then((it) => setItems((s) => ({ ...s, [it.id]: it }))).catch(() => {});
  }, [open, plan]);

  if (error) return <ErrorBox error={error} />;
  if (!plan) return <Loading />;
  const doneCount = plan.steps.filter((s: any) => s.done).length;
  const allDone = doneCount === plan.steps.length;
  async function markDone(key: string) { await api('/api/today/step', { step: key }); reload(); }

  /** The step of today's plan to do after `key`: the next one not done yet, looking forward first. */
  function stepAfter(key: string) {
    const k = plan.steps.findIndex((s: any) => s.key === key);
    return [...plan.steps.slice(k + 1), ...plan.steps.slice(0, k)].find((s: any) => !s.done && s.key !== key) || null;
  }
  const HOME = { label: "Today's plan is done: back to Home", to: '/', hint: 'Want more? Quick practice has one question at a time.' };
  function nextAfter(key: string): NextAction {
    const later = stepAfter(key);
    return later ? { label: `Next: ${later.title}`, onClick: () => setOpen(later.key) } : HOME;
  }
  function nextLink(key: string) {
    const later = stepAfter(key);
    return later ? { label: `Next: ${later.title}`, to: `/today?step=${later.key}` } : HOME;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/" className="small">← Home</Link>
          <h1 style={{ marginTop: 6 }}>Today's plan</h1>
          <p>{plan.reason}</p>
        </div>
        <div className="row"><SkillTag skill={plan.skill} name={plan.skillName} /><span className="badge">{plan.level} curriculum</span><b>{plan.topicTitle}</b></div>
      </div>
      <div className="card tint" style={{ marginBottom: 16 }}>
        <div className="row between">
          <span>{allDone ? 'All done for today. Great work. Come back tomorrow, or keep going with Quick practice.' : `${doneCount} of ${plan.steps.length} steps done`}</span>
          {allDone ? <Link className="btn sm primary" to="/quick">Quick practice<Icon name="arrow" size={14} /></Link>
            : <span className="small muted">≈ {plan.steps.reduce((s: number, x: any) => s + (x.minutes || 0), 0)} minutes in total</span>}
        </div>
      </div>
      <div className="stack">
        {plan.steps.map((s: any, k: number) => (
          <div key={s.key} className="card" data-step={s.key} data-state={s.state}>
            <div className={`step ${s.done ? 'done' : ''}`}>
              <div className="step-num">{s.done ? <Icon name="check" size={16} /> : k + 1}</div>
              <div>
                <b>{s.title}</b> <span className="muted">· {s.detail}</span>
                <div className="row small muted" style={{ gap: 8 }}>
                  <span>{s.minutes} minutes</span>
                  {s.skipped ? <span className="badge">Skipped for today</span> : <ActivityBadge status={s.state} />}
                </div>
              </div>
              <button className={`btn ${open === s.key || s.done ? '' : 'primary'}`} onClick={() => setOpen(open === s.key ? null : s.key)}>
                {open === s.key ? 'Close' : s.done ? 'Open again' : s.state === STATE.NOT_STARTED ? 'Start' : 'Carry on'}
              </button>
            </div>
            {open === s.key && (
              <div style={{ marginTop: 18 }}>
                {s.key === 'learn' && (lesson ? (
                  <div className="stack">
                    <Markdown text={lesson.lesson} />
                    {lesson.tryIt && <div className="card flat"><div className="label" style={{ marginBottom: 8 }}>Try it yourself</div><ItemRunner item={lesson.tryIt} source="tryit" showHeader={false} showDone={false} /></div>}
                    {s.state === STATE.COMPLETED ? (
                      <div className="donebar" role="status">
                        <span className="done-flag"><Icon name="check" size={16} />Lesson completed</span>
                        <div className="donebar-actions"><NextButton next={nextAfter('learn')} /></div>
                      </div>
                    ) : (
                      <div><button className="btn primary" onClick={async () => { await api(`/api/topics/${plan.topicId}/lesson-done`, {}); await markDone('learn'); }}><Icon name="check" size={15} />Mark lesson complete</button></div>
                    )}
                  </div>
                ) : <Loading />)}
                {s.itemId && s.key !== 'quiz' && (items[s.itemId] ? (
                  <div className="stack">
                    <ItemRunner key={s.itemId} item={items[s.itemId]} source={s.key} planStep={s.key} ctx="task" next={nextAfter(s.key)} onAnswered={() => reload()} />
                    {!s.done && <div className="small muted">This step is ticked off when you complete it. Stuck? Use the hints, or <button className="btn ghost sm" onClick={async () => { const later = stepAfter(s.key); await markDone(s.key); setOpen(later ? later.key : null); }}>skip it for today</button></div>}
                  </div>
                ) : <Loading />)}
                {s.key === 'quiz' && <QuizSession quizKey={plan.quizKey} n={(s.itemIds || []).length || 6} title="Today's quiz" source="quiz" onFinish={() => reload()} continueTo={nextLink('quiz')} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NextButton({ next }: { next: NextAction }) {
  const nav = useNavigate();
  return <button className="btn primary" onClick={() => (next.to ? nav(next.to) : next.onClick && next.onClick())}>{next.label}<Icon name="arrow" size={16} /></button>;
}
