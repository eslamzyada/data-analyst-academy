// Runs any exercise: multiple choice, true/false, fill-in, number, order, Excel formula,
// SQL, file/number tasks and written answers. Handles the hint ladder, feedback, saving,
// and the end of the activity: a clear state and a way forward.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fileUrl, upload, SKILL_NAMES } from '../api';
import { Markdown, Stars, SkillTag, fmtNum } from './ui';
import { FormulaGrid, SqlEditor, ResultTable, SchemaDrawer, SqlError, SqlTaskContext } from './Sheets';
import { useSavedWork } from '../saved';
import Icon from './Icon';
import { OUTCOME, STATE, taskState, outcomeOf } from '../../../shared/lifecycle.js';

export type NextAction = { label: string; to?: string; onClick?: () => void; hint?: string | null };
export type Draft = { answer: any; help?: any[]; hints?: number };

type Props = {
  item: any;
  source: string;                 // tryit | quiz | practice | challenge | quick | review | exam
  exam?: boolean;                 // exam mode: no hints, no checking
  planStep?: string;
  showHeader?: boolean;
  onAnswered?: (result: any) => void;
  onExamAnswer?: (answer: any) => void;
  examAnswer?: any;
  next?: NextAction | null;       // overrides the next step the server suggests
  ctx?: 'topic' | 'task';         // where "next" should lead: inside the topic page, or task pages
  persist?: boolean;              // false when a parent (quiz, quick practice) saves the whole session
  session?: number | null;        // the quiz attempt this question belongs to
  initial?: { answer?: any; result?: any; help?: any[]; hints?: number } | null;
  onDraft?: (draft: Draft) => void;   // with persist=false: the parent keeps the unchecked answer
  showDone?: boolean;             // show the completion bar (quizzes show their own navigation)
};

const LETTERS = 'ABCDEFGH';

export default function ItemRunner({
  item, source, exam = false, planStep, showHeader = true, onAnswered, onExamAnswer, examAnswer,
  next: nextOverride, ctx = 'topic', persist = true, session = null, initial = null, onDraft, showDone = true,
}: Props) {
  const saveKey = persist && !exam ? `item:${item.id}` : null;
  const { loaded, save, clear } = useSavedWork<any>(saveKey);
  const navigate = useNavigate();

  const [answer, setAnswer] = useState<any>(() => initial?.answer ?? initialAnswer(item, examAnswer));
  const [help, setHelp] = useState<{ level: number; text: string; answer?: any }[]>(() => initial?.help || []);
  const [hints, setHints] = useState(() => initial?.hints || 0);
  const [result, setResult] = useState<any>(() => initial?.result ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [drawer, setDrawer] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [selfSaved, setSelfSaved] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [review, setReview] = useState(false);
  const [serverNext, setServerNext] = useState<NextAction | null>(null);
  const [solvedBefore, setSolvedBefore] = useState(false);
  // checks made on this task (a result kept from before counts as one), and whether the learner chose to open help early
  const [checks, setChecks] = useState(() => (initial?.result ? 1 : 0));
  const [helpAnyway, setHelpAnyway] = useState(false);
  const started = useRef(Date.now());
  const base = useRef(0);          // seconds already spent in earlier sittings

  useEffect(() => {
    setAnswer(initial?.answer ?? initialAnswer(item, examAnswer)); setHelp(initial?.help || []); setHints(initial?.hints || 0);
    setResult(initial?.result ?? null); setError(null); setPreview(null); setTicks([]); setSelfSaved(null); setRestored(false);
    setReview(false); setServerNext(null); setSolvedBefore(false);
    started.current = Date.now(); base.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // put back whatever was left behind last time
  useEffect(() => {
    if (!saveKey || !loaded || !loaded.state) return;
    const s = loaded.state;
    if (s.itemId && s.itemId !== item.id) return;
    if (s.answer !== undefined && s.answer !== null) setAnswer(s.answer);
    if (s.help) setHelp(s.help);
    if (s.hints) setHints(s.hints);
    if (s.result) setResult(s.result);
    if (s.ticks) setTicks(s.ticks);
    if (typeof s.selfSaved === 'number') setSelfSaved(s.selfSaved);
    if (s.solvedBefore) setSolvedBefore(true);
    base.current = s.seconds || 0;
    started.current = Date.now();
    if (s.result || hasAnswer(item, s.answer)) setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, saveKey, item.id]);

  const elapsed = () => base.current + Math.round((Date.now() - started.current) / 1000);
  const selfMarked = result && result.selfMarked ? !!result.correct : null;
  const state = taskState({ hasAnswer: hasAnswer(item, answer), submitting: busy, result, selfChecked: selfSaved !== null, selfMarked });
  const outcome = outcomeOf(result);

  /** Everything worth keeping about this task. */
  const snapshot = (over: any = {}) => ({
    itemId: item.id, topicId: item.topicId || null, title: item.title || null, skill: item.skill || null, source,
    answer, help, hints, ticks, selfSaved, result, solvedBefore, seconds: elapsed(),
    ...over,
  });
  const keep = (over: any = {}, now = false) => {
    if (saveKey) save(snapshot(over), now);
    else if (onDraft) onDraft({ answer: over.answer ?? answer, help: over.help ?? help, hints: over.hints ?? hints });
  };

  const update = (v: any) => {
    setAnswer(v);
    if (exam && onExamAnswer) onExamAnswer(v);
    keep({ answer: v });
  };

  // the next step: from the parent, from the last check, or asked for once the task is settled
  const next = nextOverride !== undefined ? nextOverride : serverNext;
  useEffect(() => {
    if (!persist || exam || nextOverride !== undefined || serverNext) return;
    if (state !== STATE.COMPLETED && state !== STATE.EVALUATED && state !== STATE.SUBMITTED) return;
    let live = true;
    api(`/api/next?kind=item&id=${encodeURIComponent(item.id)}&ctx=${ctx}`).then((r) => live && setServerNext(r.next)).catch(() => {});
    return () => { live = false; };
  }, [state, item.id, ctx, persist, exam, nextOverride, serverNext]);

  async function getHelp(level: number) {
    if (level === 4 && !confirm('Seeing the full answer means this attempt will not count toward your progress. Show it?')) return;
    try {
      const r = await api(`/api/items/${item.id}/help`, { level });
      const nextHelp = [...help.filter((x) => x.level !== level), r];
      const nextHints = Math.max(hints, level);
      setHelp(nextHelp); setHints(nextHints);
      keep({ help: nextHelp, hints: nextHints }, true);
    } catch (e: any) { setError(e.message); }
  }

  async function submit() {
    setBusy(true); setError(null);
    setRestored(false);
    // save the answer before checking it, so a failure on the way cannot lose it
    if (saveKey) save(snapshot(), true);
    try {
      const r = await api(`/api/items/${item.id}/submit`, { answer: packAnswer(item, answer), source, hints, seconds: elapsed(), planStep, session, ctx });
      setResult(r);
      setChecks((c) => c + 1);
      if (r.next) setServerNext(r.next);
      const t = r.detected ? r.detected.map((d: any) => d.detected) : ticks;
      if (r.detected) setTicks(t);
      if (r.outcome === OUTCOME.CORRECT) setSolvedBefore(true);
      if (saveKey) save(snapshot({ result: r, ticks: t, solvedBefore: solvedBefore || r.outcome === OUTCOME.CORRECT }), true);
      onAnswered && onAnswered({ ...r, given: packAnswer(item, answer) });
    } catch (e: any) {
      setError(`${e.message}. Your answer is saved - try checking again.`);
    }
    setBusy(false);
  }

  async function saveSelfCheck() {
    try {
      const r = await api(`/api/items/${item.id}/selfcheck`, { answer, ticks, hints, source, planStep, ctx });
      setSelfSaved(r.score);
      if (r.next) setServerNext(r.next);
      if (saveKey) save(snapshot({ selfSaved: r.score }), true);
      onAnswered && onAnswered({ ...result, outcome: OUTCOME.CORRECT, correct: true, score: r.score, recorded: r.recorded, given: answer });
    } catch (e: any) { setError(`${e.message}. Your ticks are saved - try again.`); }
  }

  /** The learner marks an answer the app could not check (only offered in that case). */
  async function markMyself(ok: boolean) {
    try {
      const r = await api(`/api/items/${item.id}/selfmark`, { correct: ok, answer: packAnswer(item, answer), source, hints, seconds: elapsed(), planStep, ctx });
      const merged = { ...result, ...r.result };
      setResult(merged);
      if (r.next) setServerNext(r.next);
      if (saveKey) save(snapshot({ result: merged }), true);
      onAnswered && onAnswered({ ...merged, given: answer });
    } catch (e: any) { setError(`${e.message}. Try again.`); }
  }

  /** A fresh attempt at a task already done: the progress already earned stays. */
  function tryAgain() {
    setAnswer(initialAnswer(item, examAnswer)); setResult(null); setHelp([]); setHints(0); setTicks([]); setSelfSaved(null);
    setRestored(false); setReview(false); setError(null); setPreview(null);
    base.current = 0; started.current = Date.now();
    if (saveKey) save({ itemId: item.id, topicId: item.topicId || null, title: item.title || null, answer: initialAnswer(item), solvedBefore: solvedBefore || state === STATE.COMPLETED, seconds: 0 }, true);
  }

  const runSql = useCallback(async () => {
    setError(null);
    const r = await api('/api/sql/run', { db: item.db, sql: answer }).catch((e) => ({ ok: false, error: e.message }));
    setPreview(r);
  }, [answer, item.db]);

  async function doUpload(file: File) {
    setBusy(true); setError(null);
    try {
      const r = await upload(`/api/items/${item.id}/upload?source=${source}&hints=${hints}&ctx=${ctx}`, file);
      setResult(r);
      if (r.next) setServerNext(r.next);
      if (saveKey) save(snapshot({ result: r }), true);
      onAnswered && onAnswered(r);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  const answered = !!result && !result.selfCheck;
  const unchecked = outcome === OUTCOME.EVALUATION_ERROR || (outcome === OUTCOME.NOT_EVALUABLE && !result?.selfCheck);
  const quizLike = ['quiz', 'quick', 'review'].includes(source);
  const locked = answered && !unchecked && (outcome === OUTCOME.CORRECT || quizLike || selfMarked !== null);
  const canSubmit = !busy && !locked && hasAnswer(item, answer);
  const followNext = (n: NextAction) => (n.to ? navigate(n.to) : n.onClick && n.onClick());

  return (
    <div className="item" data-state={state}>
      {showHeader && (item.title || item.difficulty) && (
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row">
            {item.title && <h3 style={{ margin: 0 }}>{item.title}</h3>}
            {item.skill && source !== 'quiz' && <SkillTag skill={item.skill} name={SKILL_NAMES[item.skill]} />}
            {item.business && <span className="badge">{item.business}</span>}
          </div>
          <div className="row small muted"><Stars n={item.difficulty} />{item.minutes && <span><Icon name="clock" size={13} /> {item.minutes} min</span>}</div>
        </div>
      )}
      {restored && (
        <div className="resumed">
          <Icon name="refresh" size={15} />
          <span>{result ? 'Picking up where you left off - your answer and result were saved.' : 'Your unfinished answer was saved and put back.'}</span>
          {state !== STATE.COMPLETED && <button className="linky" onClick={tryAgain}>Start this one again</button>}
        </div>
      )}
      {item.context && <div className="card flat" style={{ background: '#fafbfc', marginBottom: 12, padding: 14 }}><Markdown text={item.context} /></div>}
      <Markdown className="prompt" text={item.prompt} />

      {/* files, datasets, task list */}
      {(item.files?.length > 0 || item.dataset || item.db) && ['numbers', 'file', 'open'].includes(item.type) && (
        <div className="row" style={{ margin: '10px 0' }}>
          {(item.files || []).map((f: any) => <a key={f.path} className="btn sm" href={fileUrl(f.path)}><Icon name="download" size={15} />{f.label}</a>)}
          {item.dataset && <Link className="btn sm ghost" to={`/data/${item.dataset}`}><Icon name="table" size={15} />View the data in the app</Link>}
          {item.db && <Link className="btn sm ghost" to={`/sql?db=${item.db}`}><Icon name="sql" size={15} />Open in SQL Lab</Link>}
        </div>
      )}
      {item.tasks && <ol className="small" style={{ paddingLeft: 20 }}>{item.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}</ol>}

      {/* inputs */}
      {item.type === 'mc' && (
        <div className="options">
          {item.options.map((o: string, i: number) => {
            const cls = answered && result.answer && result.answer.option === i ? 'right' : answered && answer === i ? (result.correct ? 'right' : 'wrong') : answer === i ? 'sel' : '';
            return <button key={i} className={`option ${cls}`} disabled={locked} onClick={() => update(i)}><span className="key">{LETTERS[i]}</span><span><Markdown text={o} /></span></button>;
          })}
        </div>
      )}
      {item.type === 'tf' && (
        <div className="row options-tf" style={{ margin: '14px 0' }}>
          {[true, false].map((v) => {
            const cls = answered && result.answer && result.answer.value === v ? 'right' : answered && answer === v ? (result.correct ? 'right' : 'wrong') : answer === v ? 'sel' : '';
            return <button key={String(v)} className={`option ${cls}`} style={{ minWidth: 120, justifyContent: 'center' }} disabled={locked} onClick={() => update(v)}>{v ? 'True' : 'False'}</button>;
          })}
        </div>
      )}
      {(item.type === 'fill' || item.type === 'number') && (
        <div className="row" style={{ margin: '14px 0' }}>
          <input type="text" style={{ maxWidth: 320 }} value={answer ?? ''} placeholder={item.type === 'number' ? 'Type a number' : 'Type your answer'} disabled={locked}
            onChange={(e) => update(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit && !exam) submit(); }} />
          {item.unit && <span className="muted">{item.unit}</span>}
        </div>
      )}
      {item.type === 'order' && (
        <div className="options">
          {answer.map((idx: number, pos: number) => (
            <div key={idx} className="option" style={{ cursor: 'default', alignItems: 'center' }}>
              <span className="key">{pos + 1}</span><span style={{ flex: 1 }}>{item.options[idx]}</span>
              {!locked && <>
                <button className="btn ghost sm" disabled={pos === 0} onClick={() => { const a = [...answer]; [a[pos - 1], a[pos]] = [a[pos], a[pos - 1]]; update(a); }}><Icon name="up" size={14} /></button>
                <button className="btn ghost sm" disabled={pos === answer.length - 1} onClick={() => { const a = [...answer]; [a[pos + 1], a[pos]] = [a[pos], a[pos + 1]]; update(a); }}><Icon name="down" size={14} /></button>
              </>}
            </div>
          ))}
        </div>
      )}
      {item.type === 'formula' && (
        <div className="stack" style={{ margin: '14px 0' }}>
          <FormulaGrid grid={item.grid} target={item.target} fillTo={item.fillTo} cells={result?.cells} spill={result?.spill} correct={result && outcome !== OUTCOME.EVALUATION_ERROR ? !!result.correct : null} />
          <div className="formula-bar">
            <span className="cell">{item.target}</span><span className="fx">fx</span>
            <input type="text" value={answer ?? ''} disabled={locked} placeholder="=" onChange={(e) => update(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit && !exam) submit(); }} />
          </div>
          {item.fillTo && <div className="muted small">Your formula is written in {item.target} and then copied down to {item.fillTo}, just like dragging the fill handle in Excel.</div>}
        </div>
      )}
      {item.type === 'sql' && (
        <div className="stack" style={{ margin: '14px 0' }}>
          <SqlTaskContext db={item.db} onSchema={() => setDrawer(true)} onInsert={(t) => update(`${answer}${answer.endsWith(' ') || !answer ? '' : ' '}${t}`)} />
          <SqlEditor value={answer ?? ''} onChange={update} onRun={runSql} db={item.db} />
          <div className="row">
            <button className="btn" onClick={runSql}><Icon name="play" size={14} />Run</button>
            {preview && !preview.ok && <span className="muted small">Fix the error, then run again.</span>}
          </div>
          {preview && (preview.ok ? <ResultTable res={preview} /> : <SqlError res={preview} onInsert={(t) => update(`${answer}${answer.endsWith(' ') || !answer ? '' : ' '}${t}`)} />)}
          {drawer && <SchemaDrawer db={item.db} onClose={() => setDrawer(false)} onInsert={(t) => update(`${answer}${answer.endsWith(' ') || !answer ? '' : ' '}${t}`)} />}
        </div>
      )}
      {(item.type === 'numbers' || item.type === 'file') && (
        <div className="stack" style={{ margin: '14px 0' }}>
          {item.questions.map((q: any, i: number) => {
            const part = result?.parts?.[i];
            return (
              <div key={i} className="row" style={{ alignItems: 'center' }}>
                <span style={{ flex: '1 1 320px' }}><b>{i + 1}.</b> {q.label}</span>
                <input type="text" style={{ flex: '0 1 200px', borderColor: part ? (part.correct ? '#86d4a3' : '#f1a7a7') : undefined }} value={answer[i] ?? ''} disabled={locked}
                  onChange={(e) => { const a = [...answer]; a[i] = e.target.value; update(a); }} />
                {part && <span style={{ color: part.correct ? 'var(--good)' : 'var(--bad)' }}><Icon name={part.correct ? 'check' : 'x'} /></span>}
              </div>
            );
          })}
          {item.upload && !exam && !locked && <FileDrop onFile={doUpload} busy={busy} />}
        </div>
      )}
      {item.type === 'open' && (
        <div className="stack" style={{ margin: '14px 0' }}>
          <textarea value={answer ?? ''} placeholder="Write your answer as you would say it to a manager…" disabled={!!result} onChange={(e) => update(e.target.value)} style={{ minHeight: 160 }} />
        </div>
      )}

      {error && <div className="sql-error" style={{ marginTop: 10 }}>{error}</div>}

      {/* actions */}
      {!exam && !result && (
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn primary" disabled={!canSubmit} onClick={submit}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}{item.type === 'open' ? 'Submit my answer' : item.type === 'sql' ? 'Check answer' : 'Check'}
          </button>
          {state === STATE.IN_PROGRESS && persist && <span className="muted small">Your answer saves as you type.</span>}
        </div>
      )}
      {!exam && result && !locked && (state === STATE.EVALUATED || unchecked) && (
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn primary" disabled={busy || !hasAnswer(item, answer)} onClick={submit}>
            {busy ? <span className="spinner" /> : <Icon name="refresh" size={15} />}{unchecked ? 'Try checking again' : 'Check again'}
          </button>
          {unchecked
            ? <span className="muted small">Your answer is saved. Nothing has been marked wrong.</span>
            : <span className="muted small">Change your answer, then check again. Hints below if you're stuck.</span>}
        </div>
      )}

      {/* hint ladder: after solving these without help, it waits for a first (light) or second (none) check */}
      {!exam && !locked && !helpAnyway && hints === 0 && help.length === 0 && ((item.guidance === 'light' && checks < 1) || (item.guidance === 'none' && checks < 2))
        && (item.hints > 0 || item.hasExplain || item.hasSolution) && (
        <div className="helpbar guided">
          <span className="small muted"><Icon name="target" size={14} /> {item.guidanceNote}</span>
          <button className="btn sm ghost" onClick={() => setHelpAnyway(true)}>Open hints anyway</button>
        </div>
      )}
      {!exam && !locked && (item.hints > 0 || item.hasExplain || item.hasSolution)
        && !(!helpAnyway && hints === 0 && help.length === 0 && ((item.guidance === 'light' && checks < 1) || (item.guidance === 'none' && checks < 2))) && (
        <div className="helpbar">
          {item.hints > 0 && hints < Math.min(2, item.hints) && <button className="btn sm" onClick={() => getHelp(hints + 1)}><Icon name="bulb" size={15} />{hints === 0 ? 'Hint' : 'Stronger hint'}</button>}
          {item.hasExplain && hints < 3 && <button className="btn sm" onClick={() => getHelp(3)}><Icon name="learn" size={15} />Show explanation</button>}
          {item.hasSolution && <button className="btn sm ghost" onClick={() => getHelp(4)}><Icon name="eye" size={15} />Show answer</button>}
        </div>
      )}
      {help.slice().sort((a, b) => a.level - b.level).map((h) => (
        <div key={h.level} className={`helptext ${h.level === 3 ? 'explain' : h.level === 4 ? 'answer' : ''}`}>
          <div className="label" style={{ marginBottom: 4 }}>{h.level === 1 ? 'Hint' : h.level === 2 ? 'Stronger hint' : h.level === 3 ? 'Explanation' : 'Answer'}</div>
          <Markdown text={h.text} />
          {h.level === 4 && h.answer?.values && <div className="small">{h.answer.values.map((v: any, i: number) => <div key={i}>{i + 1}. <b>{fmtNum(v)}</b></div>)}</div>}
        </div>
      ))}

      {/* feedback */}
      {result && !result.selfCheck && <Feedback item={item} result={result} onSelfMark={unchecked && !exam ? markMyself : undefined} />}
      {result && result.selfCheck && (
        <div className="feedback info">
          <h4><Icon name="quiz" size={18} />Check your answer against the key points</h4>
          <p className="small muted">The app ticked the points it recognised. Tick any other point your answer really covers, then save. Wording doesn't matter, ideas do.</p>
          {item.checklist?.map((p: string, i: number) => (
            <label key={i} className="check-row"><input type="checkbox" checked={!!ticks[i]} disabled={selfSaved !== null} onChange={(e) => { const t = [...ticks]; t[i] = e.target.checked; setTicks(t); keep({ ticks: t }); }} /><span>{p}</span></label>
          ))}
          {result.model && <div className="helptext answer"><div className="label">A strong answer</div><Markdown text={result.model} /></div>}
          {selfSaved === null ? <button className="btn primary" style={{ marginTop: 12 }} onClick={saveSelfCheck}>Save my self-check</button>
            : <p style={{ marginTop: 10 }}><b>Saved: {Math.round(selfSaved * 100)}%</b> of the key points covered.</p>}
        </div>
      )}

      {/* the end of the activity: what happened, and what now */}
      {!exam && showDone && state === STATE.COMPLETED && (
        <div className="donebar" role="status">
          <span className="done-flag"><Icon name="check" size={16} />Completed</span>
          {scoreText(result, selfSaved) && <span className="small">{scoreText(result, selfSaved)}</span>}
          <div className="donebar-actions">
            {next && <button className="btn primary" onClick={() => followNext(next)}>{next.label}<Icon name="arrow" size={16} /></button>}
            <button className="btn" onClick={() => setReview(!review)}><Icon name="eye" size={15} />{review ? 'Hide review' : 'Review'}</button>
            {!quizLike && <button className="btn ghost" onClick={tryAgain}><Icon name="refresh" size={15} />Try again</button>}
          </div>
          {next?.hint && <span className="muted small">{next.hint}</span>}
        </div>
      )}
      {!exam && showDone && state === STATE.COMPLETED && review && (
        <div className="reviewbox">
          <div className="label">Your answer</div>
          <pre className="mono small">{describeAnswer(item, result?.given ?? answer)}</pre>
          {(result?.solution || result?.model) && <><div className="label" style={{ marginTop: 8 }}>A model answer</div><Markdown text={result.solution || result.model} /></>}
          {!result?.solution && !result?.model && result?.explain && <Markdown text={result.explain} />}
        </div>
      )}
      {!exam && showDone && !quizLike && (state === STATE.EVALUATED || state === STATE.SUBMITTED) && result && next && (
        <div className="movebar">
          <span className="muted small">{state === STATE.EVALUATED ? 'Not there yet? You can come back to this one later.' : 'You can come back to this one later.'}</span>
          <button className="btn ghost sm" onClick={() => followNext(next)}>Move on for now: {next.label.replace(/^Next:\s*/, '')}<Icon name="arrow" size={14} /></button>
        </div>
      )}
    </div>
  );
}

function scoreText(result: any, selfSaved: number | null) {
  if (selfSaved !== null) return `${Math.round(selfSaved * 100)}% of the key points covered`;
  if (!result) return null;
  if (result.selfMarked) return 'Marked right by you';
  if (result.parts) return `${result.parts.filter((p: any) => p.correct).length} of ${result.parts.length} right`;
  return result.method === 'text-match' ? 'Matched against the model answer' : null;
}

function describeAnswer(item: any, a: any) {
  if (a === null || a === undefined) return '(nothing)';
  if (item.type === 'mc') return item.options?.[a] ?? String(a);
  if (item.type === 'tf') return a ? 'True' : 'False';
  if (item.type === 'order' && Array.isArray(a)) return a.map((i: number, k: number) => `${k + 1}. ${item.options[i]}`).join('\n');
  if (Array.isArray(a)) return a.map((v, i) => `${i + 1}. ${v === '' ? '(empty)' : v}`).join('\n');
  return String(a);
}

function Feedback({ item, result, onSelfMark }: { item: any; result: any; onSelfMark?: (ok: boolean) => void }) {
  const rec = result.recorded;
  const outcome = outcomeOf(result);
  const ok = outcome === OUTCOME.CORRECT;

  // The app could not reach a verdict. This is not a wrong answer, and must not look like one.
  if (outcome === OUTCOME.EVALUATION_ERROR || (outcome === OUTCOME.NOT_EVALUABLE && !result.selfCheck)) {
    const appFault = outcome === OUTCOME.EVALUATION_ERROR;
    return (
      <div className="feedback warn" data-outcome={outcome}>
        <h4><Icon name="bulb" size={19} />{appFault ? 'Not checked: the app had a problem' : 'This answer can\'t be checked automatically here'}</h4>
        {result.feedback && <p style={{ margin: '0 0 8px' }}>{result.feedback}</p>}
        {(result.explain || result.solution) && <details style={{ marginBottom: 8 }}><summary className="small">Show the explanation and model answer</summary>{result.explain && <Markdown text={result.explain} />}{result.solution && <Markdown text={result.solution} />}</details>}
        {onSelfMark && (
          <>
            <p className="small muted" style={{ margin: '8px 0 6px' }}>If you have compared your answer with the model solution, you can record it yourself. Honest marking keeps your progress meaningful.</p>
            <div className="row">
              <button className="btn sm" onClick={() => onSelfMark(true)}><Icon name="check" size={15} />Mine was right</button>
              <button className="btn sm ghost" onClick={() => onSelfMark(false)}><Icon name="x" size={15} />Mine was not right</button>
            </div>
          </>
        )}
        {result.engineError && <p className="mini muted" style={{ marginTop: 8 }}>Technical detail: {result.engineError}</p>}
      </div>
    );
  }

  return (
    <div className={`feedback ${ok ? 'ok' : 'no'}`} data-outcome={outcome}>
      <h4 style={{ color: ok ? 'var(--good)' : 'var(--bad)' }}><Icon name={ok ? 'check' : 'x'} size={19} />{ok ? 'Correct' : result.score > 0 && result.score < 1 && result.parts ? `${Math.round(result.score * 100)}% right` : 'Not quite'}</h4>
      {result.feedback && <p style={{ margin: '0 0 8px' }}>{result.feedback}</p>}
      {result.error && <div className="sql-error" style={{ marginBottom: 8 }}>{result.error}</div>}
      {result.parts && <PartsBreakdown parts={result.parts} score={result.score} />}
      {result.formulasUsed !== undefined && result.formulasUsed !== null && <p className="small muted">Formulas found in your workbook: {result.formulasUsed}.</p>}
      {result.result && item.type === 'sql' && !ok && (
        <details style={{ margin: '6px 0' }}><summary className="small">Your result</summary><ResultTable res={{ ...result.result, rows: result.result.rows, truncated: result.result.total > result.result.rows.length }} /></details>
      )}
      {!ok && result.answer && item.type !== 'mc' && item.type !== 'tf' && (
        <div className="small" style={{ marginTop: 6 }}>Correct answer: <b className="mono">{result.answer.text ?? result.answer.number ?? result.answer.formula ?? (result.answer.order ? result.answer.order.map((i: number) => item.options[i]).join(' → ') : '')}</b>{result.answer.sql && <pre className="mono small">{result.answer.sql}</pre>}</div>
      )}
      {result.explain && <div style={{ marginTop: 8 }}><Markdown text={result.explain} /></div>}
      {rec?.mistakeLogged && <div className="mastery-note">Saved to your mistakes. It will come back for review, and it's cleared after you get it right twice.</div>}
      {rec && rec.masteryBefore !== null && rec.masteryAfter !== null && rec.masteryBefore !== rec.masteryAfter && (
        <div className="mastery-note">Topic progress: {rec.masteryBefore}% → <b>{rec.masteryAfter}%</b></div>
      )}
    </div>
  );
}

/** After a challenge: the score, then what went right and what needs another look. */
function PartsBreakdown({ parts, score }: { parts: any[]; score: number }) {
  const right = parts.filter((p) => p.correct);
  const wrong = parts.filter((p) => !p.correct);
  const pct = Math.round((score || 0) * 100);
  return (
    <div className="breakdown">
      <div className="row between" style={{ marginBottom: 10 }}>
        <b>{right.length} of {parts.length} right</b>
        <div className="scorebar"><span style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)' }} /></div>
      </div>
      {right.length > 0 && (
        <div className="stack" style={{ gap: 2, marginBottom: wrong.length ? 10 : 0 }}>
          <div className="label" style={{ color: 'var(--good)' }}>What you got right</div>
          {right.map((p, i) => <div key={i} className="small"><Icon name="check" size={13} /> {p.label}</div>)}
        </div>
      )}
      {wrong.length > 0 && (
        <div className="stack" style={{ gap: 2 }}>
          <div className="label" style={{ color: 'var(--bad)' }}>What needs another look</div>
          {wrong.map((p, i) => (
            <div key={i} className="small">
              <Icon name="x" size={13} /> {p.label}
              {p.given !== null && p.given !== undefined ? <span className="muted"> — you put <b className="mono">{String(p.given)}</b></span> : <span className="muted"> — left empty</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileDrop({ onFile, busy }: { onFile: (f: File) => void; busy: boolean }) {
  const [hot, setHot] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`dropzone ${hot ? 'hot' : ''}`} onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setHot(true); }} onDragLeave={() => setHot(false)}
      onDrop={(e) => { e.preventDefault(); setHot(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
      <input ref={ref} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {busy ? <span className="spinner" /> : <Icon name="upload" size={20} />}
      <div><b>Upload your finished workbook</b> (.xlsx): drop it here or click. The app reads your answers from the yellow cells on the Answers sheet.</div>
    </div>
  );
}

export function initialAnswer(item: any, exam?: any) {
  if (exam !== undefined) return exam;
  switch (item.type) {
    case 'mc': case 'tf': return null;
    // the server sends a scrambled starting order that is never already the answer
    case 'order': return Array.isArray(item.start) ? [...item.start] : item.options.map((_: any, i: number) => i).reverse();
    case 'formula': return '=';
    case 'sql': return item.starter || '';
    case 'numbers': case 'file': return item.questions.map(() => '');
    default: return '';
  }
}
export function hasAnswer(item: any, a: any) {
  if (a === null || a === undefined) return false;
  if (item.type === 'mc' || item.type === 'tf') return true;
  if (item.type === 'numbers' || item.type === 'file') return Array.isArray(a) && a.some((x: string) => String(x || '').trim());
  if (item.type === 'formula') return String(a || '').replace('=', '').trim().length > 0;
  if (item.type === 'order') return true;
  if (item.type === 'sql') return String(a || '').trim().length > 0 && String(a || '').trim() !== String(item.starter || '').trim();
  return String(a || '').trim().length > 0;
}
function packAnswer(item: any, a: any) {
  return a;
}
