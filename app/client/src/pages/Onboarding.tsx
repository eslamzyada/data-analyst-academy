import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import ItemRunner from '../components/ItemRunner';
import Icon from '../components/Icon';
import { Loading } from '../components/ui';
import { useSavedWork } from '../saved';

// First run: welcome → what you have used → a few questions, easy ones first → your starting point.
// It answers "What do I already know?". It is not an exam: a tool you have never used is skipped,
// and "I haven't learned this yet" is always an answer, never recorded as a wrong one.
// The server decides the next question from the answers given (the check adapts as it goes).
type Step = 'welcome' | 'about' | 'quiz' | 'roadmap';
type Draft = { id: string; value: any } | null;
type Saved = { step: Step; name: string; selfReport: Record<string, string>; answers: Record<string, any>; order: string[]; seen: Record<string, any>; draft: Draft; back: number | null };
const USE = [['never', 'Never used it'], ['little', 'A little'], ['regular', 'Regularly']];
const IDK = 'idk';

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('Islam');
  const [tools, setTools] = useState<any[]>([]);
  const [selfReport, setSelfReport] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});   // confirmed with Next
  const [order, setOrder] = useState<string[]>([]);                  // confirmed question ids, in order
  const [seen, setSeen] = useState<Record<string, any>>({});         // every question shown, to go back to
  const [current, setCurrent] = useState<any>(null);                 // the newest question (from the server)
  const [back, setBack] = useState<number | null>(null);             // looking at an earlier question
  const [draft, setDraft] = useState<Draft>(null);                   // chosen but not yet confirmed
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // everything is saved as it goes: a refresh comes back to the same question with the same choice
  const { loaded, save, clear } = useSavedWork<Saved>('session:placement');
  const [ready, setReady] = useState(false);

  useEffect(() => { api('/api/placement').then((d) => setTools(d.tools || [])).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (!loaded || ready) return;
    const s = loaded.state as Saved | null;
    if (s && (s.step === 'about' || s.step === 'quiz')) {
      setStep(s.step); setName(s.name || name); setSelfReport(s.selfReport || {}); setAnswers(s.answers || {});
      setOrder(s.order || []); setSeen(s.seen || {}); setDraft(s.draft || null); setBack(s.back ?? null);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const snapshot = (over: Partial<Saved> = {}): Saved => ({ step, name, selfReport, answers, order, seen, draft, back, ...over });
  const keep = (over: Partial<Saved>, now = false) => save(snapshot(over), now);

  async function askNext(ans: Record<string, any>, ord: string[], sn: Record<string, any>) {
    setBusy(true); setError(null);
    try {
      const r = await api('/api/placement/next', { selfReport, answers: ans });
      if (r.done) { await finish(ans); return; }
      const nextSeen = { ...sn, [r.question.id]: r };
      setSeen(nextSeen); setCurrent(r); setBack(null);
      keep({ step: 'quiz', answers: ans, order: ord, seen: nextSeen, back: null }, true);
    } catch (e: any) { setError(`${e.message}. Your answers are saved - try again.`); }
    setBusy(false);
  }
  // after a refresh: ask for the question that comes next (the same one, since nothing new was confirmed)
  useEffect(() => {
    if (ready && step === 'quiz' && !current && !busy) askNext(answers, order, seen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, step]);

  async function start() {
    await api('/api/profile', { name });
    setStep('about');
    keep({ step: 'about' }, true);
  }
  // built on the latest choices (a ref), not on this render's copy: quick clicks on several tools
  // in a row used to keep only the last one
  const latestUse = useRef<Record<string, string>>({});
  useEffect(() => { latestUse.current = selfReport; }, [selfReport]);
  function chooseUse(area: string, v: string) {
    const sr = { ...latestUse.current, [area]: v };
    latestUse.current = sr;
    setSelfReport(sr);
    keep({ selfReport: sr });
  }
  async function beginQuestions() {
    setStep('quiz');
    keep({ step: 'quiz' }, true);
    await askNext(answers, order, seen);
  }
  function choose(id: string, value: any) {
    const d = { id, value };
    setDraft(d);
    keep({ draft: d });
  }
  /** Next: confirm the choice. A changed earlier answer can change what comes after it, so the later ones are dropped. */
  async function confirm(id: string, value: any) {
    const at = order.indexOf(id);
    const changed = at < 0 || answers[id] !== value;
    let ord = at < 0 ? [...order, id] : order;
    let ans = { ...answers, [id]: value };
    if (at >= 0 && changed) {
      const dropped = order.slice(at + 1);
      ord = order.slice(0, at + 1);
      ans = Object.fromEntries(Object.entries(ans).filter(([k]) => !dropped.includes(k)));
    }
    setAnswers(ans); setOrder(ord); setDraft(null);
    if (!changed && back !== null && back + 1 < ord.length) {
      setBack(back + 1);
      keep({ answers: ans, order: ord, draft: null, back: back + 1 });
      return;
    }
    if (!changed && back !== null && current && !(current.question.id in ans)) {
      setBack(null);
      keep({ answers: ans, order: ord, draft: null, back: null });
      return;
    }
    keep({ answers: ans, order: ord, draft: null });
    await askNext(ans, ord, seen);
  }
  async function finish(ans: Record<string, any>) {
    setBusy(true); setError(null);
    try {
      const r = await api('/api/placement', { selfReport, answers: ans });
      setResult(r); setStep('roadmap');
      clear();
    } catch (e: any) { setError(`${e.message}. Your answers are saved - try again.`); }
    setBusy(false);
  }
  async function skip() {
    await api('/api/profile', { name });
    await api('/api/placement/skip', {});
    clear();
    onDone();
  }

  const wrap = (children: any) => (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'start center', padding: '6vh 16px' }}>
      <div style={{ width: 'min(760px, 100%)' }}>
        <div className="brand" style={{ justifyContent: 'center', paddingBottom: 26 }}>
          <span className="brand-mark"><Icon name="progress" size={17} stroke={2.4} /></span><span style={{ fontSize: 17 }}>Data Analyst Academy</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (!ready) return wrap(<Loading />);
  if (step === 'welcome') return wrap(
    <div className="card" style={{ padding: 30 }}>
      <h1>Welcome.</h1>
      <p className="muted" style={{ fontSize: 16 }}>This is your personal training ground for Excel, SQL, Power Query, Power BI and thinking like an analyst. Everything stays on this computer, and it works without internet.</p>
      <div className="field" style={{ maxWidth: 320, marginTop: 18 }}>
        <label>What should I call you?</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="divider" />
      <h3>First, let's see what you already know</h3>
      <p className="muted">This is not a test. You'll say which tools you've used, then answer a few questions, easy ones first. Tools you've never used are skipped, and "I haven't learned this yet" is always a fine answer: it just means that's where you start.</p>
      <div className="row">
        <button className="btn primary lg" disabled={!name.trim()} onClick={start}><Icon name="play" size={16} />Let's start</button>
        <button className="btn ghost" onClick={skip}>Skip, start from the very beginning</button>
      </div>
    </div>,
  );

  if (step === 'about') {
    const all = tools.length > 0 && tools.every((t) => selfReport[t.area]);
    return wrap(
      <div className="card" style={{ padding: 30 }}>
        <div className="label">Step 1 of 2</div>
        <h2 style={{ marginTop: 6 }}>How much have you used these tools?</h2>
        <p className="muted small">Honest answers give you a better starting point. "Never used it" is completely fine: that tool simply starts from its first lesson.</p>
        <div className="stack" style={{ margin: '14px 0' }}>
          {tools.map((t) => (
            <div key={t.area} className="list-row" data-tool={t.area}>
              <div><b>{t.name}</b>{t.hint && <div className="tiny muted">{t.hint}</div>}</div>
              <div className="pill-toggle">
                {USE.map(([v, label]) => <button key={v} className={selfReport[t.area] === v ? 'on' : ''} onClick={() => chooseUse(t.area, v)}>{label}</button>)}
              </div>
            </div>
          ))}
        </div>
        {error && <div className="sql-error" style={{ marginBottom: 10 }}>{error}</div>}
        <div className="row">
          <button className="btn primary" disabled={!all || busy} onClick={beginQuestions}>{busy ? <span className="spinner" /> : null}Next: a few questions <Icon name="arrow" size={15} /></button>
          {!all && <span className="muted small">Choose one answer for each tool.</span>}
        </div>
      </div>,
    );
  }

  if (step === 'quiz') {
    const q = back !== null ? seen[order[back]] : current;
    if (!q) return wrap(error ? <div className="card"><div className="sql-error">{error}</div><button className="btn" style={{ marginTop: 10 }} onClick={() => askNext(answers, order, seen)}>Try again</button></div> : <Loading text="Finding the next question…" />);
    const item = q.question;
    const options = [...item.options, item.idkLabel || "I haven't learned this yet"];
    const value = draft && draft.id === item.id ? draft.value : answers[item.id];
    const shown = value === IDK ? item.options.length : value ?? null;
    const at = order.indexOf(item.id);
    const pos = at >= 0 ? at : order.length;
    return wrap(
      <div className="stack">
        <div className="row between">
          <b>Step 2 of 2 · {q.areaName}: {q.stageWords}</b>
          <span className="muted small">Question {pos + 1}</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {(q.areas || []).map((a: any) => (
            <span key={a.area} className={`badge ${a.state === 'now' ? 'blue' : a.state === 'done' ? 'green' : ''}`}>{a.name}{a.state === 'skipped' ? ' · skipped' : ''}</span>
          ))}
        </div>
        <div className="card" style={{ padding: 26 }}>
          <ItemRunner key={item.id} item={{ ...item, options }} source="placement" exam showHeader={false}
            examAnswer={shown} onExamAnswer={(a) => choose(item.id, a === item.options.length ? IDK : a)} />
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>Not sure? Choose "I haven't learned this yet": it is not counted as a wrong answer.</p>
          <div className="row between" style={{ marginTop: 16 }}>
            <button className="btn ghost" disabled={pos === 0 || busy} onClick={() => { setDraft(null); setBack(pos - 1); keep({ draft: null, back: pos - 1 }); }}>Back</button>
            <button className="btn primary" disabled={busy || value === undefined || value === null} onClick={() => confirm(item.id, value)}>
              {busy ? <span className="spinner" /> : null}Next <Icon name="arrow" size={15} />
            </button>
          </div>
          {error && <div className="sql-error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      </div>,
    );
  }

  const ORDER = [['excel', 'Excel'], ['sql', 'SQL'], ['pq', 'Power Query'], ['pbi', 'Power BI'], ['think', 'Analyst Thinking']];
  return wrap(
    <div className="card" style={{ padding: 30 }}>
      <div className="label">Your starting point</div>
      <h1 style={{ marginTop: 6 }}>Here's where you start, {name}.</h1>
      <div className="stack" style={{ margin: '18px 0' }}>
        {ORDER.map(([k, label]) => (
          <div key={k} className="list-row" data-roadmap={k}>
            <b style={{ minWidth: 150 }}>{label}</b>
            <span className="small" style={{ flex: 1 }}>{result.roadmapText?.[k] || result.roadmap[k]}</span>
          </div>
        ))}
      </div>
      <p className="muted small">Anything credited here is a starting point, not mastery: it comes back as short reviews to confirm it. Your first sessions stay close to the basics while the Academy gets to know your level.</p>
      {result.startTopic && (
        <div className="card tint" style={{ marginTop: 10 }}>
          <div className="label">Your first lesson</div>
          <h2 style={{ margin: '4px 0' }}>{result.startTopic.skill} · {result.startTopic.title}</h2>
          <p className="muted small" style={{ margin: 0 }}>A short explanation, an example to try, a first practice task, then a short quiz. Each step shows you the next one.</p>
        </div>
      )}
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn primary lg" onClick={() => { onDone(); window.location.hash = result.startTopic ? `#/topic/${result.startTopic.id}` : '#/'; }}><Icon name="play" size={16} />Start my first lesson</button>
        <button className="btn ghost" onClick={onDone}>Go to my dashboard</button>
      </div>
    </div>,
  );
}
