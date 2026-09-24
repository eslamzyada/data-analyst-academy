import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ItemRunner, { Draft } from '../components/ItemRunner';
import Icon from '../components/Icon';
import { Loading, ErrorBox } from '../components/ui';
import { useSavedWork } from '../saved';
import { isRecordable } from '../../../shared/lifecycle.js';

type QuickState = {
  itemId: string | null;
  topic: { id: string; title: string } | null;
  draft: Draft | null;          // answer chosen but not checked yet
  result: any;                  // the check of the current question, with the answer given
  right: number;
  total: number;
};

const EMPTY: QuickState = { itemId: null, topic: null, draft: null, result: null, right: 0, total: 0 };

// Short sessions: one useful exercise at a time, then a score.
// The whole session (current question, unchecked answer, result, score) is saved on the server,
// so a refresh or a restart puts the learner back on the same question.
export default function Quick() {
  const { loaded, save } = useSavedWork<QuickState>('session:quick');
  const [st, setSt] = useState<QuickState | null>(null);
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const keep = (next: QuickState, now = false) => { setSt(next); save(next, now); };

  async function draw(base: QuickState) {
    setItem(null); setEmpty(false);
    try {
      const q = await api('/api/quick');
      if (!q.item) { setEmpty(true); return; }
      setItem(q.item);
      keep({ ...base, itemId: q.item.id, topic: q.topic, draft: null, result: null }, true);
    } catch (e: any) { setError(e.message); }
  }

  // first load: the saved question, or a new one
  useEffect(() => {
    if (!loaded || st) return;
    const saved = loaded.state && loaded.state.itemId ? { ...EMPTY, ...loaded.state } : null;
    if (!saved) { setSt(EMPTY); draw(EMPTY); return; }
    setSt(saved);
    api(`/api/items/${saved.itemId}`).then(setItem).catch(() => draw(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (error) return <ErrorBox error={error} />;
  const answered = !!st?.result;

  function onAnswered(r: any) {
    if (!st || st.result) return;
    const counts = isRecordable(r.outcome);
    keep({ ...st, draft: null, result: r, right: st.right + (counts && r.correct ? 1 : 0), total: st.total + (counts ? 1 : 0) }, true);
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div><Link to="/" className="small">← Home</Link><h1 style={{ marginTop: 6 }}>Quick practice</h1><p>One exercise at a time, picked from your weak spots, your reviews and your current topic.</p></div>
        <div className="kpi" style={{ textAlign: 'right' }}>
          <span className="label">This session</span><span className="v">{st ? `${st.right}/${st.total}` : '-'}</span>
          {st && st.total > 0 && <button className="linky small" onClick={() => draw({ ...EMPTY })}>Start a new session</button>}
        </div>
      </div>
      {empty ? <div className="card empty">Nothing to practise yet. Start a topic in Learn first.</div> : !st || !item ? <Loading /> : (
        <div className="card" style={{ padding: 24 }}>
          {st.topic && <div className="small muted" style={{ marginBottom: 8 }}>From: <Link to={`/topic/${st.topic.id}`}>{st.topic.title}</Link></div>}
          <ItemRunner key={item.id} item={item} source="quick" persist={false} showDone={false} showHeader={item.type === 'sql' || item.type === 'formula'}
            initial={st.result ? { answer: st.result.given, result: st.result } : st.draft}
            onDraft={(d) => keep({ ...st, draft: d })}
            onAnswered={onAnswered} />
          {answered && (
            <div className="donebar" role="status">
              <span className="done-flag"><Icon name="check" size={16} />Answered</span>
              <span className="small">Score so far: {st.right} of {st.total}</span>
              <div className="donebar-actions">
                <button className="btn primary" onClick={() => draw(st)}>Another one <Icon name="arrow" size={14} /></button>
                <Link className="btn" to="/">Done for now</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
