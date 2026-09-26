import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { api, SKILL_COLORS } from '../api';
import Icon from './Icon';

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => (text ? (marked.parse(text) as string) : ''), [text]);
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Bar({ value, color, size = '' }: { value: number; color?: string; size?: string }) {
  return (
    <div className={`bar ${size}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, background: color }} />
    </div>
  );
}

export function Blocks({ value }: { value: number }) {
  const n = Math.round((value || 0) / 10);
  return <span className="blocks">{'█'.repeat(n)}<span style={{ color: '#d9dee7' }}>{'░'.repeat(10 - n)}</span></span>;
}

export function Stars({ n = 2 }: { n?: number }) {
  return (
    <span className="stars" title={['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'][n] || ''}>
      {'★'.repeat(n)}<span className="off">{'★'.repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}
export const LEVEL_WORD = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];

/**
 * Whether a topic can be opened yet: an access state, not a standing. The old percent words
 * (Learning / Practicing / Good / Mastered / To confirm) are no longer shown anywhere: they read like
 * the Mastery stages but followed different rules. The learner's standing is the Mastery stage
 * (StageTag); a topic's percent is shown as "% covered".
 */
export function LockedBadge() {
  return <span className="badge"><Icon name="lock" size={12} />Locked</span>;
}

/**
 * A topic the placement check credited: it counts towards "% covered", but it is not evidence of what
 * the learner can do, so its Mastery stage still starts from their own work ("Not started" until then).
 * Said in words, so the coverage beside "Not started" is not a puzzle.
 */
export function PlacedNote() {
  return <span className="tiny muted placed-note">Credited by your placement check; a review will confirm it.</span>;
}

export function SkillTag({ skill, name }: { skill: string; name?: string }) {
  return (
    <span className="badge" style={{ background: `${SKILL_COLORS[skill]}14`, color: SKILL_COLORS[skill] }}>
      <span className="skill-dot" style={{ background: SKILL_COLORS[skill] }} />{name || skill}
    </span>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <div className="loading"><span className="spinner" /> {text}</div>;
}

export function ErrorBox({ error }: { error: string }) {
  return <div className="sql-error">{error}</div>;
}

/** Fetch JSON on mount (and when deps change). */
export function useApi<T = any>(path: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setError(null);
    api<T>(path).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { data, error, reload: () => setTick((t) => t + 1), setData };
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{text}</div>;
}

export function fmtNum(v: any) {
  if (typeof v !== 'number') return v;
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
