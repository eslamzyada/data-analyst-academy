import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, SKILL_COLORS } from '../api';
import Icon from '../components/Icon';
import { Bar, Loading, ErrorBox, LockedBadge, PlacedNote, useApi } from '../components/ui';
import { StageLadder, StageTag } from '../components/Mastery';

export default function Learn() {
  const { data, error } = useApi<any[]>('/api/skills');
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div>
      <div className="page-head"><div><h1>Learn</h1><p>Pick a skill to see its path. Progress comes from what you can actually do, not from pages you've read.</p></div></div>
      <div className="grid two">
        {data.map((s) => (
          <div key={s.id} className="card skill-card" onClick={() => nav(`/learn/${s.id}`)}>
            <h2 style={{ margin: 0, color: SKILL_COLORS[s.id] }}>{s.name.toUpperCase()}</h2>
            <div className="row" style={{ gap: 6 }}><span className="label" style={{ margin: 0 }}>Mastery</span><StageLadder stage={s.masteryStage} compact /><StageTag stage={s.masteryStage} /><span className="tiny muted">{s.masterySummary}</span></div>
            <div className="small muted">Current curriculum: <b>{s.tierStage}</b> <span className="tiny">({s.levels.join(' → ')})</span></div>
            <p className="muted small" style={{ margin: 0 }}>{s.blurb}</p>
            <div className="row between small"><span>Topics covered</span><b>{s.progress}%</b></div>
            <Bar value={s.progress} color={SKILL_COLORS[s.id]} />
            <div className="row between small muted">
              <span>{s.topics} topics</span>
              {s.next && <span>Next: <b>{s.next.title}</b></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The path icon follows the Mastery stage (what the learner can do), not the topic's percent:
// a tick only once the work shows Competent or better. The classes reuse the existing colours.
const MASTERY_ICON: Record<string, [string, string]> = {
  none: ['new', '→'], introduced: ['learning', '●'], learning: ['learning', '●'], practicing: ['learning', '●'],
  competent: ['good', '✓'], independent: ['good', '✓'], strong: ['good', '✓'],
};
function nodeIcon(t: any): [string, string] {
  if (t.status === 'locked') return ['locked', ''];
  if (t.masteryStage === 'none' && t.status === 'placed') return ['placed', '~']; // credited by the placement check, to confirm
  return MASTERY_ICON[t.masteryStage] || MASTERY_ICON.none;
}

export function SkillPath() {
  const { skill } = useParams();
  const { data, error, reload } = useApi<any>(`/api/skills/${skill}`, [skill]);
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const tiers = data.levels.map((lv: string) => ({ lv, topics: data.path.filter((t: any) => t.level === lv) })).filter((g: any) => g.topics.length);
  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/learn" className="small">← Learn</Link>
          <h1 style={{ color: SKILL_COLORS[data.id], marginTop: 6 }}>{data.name}</h1>
          <p>{data.blurb}</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <div className="row" style={{ gap: 6 }}><span className="label" style={{ margin: 0 }}>Mastery</span><StageLadder stage={data.masteryStage} compact /><StageTag stage={data.masteryStage} /></div>
          <div className="tiny muted" style={{ margin: '2px 0 6px' }}>{data.masteryMeaning}</div>
          <div className="small muted">Current curriculum: <b>{data.tierStage}</b></div>
          <div className="row between small" style={{ marginTop: 4 }}><span>Topics covered</span><b>{data.progress}%</b></div>
          <Bar value={data.progress} color={SKILL_COLORS[data.id]} />
        </div>
      </div>
      <div className="path">
        {tiers.map((g: any) => (
          <div key={g.lv} className="path-group">
            <div className="label" style={{ marginBottom: 10 }}>{g.lv} curriculum</div>
            {g.topics.map((t: any) => {
              const rec = t.id === data.recommended;
              const [iconCls, icon] = nodeIcon(t);
              return (
                <div key={t.id} className={`path-node ${t.status === 'locked' ? 'locked' : ''} ${rec ? 'rec' : ''}`} onClick={() => t.status !== 'locked' && nav(`/topic/${t.id}`)}>
                  <div className={`node-icon ${iconCls}`} title={iconCls === 'placed' ? 'Credited by your placement check' : undefined}>{t.status === 'locked' ? <Icon name="lock" size={15} /> : icon}</div>
                  <div>
                    <div className="row"><b>{t.title}</b>{rec && <span className="badge blue">Recommended next</span>}{t.reviewDue && <span className="badge amber">Review due</span>}</div>
                    <div className="small muted">{t.summary}</div>
                    {t.status === 'placed' && <PlacedNote />}
                    {t.status === 'locked' && t.prereqs?.length > 0 && <div className="tiny muted" style={{ marginTop: 2 }}>Unlocks when you're comfortable with: {t.prereqs.join(', ')}</div>}
                  </div>
                  <div className="stack" style={{ alignItems: 'flex-end', gap: 6, minWidth: 110 }}>
                    {t.status === 'locked' ? <LockedBadge /> : <span className="row" style={{ gap: 4 }}><StageLadder stage={t.masteryStage} compact /><StageTag stage={t.masteryStage} /></span>}
                    {t.status !== 'locked' ? <div style={{ width: 110 }}><Bar value={t.mastery} size="thin" color={SKILL_COLORS[data.id]} /><div className="tiny muted" style={{ textAlign: 'right' }}>{t.mastery}% covered</div></div>
                      : <button className="btn sm ghost" onClick={async (e) => { e.stopPropagation(); if (confirm('Unlock this topic now? It is recommended to finish the earlier topics first.')) { await api(`/api/topics/${t.id}/unlock`, {}); reload(); } }}>Unlock anyway</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
