// The shape of the question bank.
//
// Questions and tasks are written in several files, in a compact form. Once loaded, every one of
// them is described by the same metadata, so selection, reporting and validation never have to
// guess:
//
//   id, skill, level, topic, difficulty (1-5)
//   format          how it is answered: multiple-choice, true-false, formula-writing, sql-writing, ...
//   kind            what it tests: concept, debugging, scenario, interpretation, tool-selection, ...
//   question        the prompt
//   answer          the reference answer (never sent to the browser)
//   explanation     why the answer is right
//   tags            free labels, always including the concept
//   dataset, business_context, skills_tested   when the question uses them
//
// A new question only needs id, topic, type, prompt and its answer. Anything else it states
// (kind, tags, business_context, skills_tested, dataset) overrides what is worked out here.

/** How a question is answered, by its `type`. */
export const FORMAT = Object.freeze({
  mc: 'multiple-choice',
  multi: 'multiple-select',
  tf: 'true-false',
  fill: 'fill-in',
  number: 'number',
  order: 'ordering',
  formula: 'formula-writing',
  sql: 'sql-writing',
  numbers: 'hands-on',
  file: 'excel-file',
  open: 'written',
});

/** What a question tests. */
export const KINDS = Object.freeze([
  'concept',          // knows what something is or does
  'tool-selection',   // picks the right function, clause, tool or chart for a job
  'formula-writing',  // writes an Excel formula
  'sql-writing',      // writes a query
  'debugging',        // finds what is wrong with a formula, query or result
  'scenario',         // decides what to do in a business situation
  'interpretation',   // reads a result, chart or number correctly
  'calculation',      // works a number out
  'sequence',         // puts steps in order
  'analysis',         // hands-on work on a dataset
]);

export const LEVELS = Object.freeze(['Beginner', 'Intermediate', 'Advanced']);

const DEBUG = /\b(wrong|error|broke|broken|fails?|problem|bug|fix|#N\/A|#SPILL|#VALUE|#REF|#DIV|returns 0|returns nothing|suspicious|too (high|low)|missing|duplicat)/i;
const TOOL = /which (formula|query|function|condition|expression|join|clause|m expression|visual|chart|tool|step|transformation|measure)|which is (right|valid|correct)|how do you|which gives|which finds|which computes|which counts|which sorts|best (function|chart|visual|tool)/i;
const INTERPRET = /what does (this|the|it) .*(show|mean|tell|say)|\bmeans?\b.*\?|interpret|the (chart|result|number|output) (shows|says)|how should .* read|what can you conclude/i;
const SCENARIO = /should you|first step|first thing|most useful|best reason|recommend|when is|when should|what is the best|responsible|honest|manager|board|director|stakeholder|colleague|finance|campaign|client|boss/i;

// older generated questions name a style; these are the same idea
const LEGACY_STYLE = { practical: 'tool-selection', calculation: 'calculation', judgement: 'scenario', business: 'scenario', 'hands-on': 'analysis', sequence: 'sequence', debugging: 'debugging', concept: 'concept' };

/** What a question tests, worked out from its type and wording when it does not say. */
export function kindOf(item) {
  if (item.kind && KINDS.includes(item.kind)) return item.kind;
  if (item.style && LEGACY_STYLE[item.style]) return LEGACY_STYLE[item.style];
  const p = String(item.prompt || '');
  switch (item.type) {
    case 'formula': return DEBUG.test(p) ? 'debugging' : 'formula-writing';
    case 'sql': return DEBUG.test(p) ? 'debugging' : 'sql-writing';
    case 'order': return 'sequence';
    case 'number': return 'calculation';
    case 'numbers':
    case 'file': return 'analysis';
    case 'open': return 'scenario';
    default: break;
  }
  if (DEBUG.test(p)) return 'debugging';
  if (TOOL.test(p)) return 'tool-selection';
  if (INTERPRET.test(p)) return 'interpretation';
  if (SCENARIO.test(p)) return 'scenario';
  return 'concept';
}

function referenceAnswer(item) {
  if (item.answer !== undefined) return item.answer;
  if (item.expected !== undefined) return item.expected;
  if (item.checklist) return item.checklist.map((c) => c.point);
  return null;
}

/** The full description of one question or task. */
export function describe(item, topic = null) {
  const concept = item.concept || null;
  const kind = kindOf(item);
  const tags = [...new Set([...(item.tags || []), ...(concept ? [concept] : []), kind])];
  return {
    id: item.id,
    skill: item.skill || topic?.skill || item.area || null,
    level: topic?.level || item.tier || null,
    topic: item.topicId || topic?.id || null,
    difficulty: item.difficulty || 2,
    format: FORMAT[item.type] || item.type,
    kind,
    question: item.prompt,
    answer: referenceAnswer(item),
    explanation: item.explain || null,
    tags,
    dataset: item.dataset || item.db || null,
    business_context: item.business_context || item.business || null,
    skills_tested: item.skills_tested || (concept ? [concept] : []),
    source: item.source || null,
    generated: !!item.generated,
  };
}

const cache = new WeakMap();
/** The description of an item, worked out once. Works for generated questions too. */
export function metaOf(item, topic = null) {
  if (!item) return null;
  let m = cache.get(item);
  if (!m) { m = describe(item, topic); cache.set(item, m); }
  return m;
}

/**
 * Problems with a question's metadata. The answer itself is checked against the real engines by
 * tools/validate-content.js; this checks that the question is complete and consistently described.
 */
export function metaProblems(meta, { quiz = false } = {}) {
  const out = [];
  if (!meta.id || !/^[a-z0-9][a-z0-9:_.-]*$/i.test(meta.id)) out.push('id must be letters, digits, dash, dot, colon or underscore');
  if (!meta.question || String(meta.question).trim().length < 8) out.push('question text missing or too short');
  if (!meta.skill) out.push('no skill');
  if (meta.source !== 'placement' && !meta.topic) out.push('no topic');
  if (meta.level && !LEVELS.includes(meta.level)) out.push(`unknown level ${meta.level}`);
  if (!(Number.isInteger(meta.difficulty) && meta.difficulty >= 1 && meta.difficulty <= 5)) out.push(`difficulty must be 1-5 (got ${meta.difficulty})`);
  if (!Object.values(FORMAT).includes(meta.format)) out.push(`unknown format ${meta.format}`);
  if (!KINDS.includes(meta.kind)) out.push(`unknown kind ${meta.kind}`);
  if (meta.answer === null || meta.answer === undefined) out.push('no reference answer');
  if (quiz && !meta.explanation) out.push('no explanation');
  if (!Array.isArray(meta.tags) || meta.tags.some((t) => typeof t !== 'string' || !t)) out.push('tags must be non-empty strings');
  if (!Array.isArray(meta.skills_tested)) out.push('skills_tested must be a list');
  return out;
}
