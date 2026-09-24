// Checks for Real Analyst work (server/content/analyst.js) and for the choosing steps projects
// gained (server/content/projects-evaluation.js). Used by tools/validate-content.js.
import fs from 'node:fs';
import path from 'node:path';
import { gradeParts } from '../../server/grading/excel.js';
import { gradeTools, gradeSelect, gradeScope } from '../../server/grading/analyst.js';
import { CRITERIA_MAP } from '../../server/content/criteria.js';
import { CONCEPTS, CONCEPT_SKILL } from '../../server/content/concepts.js';
import { COMPETENCIES } from '../../server/content/competencies.js';

const TOOL_IDS = ['excel', 'sql', 'pq', 'pbi'];
const VERDICTS = ['best', 'good', 'weak'];
// Real Analyst requests must not tell the learner which tool, formula or technique to use.
const METHOD_WORDS = /\b(SQL(?! Lab)|Power Query|Power BI|PivotTables?|VLOOKUP|XLOOKUP|SUMIFS?|COUNTIFS?|LEFT JOIN|INNER JOIN|GROUP BY|CTEs?|DAX|unpivot|Merge Queries)\b/i;
const sum = (r) => String(r).split('').reduce((a, d) => a + Number(d), 0);

/** A tools part or step: every tool rated, one at least "best", ratings that agree with verdicts. */
export function checkTools(id, part, err) {
  if (!part.tools || typeof part.tools !== 'object') return err(id, 'tools part has no tool ratings');
  for (const t of TOOL_IDS) {
    const v = part.tools[t];
    if (!v) { err(id, `tool ${t} has no rating`); continue; }
    if (!VERDICTS.includes(v.verdict)) err(id, `tool ${t}: verdict must be best, good or weak`);
    if (!/^[012]{6}$/.test(String(v.rate || ''))) err(id, `tool ${t}: rate must be six digits 0-2 (correctness, scalability, repeatability, clarity, volume, need)`);
    if (!v.why || v.why.length < 40) err(id, `tool ${t}: explain the verdict (40+ characters)`);
  }
  const verdictOf = (t) => part.tools[t]?.verdict;
  if (!TOOL_IDS.some((t) => verdictOf(t) === 'best')) err(id, 'no tool is marked best');
  // a "best" tool must not be rated below a "weak" one
  const best = TOOL_IDS.filter((t) => verdictOf(t) === 'best').map((t) => sum(part.tools[t].rate));
  const weak = TOOL_IDS.filter((t) => verdictOf(t) === 'weak').map((t) => sum(part.tools[t].rate));
  if (best.length && weak.length && Math.min(...best) <= Math.max(...weak)) err(id, 'a "best" tool is rated no higher than a "weak" one');
  // the grader: a best choice with two reasons scores 1; a weak-only choice scores low
  const bestTool = TOOL_IDS.find((t) => verdictOf(t) === 'best');
  const full = gradeTools(part, { tools: [bestTool], why: 'It repeats every month and copes with the data volume.' });
  if (full.score < 0.999) err(id, `choosing the best tool with reasons scores ${full.score}, not 1`);
  const weakTool = TOOL_IDS.find((t) => verdictOf(t) === 'weak');
  if (weakTool && gradeTools(part, { tools: [weakTool], why: 'x' }).score > 0.3) err(id, 'choosing only a weak tool scores too well');
}

/** A select part or step: real right and wrong options, each explained, graded sensibly. */
export function checkSelect(id, part, err) {
  const opts = part.options || [];
  if (opts.length < 4) err(id, 'a pick-every-true part needs at least 4 options');
  if (!opts.some((o) => o.right)) err(id, 'no option is right');
  if (!opts.some((o) => !o.right)) err(id, 'every option is right: nothing to judge');
  for (const [i, o] of opts.entries()) {
    if (!o.text) err(id, `option ${i + 1} has no text`);
    if (!o.why || o.why.length < 15) err(id, `option ${i + 1} needs a reason (why it is or is not right)`);
  }
  const right = opts.map((o, i) => (o.right ? i : -1)).filter((i) => i >= 0);
  if (gradeSelect(part, right).score < 0.999) err(id, 'picking exactly the right options does not score 1');
  if (gradeSelect(part, opts.map((_, i) => i)).score >= 0.999) err(id, 'picking every option scores full marks');
}

export function checkScope(id, part, err) {
  const opts = part.options || [];
  if (opts.length < 3) err(id, 'a choose-one part needs at least 3 options');
  if (opts.filter((o) => o.score === 1).length !== 1) err(id, 'exactly one option must score 1');
  for (const [i, o] of opts.entries()) {
    if (typeof o.score !== 'number' || o.score < 0 || o.score > 1) err(id, `option ${i + 1}: score must be between 0 and 1`);
    if (!o.why || o.why.length < 15) err(id, `option ${i + 1} needs a reason`);
  }
  if (gradeScope(part, opts.findIndex((o) => o.score === 1)).score !== 1) err(id, 'the best option does not score 1');
}

/** Numbers: each expected answer grades itself, and a 25% wrong answer is rejected. */
export function checkNumbers(id, part, err) {
  const exp = part.expected;
  if (!Array.isArray(exp) || exp.length !== (part.questions || []).length) return err(id, 'expected answers do not match the questions');
  exp.forEach((v, i) => { if (v === null || v === undefined || Number.isNaN(v)) err(id, `expected[${i}] is empty`); });
  const self = gradeParts(part.questions, exp, exp.map(String));
  if (self.score < 0.999) err(id, `its own answers do not grade as right: ${self.parts.filter((p) => !p.correct).map((p) => p.label).join('; ')}`);
  exp.forEach((v, i) => {
    if (typeof v !== 'number' || part.questions[i].month) return;
    const wrong = v * 1.25 + (v === 0 ? 3 : 0);
    if (gradeParts([part.questions[i]], [v], [String(wrong)]).parts[0].correct) err(id, `question ${i + 1}: ${wrong} is accepted for ${v}; the tolerance is too wide`);
  });
}

export function checkCriteria(id, list, err) {
  for (const c of list || []) if (!CRITERIA_MAP[c]) err(id, `unknown criterion ${c}`);
}

/**
 * Everything about Real Analyst content.
 * ctx: { content, err, warn, filesDir, availability }
 */
export function checkAnalyst({ content, err, warn, filesDir, availability }) {
  const ids = new Set();
  for (const t of content.analyst) {
    if (ids.has(t.id)) err(t.id, 'duplicate task id');
    ids.add(t.id);
    if (!['toolchoice', 'request', 'assessment'].includes(t.kind)) err(t.id, `unknown kind ${t.kind}`);
    if (![1, 2, 3].includes(t.level)) err(t.id, 'level must be 1, 2 or 3');
    if (!t.from?.name || !t.from?.role) err(t.id, 'a request needs someone it is from (name and role)');
    if (!t.message || t.message.length < 60) err(t.id, 'the request message is missing or too short');
    if (!t.debrief || t.debrief.length < 120) err(t.id, 'a debrief (what a strong answer found and did) is required');
    if (t.kind !== 'toolchoice') {
      if (t.level === 3 && t.objective) err(t.id, 'a Level 3 request must not state its objective: working it out is the task');
      if (t.level === 1 && !t.objective) err(t.id, 'a Level 1 request states its objective');
      if (!t.parts.some((p) => p.type === 'conclusion')) err(t.id, 'a request ends with a written conclusion');
      if (!t.parts.some((p) => p.type === 'tools')) err(t.id, 'a request asks for the approach (tools part)');
      if (!(t.routes || []).length) err(t.id, 'list at least one valid route (routes) for the debrief');
      // the request itself must not say how to do it
      const visible = [t.message, t.context, t.objective, ...(t.constraints || []),
        ...t.parts.filter((p) => p.type !== 'tools').flatMap((p) => [p.prompt, ...(p.options || []).map((o) => o.text), ...(p.questions || []).map((q) => q.label)])].filter(Boolean).join(' \n ');
      const m = METHOD_WORDS.exec(visible);
      if (m) err(t.id, `names a method ("${m[0]}"): Real Analyst work must not say which tool or technique to use`);
    }
    if (t.data?.db && !content.databaseMap[t.data.db]) err(t.id, `unknown database ${t.data.db}`);
    for (const d of t.data?.datasets || []) if (!content.datasetMap[d]) err(t.id, `unknown dataset ${d}`);
    for (const f of t.data?.files || []) if (!fs.existsSync(path.join(filesDir, f.path))) err(t.id, `missing file ${f.path}`);
    const partIds = new Set();
    for (const p of t.parts) {
      const pid = `${t.id}/${p.id}`;
      if (partIds.has(p.id)) err(pid, 'duplicate part id');
      partIds.add(p.id);
      if (!p.title || !p.prompt) err(pid, 'a part needs a title and a prompt');
      for (const topic of p.topics || []) if (!content.topicMap[topic]) err(pid, `unknown topic ${topic}`);
      if (!(p.topics || []).length) err(pid, 'a part needs a topic, so its evidence counts somewhere');
      if (p.concept && !CONCEPTS[p.concept]) err(pid, `unknown concept ${p.concept}`);
      for (const [tool, [topic, concept]] of Object.entries(p.byTool || {})) {
        if (!TOOL_IDS.includes(tool)) err(pid, `byTool: unknown tool ${tool}`);
        if (!content.topicMap[topic]) err(pid, `byTool ${tool}: unknown topic ${topic}`);
        else if (CONCEPT_SKILL[concept] && !['think', content.topicMap[topic].skill].includes(CONCEPT_SKILL[concept])) err(pid, `byTool ${tool}: concept ${concept} does not belong to ${topic}`);
        if (!CONCEPTS[concept]) err(pid, `byTool ${tool}: unknown concept ${concept}`);
      }
      checkCriteria(pid, p.criteria, err);
      if (p.type === 'tools') checkTools(pid, p, err);
      else if (p.type === 'select') checkSelect(pid, p, err);
      else if (p.type === 'scope') checkScope(pid, p, err);
      else if (p.type === 'numbers') checkNumbers(pid, p, err);
      else if (p.type === 'conclusion') {
        const figs = p.reasoning?.figures;
        if (!Array.isArray(figs) || !figs.length || figs.some((x) => typeof x !== 'number')) err(pid, 'a conclusion needs the key figures its reasoning should quote');
        if ((p.checklist || []).length < 3) err(pid, 'a conclusion needs at least 3 key points');
      } else err(pid, `unknown part type ${p.type}`);
    }
  }
  // every ability can reach Independent: something open (a challenge, project step or Real Analyst task) tests it
  for (const c of COMPETENCIES) {
    const a = availability.byComp[c.id];
    if (!a || !a.independence) err(c.id, `no challenge, project step or Real Analyst task tests "${c.name}", so it can never reach Independent`);
    else if (a.application < 2) warn(c.id, `only ${a.application} application item(s) for "${c.name}"`);
  }
}
