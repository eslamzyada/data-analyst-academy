// The content coverage matrix: for every topic, what there is to learn and practise with, how it
// compares with the targets in server/content/targets.js, and why a topic counts as weak.
import { metaOf } from '../../server/content/index.js';
import { generatorsFor } from '../../server/content/generated.js';
import { tierOf, targetOf, MAX_SINGLE_FORMAT_SHARE, MIN_KINDS } from '../../server/content/targets.js';

const count = (list, key) => list.reduce((m, x) => { const k = key(x); m[k] = (m[k] || 0) + 1; return m; }, {});

export function topicCoverage(content) {
  const projectsByTopic = {};
  for (const p of content.projects) {
    for (const s of p.steps) for (const t of s.topics || []) (projectsByTopic[t] ||= new Set()).add(p.id);
  }
  return content.topics.map((t) => {
    const quiz = t.quiz || [];
    const practice = t.practice || [];
    const tier = tierOf(t.id);
    const target = targetOf(t.id);
    const formats = count(quiz, (q) => metaOf(q).format);
    const kinds = count(quiz, (q) => metaOf(q).kind);
    const topFormat = Object.entries(formats).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const topShare = quiz.length ? topFormat[1] / quiz.length : 0;
    const row = {
      skill: t.skill, skillName: content.skillMap[t.skill].name, level: t.level, id: t.id, title: t.title, tier,
      lessonChars: (t.lesson || '').trim().length, tryIt: t.tryIt ? t.tryIt.type : null,
      practice: practice.length, practiceTypes: count(practice, (p) => p.type),
      challenge: t.challenge ? t.challenge.type : null,
      quiz: quiz.length, quizTarget: target.quizMin, quizMax: target.quizMax, practiceTarget: target.practiceMin,
      formats, topFormat: topFormat[0], topFormatShare: Math.round(topShare * 100),
      kinds, kindCount: Object.keys(kinds).length,
      difficulty: count(quiz, (q) => q.difficulty || 2),
      projects: [...(projectsByTopic[t.id] || [])], cards: (t.cards || []).length,
      generators: generatorsFor(t.id).length,
    };
    const weak = [];
    if (row.lessonChars < 600) weak.push('short lesson');
    if (row.quiz < target.quizMin) weak.push(`quiz ${row.quiz}/${target.quizMin}`);
    if (row.practice < target.practiceMin) weak.push(`practice ${row.practice}/${target.practiceMin}`);
    if (target.challenge && !row.challenge) weak.push('no challenge');
    if (row.quiz >= 10 && topShare > MAX_SINGLE_FORMAT_SHARE) weak.push(`${row.topFormatShare}% ${row.topFormat}`);
    if (row.quiz >= 10 && row.kindCount < MIN_KINDS) weak.push(`only ${row.kindCount} kinds of question`);
    row.weak = weak;
    return row;
  });
}

export function skillTotals(content, rows) {
  return content.skills.map((sk) => {
    const r = rows.filter((x) => x.skill === sk.id);
    const topicIds = new Set(r.map((x) => x.id));
    return {
      skill: sk.id, name: sk.name, topics: r.length, lessons: r.filter((x) => x.lessonChars > 0).length,
      quiz: r.reduce((a, x) => a + x.quiz, 0), practice: r.reduce((a, x) => a + x.practice, 0),
      challenges: r.filter((x) => x.challenge).length,
      projects: content.projects.filter((p) => p.steps.some((s) => (s.topics || []).some((t) => topicIds.has(t)))).length,
      weakTopics: r.filter((x) => x.weak.length).length,
    };
  });
}

export function coverageMarkdown(content, rows, { title = 'Content coverage', generatedAt = new Date().toISOString() } = {}) {
  const totals = skillTotals(content, rows);
  const lines = [`# ${title}`, '', `Generated ${generatedAt} by \`npm run coverage\`. Targets: server/content/targets.js.`, ''];
  lines.push('## Totals', '', '| Skill | Topics | Lessons | Quiz questions | Practice tasks | Challenges | Projects using it | Weak topics |', '|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const t of totals) lines.push(`| ${t.name} | ${t.topics} | ${t.lessons} | ${t.quiz} | ${t.practice} | ${t.challenges} | ${t.projects} | ${t.weakTopics} |`);
  const all = (k) => totals.reduce((a, t) => a + t[k], 0);
  lines.push(`| **All** | ${all('topics')} | ${all('lessons')} | ${all('quiz')} | ${all('practice')} | ${all('challenges')} | ${content.projects.length} projects | ${all('weakTopics')} |`, '');
  for (const sk of content.skills) {
    lines.push(`## ${sk.name}`, '', '| Level | Topic | Tier | Lesson | Practice | Challenge | Quiz | Top format | Kinds | Projects | Status |', '|---|---|---|---:|---:|---|---:|---|---:|---:|---|');
    for (const r of rows.filter((x) => x.skill === sk.id)) {
      lines.push(`| ${r.level} | ${r.title} (\`${r.id}\`) | ${r.tier} | ${r.lessonChars} ch | ${r.practice}/${r.practiceTarget} | ${r.challenge || '-'} | ${r.quiz}/${r.quizTarget} | ${r.topFormat} ${r.topFormatShare}% | ${r.kindCount} | ${r.projects.length} | ${r.weak.length ? `weak: ${r.weak.join(', ')}` : 'ok'} |`);
    }
    lines.push('');
  }
  lines.push('## Projects', '', '| Project | Business | Level | Steps | Tools |', '|---|---|---:|---:|---|');
  for (const p of content.projects) lines.push(`| ${p.title} (\`${p.id}\`) | ${p.business} | ${p.difficulty} | ${p.steps.length} | ${(p.skills || []).join(' + ')} |`);
  lines.push('');
  return lines.join('\n');
}
