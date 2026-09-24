import { useEffect, useState } from 'react';
import { api } from '../api';
import ItemRunner from '../components/ItemRunner';
import Icon from '../components/Icon';
import { Loading } from '../components/ui';
import { useSavedWork } from '../saved';

// First run: welcome → name → quick assessment → roadmap.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'welcome' | 'quiz' | 'roadmap'>('welcome');
  const [name, setName] = useState('Islam');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [i, setI] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the assessment is saved as it goes: a refresh comes back to the same question with the same answers
  const { loaded, save, clear } = useSavedWork<any>('session:placement');
  const [ready, setReady] = useState(false);

  useEffect(() => { api('/api/placement').then((d) => setQuestions(d.questions)); }, []);
  useEffect(() => {
    if (!loaded || ready) return;
    const s = loaded.state;
    if (s && s.step === 'quiz') {
      setStep('quiz'); setName(s.name || name); setAnswers(s.answers || {}); setI(s.index || 0);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const keep = (over: any, now = false) => save({ step: 'quiz', name, answers, index: i, ...over }, now);

  async function start() {
    await api('/api/profile', { name });
    setStep('quiz');
    keep({ index: 0, answers: {} }, true);
  }
  async function finish() {
    setBusy(true); setError(null);
    try {
      const r = await api('/api/placement', { answers });
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
  const goTo = (k: number) => { setI(k); keep({ index: k }, true); };

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
      <p className="muted" style={{ fontSize: 16 }}>This is your personal training ground for Excel, SQL, Power Query and Power BI. Everything stays on this computer, and it works without internet.</p>
      <div className="field" style={{ maxWidth: 320, marginTop: 18 }}>
        <label>What should I call you?</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="divider" />
      <h3>Step 1 · Let's find your current level</h3>
      <p className="muted">20 quick questions on Excel, SQL, data cleaning and analytical thinking (about 8 minutes). Don't guess: "I don't know" is fine, and it gives you a better starting point.</p>
      <div className="row" style={{ margin: '8px 0 16px' }}>
        {['Excel', 'SQL', 'Data Cleaning', 'Analytical Thinking'].map((s) => <span key={s} className="badge blue">{s}</span>)}
      </div>
      <div className="row">
        <button className="btn primary lg" disabled={!questions.length || !name.trim()} onClick={start}><Icon name="play" size={16} />Start assessment</button>
        <button className="btn ghost" onClick={skip}>Skip, start from the beginning</button>
      </div>
    </div>,
  );

  if (step === 'quiz') {
    const q = questions[i];
    if (!q) return wrap(<Loading />);
    return wrap(
      <div className="stack">
        <div className="row between"><b>Quick assessment</b><span className="muted small">{i + 1} of {questions.length}</span></div>
        <div className="bar"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div>
        <div className="card" style={{ padding: 26 }}>
          <ItemRunner key={q.id} item={{ ...q, options: [...q.options, "I don't know"] }} source="placement" exam showHeader={false}
            examAnswer={answers[q.id] ?? null} onExamAnswer={(a) => { const next = { ...answers, [q.id]: a }; setAnswers(next); keep({ answers: next }); }} />
          <div className="row between" style={{ marginTop: 16 }}>
            <button className="btn ghost" disabled={i === 0} onClick={() => goTo(i - 1)}>Back</button>
            {i < questions.length - 1
              ? <button className="btn primary" disabled={answers[q.id] === undefined || answers[q.id] === null} onClick={() => goTo(i + 1)}>Next <Icon name="arrow" size={15} /></button>
              : <button className="btn primary" disabled={busy || answers[q.id] === undefined || answers[q.id] === null} onClick={finish}>{busy ? <span className="spinner" /> : null}See my roadmap</button>}
          </div>
          {error && <div className="sql-error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      </div>,
    );
  }

  const order = [['excel', 'Excel'], ['sql', 'SQL'], ['pq', 'Power Query'], ['pbi', 'Power BI'], ['think', 'Analyst Thinking']];
  return wrap(
    <div className="card" style={{ padding: 30 }}>
      <div className="label">Your roadmap</div>
      <h1 style={{ marginTop: 6 }}>Here's where you start, {name}.</h1>
      <div className="stack" style={{ margin: '18px 0' }}>
        {order.map(([k, label]) => (
          <div key={k} className="list-row">
            <b>{label}</b>
            <span className={`badge ${result.roadmap[k] === 'Not started' ? '' : 'blue'}`}>{result.roadmap[k]}</span>
          </div>
        ))}
      </div>
      <p className="muted small">Levels you already know were credited as a starting point, not as mastery. They come back as short reviews to confirm them.</p>
      {result.startTopic && (
        <div className="card tint" style={{ marginTop: 10 }}>
          <div className="label">Today</div>
          <h2 style={{ margin: '4px 0' }}>Start with: {result.startTopic.skill} · {result.startTopic.title}</h2>
          <p className="muted small" style={{ margin: 0 }}>Your assessment showed this is the most useful place to begin.</p>
        </div>
      )}
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn primary lg" onClick={() => { onDone(); window.location.hash = result.startTopic ? `#/topic/${result.startTopic.id}` : '#/'; }}><Icon name="play" size={16} />Start</button>
        <button className="btn ghost" onClick={onDone}>Go to my dashboard</button>
      </div>
    </div>,
  );
}
