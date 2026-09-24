import { Link, useNavigate } from 'react-router-dom';
import { SKILL_COLORS } from '../api';
import Icon from '../components/Icon';
import { Bar, Blocks, Loading, ErrorBox, Stars, StatusBadge, useApi, LEVEL_WORD } from '../components/ui';
import { StageLadder, StageTag } from '../components/Mastery';

export default function Home() {
  const { data: h, error } = useApi<any>('/api/home');
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} />;
  if (!h) return <Loading />;
  const f = h.focus;
  const last = h.profile.lastActivity;
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Welcome back{h.profile.name ? `, ${h.profile.name}` : ''}.</h1>
          <p>{h.milestones.achieved} of {h.milestones.total} milestones earned{h.milestones.next && <> · next: <b>{h.milestones.next.name}</b> ({h.milestones.next.met} of {h.milestones.next.total} requirements met)</>}</p>
        </div>
        <div className="row">
          <Link to="/quick" className="btn"><Icon name="bolt" size={16} />Quick practice</Link>
          <Link to="/progress" className="btn ghost">My progress</Link>
        </div>
      </div>

      {h.milestones.awarded?.length > 0 && (
        <div className="card won-banner">
          <Icon name="medal" size={20} /> <b>New milestone earned:</b> {h.milestones.awarded.join(', ')}. <Link to="/progress">See what it took</Link>
        </div>
      )}
      <div className="hero">
        <div className="card main-cta" style={{ padding: 26 }}>
          <div className="label" style={{ color: '#dbe7ff' }}>Data Analyst Mastery</div>
          <div className="row between" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 15 }}>Overall progress</span><b style={{ fontSize: 22 }}>{h.overall}%</b>
          </div>
          <Bar value={h.overall} size="thick" />
          <div className="divider" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="label" style={{ color: '#dbe7ff' }}>Today's focus</div>
          <h2 style={{ margin: '4px 0 2px' }}>{f.skillName} · {f.topic.level}</h2>
          <div style={{ fontSize: 17, marginBottom: 6 }}>Current topic: <b>{f.topic.title}</b></div>
          <p className="muted" style={{ margin: '0 0 16px' }}>{f.reason}{h.focusAdapt && <><br /><span style={{ color: '#fff' }}>{h.focusAdapt.message}</span></>}</p>
          <div className="row">
            <button className="btn primary lg" onClick={() => nav('/today')}><Icon name="play" size={16} />Start today</button>
            <button className="btn ghost" onClick={() => nav(`/topic/${f.topic.id}`)}>{f.topic.lessonDone ? 'Open topic' : 'Start lesson'}</button>
            {h.today && <span className="small" style={{ color: '#dbe7ff' }}>Today: {h.today.done}/{h.today.steps} steps done</span>}
          </div>
        </div>

        <div className="stack">
          {h.analyst?.assessment?.due ? (
            <div className="card arrival">
              <div className="label"><Icon name="alert" size={14} /> A new problem has arrived</div>
              <h3 style={{ margin: '6px 0 4px' }}>{h.analyst.assessment.title}</h3>
              <p className="small muted" style={{ margin: '0 0 10px' }}>An unfamiliar problem on data you have not seen. No method, no hints: you work out what to do.</p>
              <Link to={`/analyst/${h.analyst.assessment.taskId}`} className="btn primary"><Icon name="briefcase" size={14} />Open it</Link>
            </div>
          ) : h.analyst?.recommended && (
            <div className="card">
              <div className="label">Real Analyst · {h.analyst.recommended.levelName}</div>
              <h3 style={{ margin: '6px 0 4px' }}>{h.analyst.recommended.title}</h3>
              <p className="small muted" style={{ margin: '0 0 10px' }}>A request from {h.analyst.recommended.from.name}. Nobody tells you how.</p>
              <Link to={`/analyst/${h.analyst.recommended.id}`} className="btn"><Icon name="briefcase" size={14} />Open the request</Link>
            </div>
          )}
          {h.practice && (
            <div className="card">
              <div className="label">Recommended practice</div>
              <h3 style={{ margin: '6px 0 4px' }}>{h.practice.title || 'Practice task'}</h3>
              <div className="row small muted" style={{ marginBottom: 10 }}><Stars n={h.practice.difficulty} /><span>{LEVEL_WORD[h.practice.difficulty]}</span>{h.practice.business && <span className="badge">{h.practice.business}</span>}</div>
              <Link to={`/task/${h.practice.id}`} className="btn primary"><Icon name="play" size={14} />Start</Link>
            </div>
          )}
          {(h.unfinished?.length > 0 || (last && last.path && last.path !== '/')) && (
            <div className="card">
              <div className="label">Continue where you left off</div>
              {h.unfinished?.length > 0 ? (
                <div className="stack" style={{ marginTop: 8, gap: 6 }}>
                  {h.unfinished.slice(0, 4).map((u: any) => (
                    <div key={u.key} className="row between">
                      <span className="small"><span className="badge amber">{u.kind}</span> {u.label}{u.detail && <span className="muted"> · {u.detail}</span>}</span>
                      <Link to={u.to} className="btn sm">Carry on <Icon name="arrow" size={14} /></Link>
                    </div>
                  ))}
                  <span className="mini muted">Your unfinished answers are saved and will be put back.</span>
                </div>
              ) : (
                <div className="row between" style={{ marginTop: 6 }}>
                  <span>{last.label || 'Your last activity'}</span>
                  <Link to={last.path} className="btn sm">Continue <Icon name="arrow" size={14} /></Link>
                </div>
              )}
            </div>
          )}
          <div className="card">
            <div className="label">Short on time?</div>
            <p className="muted small" style={{ margin: '6px 0 10px' }}>One useful exercise in 10–20 minutes, picked from what you need most.</p>
            <Link to="/quick" className="btn"><Icon name="bolt" size={15} />Quick practice</Link>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="row between"><h2>Your skills</h2><Link to="/learn" className="small">All learning paths →</Link></div>
        <div className="grid five">
          {h.skills.map((s: any) => (
            <div key={s.id} className="card skill-card" onClick={() => nav(`/learn/${s.id}`)}>
              <div className="row between"><b style={{ color: SKILL_COLORS[s.id] }}>{s.name}</b></div>
              <div className="row" style={{ gap: 6 }}><StageLadder stage={s.masteryStage} compact /><StageTag stage={s.masteryStage} /></div>
              <div className="tiny muted">{s.masterySummary}</div>
              <Blocks value={s.progress} />
              <div className="row between small"><span className="muted">Topics covered</span><b>{s.progress}%</b></div>
              {s.next && <div className="tiny muted">Next: {s.next.title}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid two section">
        <div className="card">
          <div className="row between"><h3>Recent mistakes</h3><Link to="/progress" className="small">All →</Link></div>
          {h.mistakes.length === 0 && <p className="muted small">No open mistakes. When you get something wrong, it lands here and comes back until you've fixed it.</p>}
          {h.mistakes.map((m: any, i: number) => (
            <div key={i} className="list-row">
              <div>
                <div><b>{m.topicTitle || m.conceptName}</b> <span className="badge red">{m.count}×</span></div>
                <div className="small muted">{m.label}</div>
              </div>
              {m.topicId && <Link to={`/topic/${m.topicId}?tab=practice`} className="btn sm">Practice</Link>}
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Coming back for review</h3>
          {h.reviewsDue.length === 0 && <p className="muted small">Nothing due. Topics you've learned come back after 1, 3, 7, 14 and 30 days, so you don't forget them.</p>}
          {h.reviewsDue.map((t: any) => (
            <div key={t.id} className="list-row"><span>{t.title}</span><Link className="btn sm" to={`/quiz/topic/${t.id}?review=1`}>Review</Link></div>
          ))}
          <div className="divider" />
          <div className="label">Current topic status</div>
          <div className="row" style={{ marginTop: 8 }}><span>{f.topic.title}</span><StatusBadge status={f.topic.status} /><span className="muted small">{f.topic.mastery}%</span></div>
        </div>
      </div>
    </div>
  );
}
