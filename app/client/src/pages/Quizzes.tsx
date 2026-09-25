import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, SKILL_COLORS, SKILL_NAMES } from '../api';
import ItemRunner from '../components/ItemRunner';
import QuizSession, { QuizReview } from '../components/QuizSession';
import { useSavedWork } from '../saved';
import Icon from '../components/Icon';
import { Bar, Loading, ErrorBox, Markdown, useApi } from '../components/ui';

export default function Quizzes() {
  const { data, error } = useApi<any>('/api/quizzes');
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div>
      <div className="page-head"><div><h1>Quizzes</h1><p>Quick checks, flashcards and exams. Every answer explains why, and every miss comes back later.</p></div></div>
      <div className="grid three">
        <div className="card">
          <div className="label">Mixed review</div>
          <h3 style={{ margin: '6px 0' }}>Review what you've learned</h3>
          <p className="small muted">Questions from your mistakes and from topics due for review.</p>
          <button className="btn primary" onClick={() => nav('/quiz/review')}><Icon name="play" size={14} />Start review</button>
        </div>
        <div className="card">
          <div className="label">Flashcards</div>
          <h3 style={{ margin: '6px 0' }}>{data.cards.due} cards due</h3>
          <p className="small muted">Concepts and "what would you do?" cards. Flip, then say honestly whether you knew it.</p>
          <button className="btn" onClick={() => nav('/flashcards')}><Icon name="cards" size={15} />Open flashcards</button>
        </div>
        <div className="card">
          <div className="label">Short on time?</div>
          <h3 style={{ margin: '6px 0' }}>Quick practice</h3>
          <p className="small muted">One useful exercise, then your score.</p>
          <button className="btn" onClick={() => nav('/quick')}><Icon name="bolt" size={15} />Quick practice</button>
        </div>
      </div>

      <div className="section">
        <h2>Exams</h2>
        <p className="muted small">No teaching and no hints during an exam. At the end: your score, your weak areas and what to study next.</p>
        <div className="grid three">
          {data.exams.map((e: any) => (
            <div key={e.id} className="card">
              <div className="row between"><b style={{ color: SKILL_COLORS[e.skill] }}>{e.title}</b>{e.best !== null && <span className={`badge ${e.best * 100 >= e.pass ? 'green' : 'amber'}`}>Best {Math.round(e.best * 100)}%</span>}</div>
              <div className="small muted" style={{ margin: '6px 0 10px' }}>{e.count} questions · about {e.minutes} min · pass {e.pass}%</div>
              <Link className="btn sm" to={`/exam/${e.id}`}>Start exam</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Topic quizzes</h2>
        <div className="grid two">
          {data.bySkill.map((s: any) => (
            <div key={s.id} className="card">
              <h3 style={{ color: s.color }}>{s.name}</h3>
              {s.topics.map((t: any) => (
                <div key={t.id} className="list-row">
                  <div style={{ flex: 1 }}>
                    <div className="row between"><span>{t.title}</span><span className="tiny muted">{t.level} · {t.count} q</span></div>
                    <div style={{ width: '100%', marginTop: 4 }}><Bar value={t.mastery} size="thin" color={s.color} /></div>
                  </div>
                  {t.unlocked ? <Link className="btn sm" to={`/quiz/topic/${t.id}`}>Quiz</Link> : <span className="badge"><Icon name="lock" size={11} /></span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TopicQuiz() {
  const { id } = useParams();
  const { data: t, error } = useApi<any>(`/api/topics/${id}`, [id]);
  if (error) return <ErrorBox error={error} />;
  if (!t) return <Loading />;
  return (
    <div>
      <div className="page-head"><div><Link to="/quizzes" className="small">← Quizzes</Link><h1 style={{ marginTop: 6 }}>{t.title} quiz</h1></div></div>
      <QuizSession quizKey={t.quizKey} n={6} title={`${t.title} quiz`} continueTo={{ label: 'Back to the topic', to: `/topic/${t.id}` }} />
    </div>
  );
}

export function ReviewQuiz() {
  return (
    <div>
      <div className="page-head"><div><Link to="/quizzes" className="small">← Quizzes</Link><h1 style={{ marginTop: 6 }}>Mixed review</h1><p>Picked from your mistakes and from topics due for review.</p></div></div>
      <QuizSession quizKey="review" n={8} source="review" title="Mixed review" continueTo={{ label: 'Back to quizzes', to: '/quizzes' }} />
    </div>
  );
}

/** A finished quiz attempt, question by question. */
export function QuizSessionPage() {
  const { id } = useParams();
  const { data, error } = useApi<any>(`/api/quiz-sessions/${id}`, [id]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const s = data.session;
  return (
    <div>
      <div className="page-head">
        <div><Link to="/progress" className="small">← My progress</Link><h1 style={{ marginTop: 6 }}>{s.title || 'Quiz'}</h1>
          <p>{s.finishedAt ? `Finished ${new Date(s.finishedAt).toLocaleString()} · ${Math.round((s.score || 0) * 100)}% (${s.correct} of ${s.total})` : 'This quiz is not finished yet.'}</p></div>
      </div>
      {s.finishedAt ? <QuizReview sessionId={s.id} /> : <div className="card empty">Finish the quiz first, then its review appears here.</div>}
    </div>
  );
}

export function Flashcards() {
  const [skill, setSkill] = useState('');
  const { data, error, reload } = useApi<any>(`/api/cards?n=15${skill ? `&skill=${skill}` : ''}`, [skill]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ knew: 0, not: 0 });
  useEffect(() => { setI(0); setFlipped(false); setStats({ knew: 0, not: 0 }); }, [data]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const card = data.cards[i];
  async function mark(knew: boolean) {
    await api(`/api/cards/${card.id}`, { knew });
    setStats((s) => (knew ? { ...s, knew: s.knew + 1 } : { ...s, not: s.not + 1 }));
    setFlipped(false); setI(i + 1);
  }
  return (
    <div>
      <div className="page-head">
        <div><Link to="/quizzes" className="small">← Quizzes</Link><h1 style={{ marginTop: 6 }}>Flashcards</h1><p>Say the answer out loud (or in your head) before flipping.</p></div>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ width: 180 }}><option value="">All skills</option>{Object.entries(SKILL_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {!card ? (
        <div className="card empty">
          <h3>Deck done</h3>
          <p>You knew {stats.knew}, and {stats.not} will come back sooner.</p>
          <button className="btn primary" onClick={reload}>Another round</button>
        </div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="row between small muted" style={{ marginBottom: 8 }}><span>{i + 1} / {data.cards.length} · {card.topicTitle}</span><span className="badge">{card.kind}</span></div>
          <div className="card flash" onClick={() => setFlipped(!flipped)}>
            {!flipped ? <div><div className="label" style={{ marginBottom: 12 }}>Question</div><Markdown text={card.front} /><div className="small muted" style={{ marginTop: 18 }}>Click to reveal the answer</div></div>
              : <div className="back"><div className="label" style={{ marginBottom: 8 }}>Answer</div><Markdown text={card.back} /></div>}
          </div>
          {flipped && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="btn" onClick={() => mark(false)}><Icon name="x" size={15} />Not yet</button>
              <button className="btn good" onClick={() => mark(true)}><Icon name="check" size={15} />I knew it</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExamPage() {
  const { id } = useParams();
  const [exam, setExam] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // one way to load the exam, so a failure always shows a message and a way to try again
  const loadExam = () => { setLoadError(null); return api(`/api/exams/${id}`).then(setExam).catch((e) => setLoadError(e.message)); };
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [i, setI] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [resumed, setResumed] = useState(false);
  const timer = useRef<any>(null);
  const { loaded, save, clear } = useSavedWork<any>(`quiz:exam:${id}`);

  // an exam in progress is saved question by question: a refresh must not wipe 20 answers
  useEffect(() => {
    if (!loaded) return;
    const s = loaded.state;
    if (s && s.finished && s.result && s.exam) {
      // a finished exam keeps showing its result until the learner starts it again
      setExam({ ...s.exam, items: [] }); setResult(s.result); setSeconds(s.seconds || 0); setStarted(true);
    } else if (s && !s.finished && s.ids) {
      api('/api/items/by-ids', { ids: s.ids }).then((r) => {
        if (!r.items || r.items.length !== s.ids.length) { loadExam(); return; }
        setExam({ ...s.exam, items: r.items });
        setAnswers(s.answers || {}); setI(s.index || 0); setSeconds(s.seconds || 0); setStarted(true); setResumed(true);
      }).catch(() => loadExam());
    } else {
      loadExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, id]);

  useEffect(() => {
    if (started && !result) { timer.current = setInterval(() => setSeconds((s) => s + 1), 1000); }
    return () => clearInterval(timer.current);
  }, [started, result]);

  // keep the answers and the clock
  useEffect(() => {
    if (!started || result || !exam) return;
    save({ ids: exam.items.map((x: any) => x.id), exam: { id: exam.id, title: exam.title, minutes: exam.minutes, pass: exam.pass }, answers, index: i, seconds, finished: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, i, started, result]);
  useEffect(() => {
    if (!started || result || !exam) return;
    const t = setInterval(() => save({ ids: exam.items.map((x: any) => x.id), exam: { id: exam.id, title: exam.title, minutes: exam.minutes, pass: exam.pass }, answers, index: i, seconds, finished: false }), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, result, exam, answers, i, seconds]);

  if (!exam && loadError) {
    return (
      <div className="card" role="alert" style={{ maxWidth: 640 }}>
        <h3 style={{ marginTop: 0 }}>This exam could not be opened</h3>
        <p className="small">{loadError}. Nothing has been lost: any answers you gave are saved.</p>
        <div className="row"><button className="btn primary" onClick={loadExam}><Icon name="refresh" size={15} />Try again</button><Link className="btn ghost" to="/quizzes">All quizzes and exams</Link></div>
      </div>
    );
  }
  if (!exam) return <Loading text="Opening the exam…" />;
  if (!started) {
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <Link to="/quizzes" className="small">← Quizzes</Link>
        <h1 style={{ marginTop: 8 }}>{exam.title}</h1>
        <p>{exam.items.length} questions · about {exam.minutes} minutes · pass mark {exam.pass}%</p>
        <ul className="small muted">
          <li>No hints and no explanations until the end.</li>
          <li>You can go back and change answers before you submit.</li>
          <li>SQL questions can be run to preview the result, but not checked.</li>
        </ul>
        <button className="btn primary lg" onClick={() => setStarted(true)}><Icon name="play" size={16} />Start the exam</button>
      </div>
    );
  }
  async function submit() {
    if (!confirm('Submit the exam now?')) return;
    let r: any;
    try { r = await api(`/api/exams/${id}`, { answers, total: exam.items.length }); }
    catch (e: any) { alert(`${e.message}. Your answers are saved - try submitting again.`); return; }
    setResult(r);
    // the exam is over: keep its result (not the answers in progress) so a refresh still shows it
    save({ exam: { id: exam.id, title: exam.title, minutes: exam.minutes, pass: exam.pass }, finished: true, result: r, seconds }, true);
  }
  function again() {
    clear();
    setResult(null); setAnswers({}); setI(0); setSeconds(0); setStarted(false); setResumed(false); setExam(null);
    loadExam();
  }
  if (result) {
    return (
      <div className="stack">
        <div className="card">
          <div className="label">{exam.title} · result</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 16 }}>
            <div className="big-number">{Math.round(result.score * 100)}%</div>
            <span className={`badge ${result.passed ? 'green' : 'red'}`}>{result.passed ? 'Passed' : 'Not passed yet'}</span>
            <span className="muted">{result.correct} of {result.total} right · {Math.floor(seconds / 60)}m {seconds % 60}s</span>
          </div>
          {result.weak.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <b>Study next:</b>
              {result.weak.map((w: any) => <div key={w.topicId} className="list-row"><span>{w.title} <span className="muted small">({w.right}/{w.total})</span></span><Link className="btn sm" to={`/topic/${w.topicId}`}>Open topic</Link></div>)}
            </div>
          ) : <p style={{ marginTop: 10 }}>No weak areas in this exam. The next level is waiting.</p>}
          {result.unchecked > 0 && <p className="small muted">{result.unchecked} answer{result.unchecked > 1 ? 's' : ''} could not be checked by the app and {result.unchecked > 1 ? 'were' : 'was'} left out of the score.</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn primary" to={result.recommend?.[0] ? `/topic/${result.recommend[0]}` : '/quizzes'}>{result.weak.length ? 'Study the first weak topic' : 'Continue learning'}<Icon name="arrow" size={15} /></Link>
            <button className="btn" onClick={again}><Icon name="refresh" size={15} />Take the exam again</button>
            <Link className="btn ghost" to="/quizzes">All quizzes and exams</Link>
          </div>
        </div>
        <h2>Review your answers</h2>
        {result.results.map((r: any, k: number) => (
          <div key={r.id} className="card review-item" style={{ borderLeft: `4px solid ${r.correct ? 'var(--good)' : r.unchecked ? 'var(--warn)' : 'var(--bad)'}` }}>
            <div className="row between"><b>Question {k + 1}</b><span className={`badge ${r.correct ? 'green' : r.unchecked ? 'amber' : 'red'}`}>{r.correct ? 'Right' : r.unchecked ? 'Not checked' : 'Not right'}</span></div>
            <Markdown text={r.prompt} />
            {!r.correct && r.answer && <div className="small">Correct answer: <b>{r.options && r.answer.option !== undefined ? r.options[r.answer.option] : r.answer.value !== undefined ? String(r.answer.value) : r.answer.text ?? r.answer.number ?? r.answer.formula ?? ''}</b>{r.answer.sql && <pre className="mono small">{r.answer.sql}</pre>}</div>}
            {r.feedback && !r.correct && <div className="small muted">{r.feedback}</div>}
            {r.explain && <div className="helptext explain"><Markdown text={r.explain} /></div>}
          </div>
        ))}
      </div>
    );
  }
  const item = exam.items[i];
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined && a !== '' && a !== '=').length;
  return (
    <div className="stack">
      <div className="row between">
        <b>{exam.title}</b>
        <span className="row small muted"><Icon name="clock" size={14} />{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · {answeredCount}/{exam.items.length} answered</span>
      </div>
      {resumed && <div className="resumed"><Icon name="refresh" size={15} /><span>Your exam was saved. Same questions, same answers, and the clock carried on from where it stopped.</span></div>}
      <div className="row" style={{ gap: 4 }}>
        {exam.items.map((it: any, k: number) => (
          <button key={it.id} className="btn sm" style={{ minWidth: 34, padding: '4px 0', background: k === i ? 'var(--primary)' : answers[it.id] !== undefined ? 'var(--primary-soft)' : undefined, color: k === i ? '#fff' : undefined }} onClick={() => setI(k)}>{k + 1}</button>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <ItemRunner key={item.id} item={item} source="exam" exam examAnswer={answers[item.id]} onExamAnswer={(a) => setAnswers((s) => ({ ...s, [item.id]: a }))} showHeader={false} />
      </div>
      <div className="row between">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="back" size={14} />Previous</button>
        {i < exam.items.length - 1 ? <button className="btn primary" onClick={() => setI(i + 1)}>Next <Icon name="arrow" size={14} /></button>
          : <button className="btn primary" onClick={submit}>Submit exam</button>}
      </div>
    </div>
  );
}
