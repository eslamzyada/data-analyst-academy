// The Mastery Layer, as the learner sees it: a stage word with a small ladder, four marks for the
// kinds of evidence, and the plain-language list of what would move a stage up. The model behind
// it is detailed; what is shown stays simple.
import Icon from './Icon';

export const STAGES = ['introduced', 'learning', 'practicing', 'competent', 'independent', 'strong'];
export const STAGE_LABEL: Record<string, string> = { none: 'Not started', introduced: 'Introduced', learning: 'Learning', practicing: 'Practicing', competent: 'Competent', independent: 'Independent', strong: 'Strong' };
const DIM_SHORT: Record<string, string> = { knowledge: 'Understands', skill: 'Can do', application: 'Applies', independence: 'On own' };

/** A six-step ladder with the current stage filled in. */
export function StageLadder({ stage, compact = false }: { stage: string; compact?: boolean }) {
  const at = STAGES.indexOf(stage);
  return (
    <span className={`stage-ladder ${compact ? 'compact' : ''}`} title={`${STAGE_LABEL[stage] || stage}: ${at + 1} of 6`} aria-label={`Stage: ${STAGE_LABEL[stage] || stage}`}>
      {STAGES.map((s, i) => <span key={s} className={i <= at ? 'on' : ''} />)}
    </span>
  );
}

export function StageTag({ stage }: { stage: string }) {
  const at = STAGES.indexOf(stage);
  const cls = at >= 4 ? 'green' : at >= 3 ? 'blue' : at >= 1 ? 'amber' : '';
  return <span className={`badge ${cls}`}>{STAGE_LABEL[stage] || stage}</span>;
}

const MARK: Record<string, { sym: string; cls: string; word: string }> = {
  shown: { sym: '✓', cls: 'shown', word: 'shown' },
  started: { sym: '◐', cls: 'started', word: 'started, not yet shown' },
  none: { sym: '○', cls: 'none', word: 'no evidence yet' },
  na: { sym: '–', cls: 'na', word: 'not tested by the content' },
};

/** The four kinds of evidence as small marks. */
export function Dims({ dims, labels = true }: { dims: Record<string, any>; labels?: boolean }) {
  return (
    <span className="dims">
      {['knowledge', 'skill', 'application', 'independence'].map((d) => {
        const v = dims?.[d] || { state: 'none' };
        const m = MARK[v.state] || MARK.none;
        return (
          <span key={d} className={`dim ${m.cls}`} title={`${v.label || DIM_SHORT[d]}: ${m.word}${v.need ? ` (${v.have} of ${v.need})` : ''}`}>
            <b>{m.sym}</b>{labels && <span>{DIM_SHORT[d]}</span>}
          </span>
        );
      })}
    </span>
  );
}

/** What would move the stage up, as a short checklist. */
export function NextSteps({ next, limit = 4 }: { next: any[]; limit?: number }) {
  if (!next || !next.length) return <p className="small muted" style={{ margin: 0 }}>Nothing left to show here: keep it fresh with reviews.</p>;
  return (
    <ul className="next-steps">
      {next.slice(0, limit).map((n, i) => (
        <li key={i}><span>{n.text}</span>{n.need > 0 && <span className="tiny muted">{n.unit === '%' ? `now ${n.have}%` : `${Math.min(n.have, n.need)} of ${n.need}`}</span>}</li>
      ))}
    </ul>
  );
}

const RATING_SYM = ['✗', '~', '✓'];

/** The verdict on a tool choice: each tool, its verdict and why, rated on the six things that decide it. */
export function ToolVerdicts({ result }: { result: any }) {
  if (!result?.tools) return null;
  const criteria = result.tools[0]?.ratings || [];
  return (
    <div className="tool-verdicts">
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Tool</th><th>Verdict</th>{criteria.map((c: any) => <th key={c.criterion} className="tiny">{c.label}</th>)}</tr></thead>
          <tbody>
            {result.tools.map((t: any) => (
              <tr key={t.id} className={t.chosen ? 'chosen' : ''}>
                <td><b>{t.name}</b>{t.chosen && <span className="badge blue" style={{ marginLeft: 6 }}>your choice</span>}</td>
                <td><span className={`badge ${t.verdict === 'best' ? 'green' : t.verdict === 'good' ? 'blue' : 'red'}`}>{t.verdict === 'best' ? 'Best fit' : t.verdict === 'good' ? 'Works' : 'Weak here'}</span></td>
                {t.ratings.map((r: any) => <td key={r.criterion} className={`rating r${r.rating}`} title={`${r.label}: ${r.word}`}>{RATING_SYM[r.rating]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.tools.map((t: any) => <p key={t.id} className="small" style={{ margin: '6px 0' }}><b>{t.name}:</b> {t.why}</p>)}
      <p className="small muted" style={{ margin: '6px 0 0' }}>{result.justification}</p>
    </div>
  );
}

/** Feedback on a pick-every-true part. */
export function SelectResult({ result }: { result: any }) {
  if (!result?.options) return null;
  return (
    <div className="select-result">
      {result.options.map((o: any, i: number) => {
        const ok = o.picked === o.right;
        return (
          <div key={i} className={`sel-row ${ok ? 'ok' : 'no'}`}>
            <span className="sel-mark"><Icon name={ok ? 'check' : 'x'} size={14} stroke={3} /></span>
            <div><div className="small">{o.text} {o.right ? <span className="badge green">true</span> : <span className="badge">not true</span>}{o.picked && <span className="badge blue">you picked it</span>}</div>{o.why && <div className="tiny muted">{o.why}</div>}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Feedback on a choose-the-best-reading part. */
export function ScopeResult({ result }: { result: any }) {
  if (!result?.options) return null;
  return (
    <div className="select-result">
      {result.options.map((o: any, i: number) => (
        <div key={i} className={`sel-row ${o.score >= 1 ? 'ok' : o.chosen ? 'no' : ''}`}>
          <span className="sel-mark">{o.score >= 1 ? <Icon name="check" size={14} stroke={3} /> : o.chosen ? <Icon name="x" size={14} stroke={3} /> : ''}</span>
          <div><div className="small">{o.text} {o.chosen && <span className="badge blue">your answer</span>}</div>{o.why && <div className="tiny muted">{o.why}</div>}</div>
        </div>
      ))}
    </div>
  );
}

const CRIT_WORD: Record<string, string> = { shown: 'Shown', partial: 'Partly', weak: 'Needs work', untested: 'Not tested' };

/** The ten criteria a piece of work is judged on. */
export function CriteriaProfile({ criteria }: { criteria: any[] }) {
  if (!criteria?.length) return null;
  return (
    <div className="criteria-grid">
      {criteria.map((c) => (
        <div key={c.id} className={`crit ${c.state}`} title={c.means}>
          <span>{c.label}</span><b>{CRIT_WORD[c.state]}</b>
        </div>
      ))}
    </div>
  );
}

/** The six reasoning qualities: pre-ticked where the app found them, the learner confirms the rest. */
export function ReasoningCheck({ items, ticks, onTicks, disabled = false }: { items: any[]; ticks: boolean[]; onTicks: (t: boolean[]) => void; disabled?: boolean }) {
  return (
    <div className="reasoning-check">
      {items.map((r: any, i: number) => (
        <label key={r.id || i} className="check-row">
          <input type="checkbox" disabled={disabled} checked={!!ticks[i]} onChange={(e) => { const t = [...ticks]; t[i] = e.target.checked; onTicks(t); }} />
          <span>
            <b>{r.label}</b> {r.detected ? <span className="badge green">found in your answer</span> : r.warning ? <span className="badge red">check this</span> : null}
            <span className="tiny muted" style={{ display: 'block' }}>{r.warning || !r.detected ? r.note : r.hint || r.note}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
