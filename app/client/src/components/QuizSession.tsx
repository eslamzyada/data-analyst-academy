// One question at a time, then a result screen that says what to do next.
//
// The quiz itself lives on the server (a "quiz attempt"): the questions, every checked answer
// and the final score. This page only remembers where you are in it and any answer you have
// chosen but not checked yet. So a refresh or an app restart comes back to the same question,
// a finished quiz stays finished, and it can always be reviewed.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ItemRunner, { Draft, hasAnswer } from './ItemRunner';
import { useSavedWork } from '../saved';
import { api, SKILL_NAMES } from '../api';
import { Loading, ErrorBox, Markdown } from './ui';
import Icon from './Icon';
import { OUTCOME } from '../../../shared/lifecycle.js';

type Props = {
  quizKey: string;                               // topic:<id> | review | today:<yyyy-mm-dd>
  n?: number;
  title?: string;
  source?: string;
  onFinish?: (session: any) => void;
  onChange?: (session: any) => void;
  continueTo?: { label: string; to: string } | null;   // used when the server has no next step
};

const REASON: Record<string, string> = {
  'missed-before': 'You missed this one before',
  new: 'New question',
  'due-for-review': 'Due for a review',
  'weak-concept': 'Picked for a weak spot',
  'fresh-numbers': 'Fresh numbers',
  'seen-recently': 'Another look (seen recently)',
};

export default function QuizSession({ quizKey, n = 6, title, source = 'quiz', onFinish, onChange, continueTo = null }: Props) {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [i, setI] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { loaded, save } = useSavedWork<any>(`quiz:${quizKey}`);

  // open the attempt the learner is on, or start one
  useEffect(() => {
    let live = true;
    setSession(null); setError(null); setReady(false);
    api('/api/quiz-sessions/open', { key: quizKey, n })
      .then((r) => { if (!live) return; setSession(r.session); setResumed(r.resumed && r.session.answered > 0 && !r.session.finishedAt); })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [quizKey, n]);

  // put back the page position and unchecked answers, once both have arrived
  useEffect(() => {
    if (!session || !loaded || ready) return;
    const s = loaded.state;
    const firstOpen = Math.max(0, session.itemIds.findIndex((id: string) => !session.results[id]));
    if (s && s.sessionId === session.id) {
      setDrafts(s.drafts || {});
      setI(Math.min(typeof s.index === 'number' ? s.index : firstOpen, session.items.length - 1));
    } else {
      setDrafts({});
      setI(session.answered >= session.items.length ? session.items.length - 1 : firstOpen);
    }
    setReady(true);
  }, [session, loaded, ready]);

  const remember = (over: any, now = false) => session && save({ sessionId: session.id, index: i, drafts, ...over }, now);

  if (error) return <ErrorBox error={error} />;
  if (!session || !ready) return <Loading text="Loading your quiz…" />;
  if (!session.items.length) return <div className="empty">No questions available here yet. Unlock or study a topic first.</div>;

  async function newAttempt() {
    setBusy(true);
    try {
      const r = await api('/api/quiz-sessions', { key: quizKey, n });
      setSession(r.session); setDrafts({}); setI(0); setResumed(false);
      save({ sessionId: r.session.id, index: 0, drafts: {} }, true);
      onChange && onChange(r.session);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  if (session.finishedAt) {
    return <QuizResult session={session} onRetry={newAttempt} busy={busy} continueTo={session.next || continueTo} />;
  }

  const item = session.items[i];
  const res = session.results[item.id];
  const answered = Object.keys(session.results).length;

  function record(r: any) {
    const next = { ...session, results: { ...session.results, [item.id]: { ...r, given: r.given } }, answered: answered + (session.results[item.id] ? 0 : 1) };
    setSession(next);
    const d = { ...drafts };
    delete d[item.id];
    setDrafts(d);
    remember({ drafts: d }, true);
    onChange && onChange(next);
  }
  function draft(d: Draft) {
    const nd = { ...drafts, [item.id]: d };
    setDrafts(nd);
    remember({ drafts: nd });
  }
  function go(to: number) { setI(to); remember({ index: to }, true); }
  async function finish() {
    setBusy(true);
    try {
      const r = await api(`/api/quiz-sessions/${session.id}/finish`, {});
      setSession(r.session);
      remember({ index: i }, true);
      onFinish && onFinish(r.session);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }
  const unanswered = session.items.length - answered;
  const initial = res ? { answer: res.given, result: res } : drafts[item.id] || null;
  const reason = session.reasons?.[item.id];

  return (
    <div className="stack">
      {resumed && <div className="resumed"><Icon name="refresh" size={15} /><span>Carrying on with the quiz you had started: your answers were kept.</span></div>}
      <div className="row between">
        <div className="row">{(title || session.title) && <b>{title || session.title}</b>}<span className="muted small">Question {i + 1} of {session.items.length}</span></div>
        <div className="row" style={{ gap: 4 }}>
          {session.items.map((it: any, k: number) => {
            const r = session.results[it.id];
            const bg = r ? (r.outcome === OUTCOME.CORRECT || r.correct ? 'var(--good)' : r.outcome === OUTCOME.INCORRECT || r.outcome === undefined ? 'var(--bad)' : 'var(--warn)') : k === i ? 'var(--primary)' : '#e5e7eb';
            return <button key={it.id} className="quizpip" title={`Question ${k + 1}`} aria-label={`Question ${k + 1}`} style={{ background: bg }} onClick={() => go(k)} />;
          })}
        </div>
      </div>
      <div className="card quiz-card">
        {reason && REASON[reason] && <div className="mini muted" style={{ marginBottom: 6 }}>{REASON[reason]}</div>}
        <ItemRunner key={`${session.id}:${item.id}`} item={item} source={source} persist={false} session={session.id} showDone={false}
          showHeader={item.type === 'sql' || item.type === 'formula'} onAnswered={record} onDraft={draft} initial={initial} />
        <div className="row quiznav">
          {i > 0 && <button className="btn ghost sm" onClick={() => go(i - 1)}><Icon name="back" size={15} />Previous</button>}
          <span style={{ flex: 1 }} />
          {i < session.items.length - 1 && (res
            ? <button className="btn primary" onClick={() => go(i + 1)}>Next question <Icon name="arrow" size={15} /></button>
            : <button className="btn ghost sm" onClick={() => go(i + 1)}>{drafts[item.id] && hasAnswer(item, drafts[item.id].answer) ? 'Next (check this one later)' : 'Skip for now'}</button>)}
          {i === session.items.length - 1 && (
            <button className={`btn ${unanswered ? '' : 'primary'}`} disabled={busy} onClick={() => { if (!unanswered || confirm(`${unanswered} question${unanswered > 1 ? 's are' : ' is'} not answered yet and will count as not right. Finish anyway?`)) finish(); }}>
              {busy ? <span className="spinner" /> : null}See my score <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A prompt as one plain line: drops bold markers, code ticks and any table, keeps "*" in formulas. */
export function plain(md: string) {
  return String(md || '').split('\n\n')[0].replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

/** Score, what went well, what to work on, and what to do next. */
function QuizResult({ session, onRetry, busy, continueTo }: { session: any; onRetry: () => void; busy: boolean; continueTo: { label: string; to: string } | null }) {
  const [showReview, setShowReview] = useState(false);
  const nav = useNavigate();
  const items = session.items;
  const right = items.filter((it: any) => session.results[it.id]?.correct);
  const missed = items.filter((it: any) => !session.results[it.id]?.correct && session.results[it.id]?.outcome !== OUTCOME.EVALUATION_ERROR);
  const pct = Math.round((session.score || 0) * 100);

  const byTopic = useMemo(() => {
    const m: Record<string, { title: string; n: number }> = {};
    for (const it of missed) {
      const k = it.topicId || it.skill || 'other';
      m[k] = m[k] || { title: it.topicTitle || SKILL_NAMES[it.skill] || 'General', n: 0 };
      m[k].n++;
    }
    return Object.entries(m).sort((a, b) => b[1].n - a[1].n);
  }, [session.id]);

  const advice = pct === 100 ? 'Everything right. This comes back for a short review in a few days, which is what makes it stick.'
    : pct >= 80 ? 'Solid. Look at the few you missed, then carry on.'
      : pct >= 60 ? 'Nearly there. Go through the questions you missed and try a practice task on the weakest topic before moving on.'
        : 'This needs another pass. Re-read the lesson, then do a practice task before taking the quiz again.';

  return (
    <div className="stack">
      <div className="card result-card">
        <span className="done-flag"><Icon name="check" size={15} />Quiz finished</span>
        <div className="row between" style={{ alignItems: 'flex-end', margin: '8px 0 14px', gap: 20 }}>
          <div>
            <div className="big-number">{pct}%</div>
            <div className="muted small">{session.correct} of {session.total} right · {items.length} questions</div>
          </div>
          <div className="scorebar" aria-hidden><span style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)' }} /></div>
        </div>
        <p style={{ margin: 0 }}>{advice}</p>

        {byTopic.length > 0 && (
          <div className="stack" style={{ marginTop: 14 }}>
            <b className="small">Topics to review</b>
            <div className="row" style={{ gap: 6 }}>
              {byTopic.map(([key, t]) => <Link key={key} className="badge amber" to={`/topic/${key}?tab=learn`}>{t.title} · {t.n} missed</Link>)}
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 18 }}>
          {continueTo && <button className="btn primary" onClick={() => nav(continueTo.to)}>{continueTo.label}<Icon name="arrow" size={15} /></button>}
          <button className="btn" onClick={() => setShowReview(!showReview)}><Icon name="eye" size={15} />{showReview ? 'Hide the review' : 'Review my answers'}</button>
          <button className="btn ghost" disabled={busy} onClick={onRetry}><Icon name="refresh" size={15} />Try another quiz</button>
          {missed.length > 0 && <Link className="btn ghost" to="/progress?focus=mistakes"><Icon name="alert" size={15} />All my mistakes</Link>}
        </div>
      </div>
      {showReview && <QuizReview sessionId={session.id} />}
    </div>
  );
}

/** Every question of a finished attempt: your answer, the right one, and why. */
export function QuizReview({ sessionId }: { sessionId: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api(`/api/quiz-sessions/${sessionId}/review`).then((r) => setData(r.session)).catch((e) => setError(e.message)); }, [sessionId]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div className="stack">
      {data.items.map((it: any, k: number) => {
        const r = data.results[it.id] || {};
        const ok = r.correct;
        const unchecked = r.outcome === OUTCOME.EVALUATION_ERROR || r.outcome === OUTCOME.NOT_EVALUABLE;
        return (
          <div key={it.id} className="card review-item" style={{ borderLeft: `4px solid ${ok ? 'var(--good)' : unchecked ? 'var(--warn)' : 'var(--bad)'}` }}>
            <div className="row between"><b>Question {k + 1}</b><span className={`badge ${ok ? 'green' : unchecked ? 'amber' : 'red'}`}>{ok ? 'Right' : unchecked ? 'Not checked' : r.outcome ? 'Not right' : 'Not answered'}</span></div>
            <Markdown text={it.prompt} />
            <div className="small"><span className="muted">Your answer: </span><b className="mono">{answerText(it, r.given)}</b></div>
            {!ok && r.answer && <div className="small"><span className="muted">Correct answer: </span><b className="mono">{answerText(it, revealValue(r.answer))}</b></div>}
            {r.feedback && !ok && <div className="small muted">{r.feedback}</div>}
            {r.explain && <div className="helptext explain"><Markdown text={r.explain} /></div>}
          </div>
        );
      })}
    </div>
  );
}

function revealValue(a: any) {
  if (!a) return null;
  if (a.option !== undefined) return a.option;
  if (a.value !== undefined) return a.value;
  if (a.order) return a.order;
  return a.text ?? a.number ?? a.formula ?? a.sql ?? (a.values ? a.values : null);
}

function answerText(item: any, a: any) {
  if (a === null || a === undefined || a === '') return '(not answered)';
  if (item.type === 'mc') return item.options?.[a] ?? String(a);
  if (item.type === 'tf') return a === true || a === 'true' ? 'True' : 'False';
  if (item.type === 'order' && Array.isArray(a)) return a.map((i: number) => item.options[i]).join(' → ');
  if (Array.isArray(a)) return a.join(', ');
  return String(a);
}
