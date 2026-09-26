// A learner state on which the old percent status and the Mastery stage disagree in words: the exact
// contradiction the architecture review found. One topic ends up under 50% covered (its old status
// word would be "Learning") while its evidence says Competent: the ideas and the hands-on skill are
// shown, business use is not yet.
//
// Used by tools/test-mastery.js (the two measures really do disagree on this state) and by
// tools/test-ui.js (the pages still show a single standing for it: Competent). Records through the
// engine, so it needs the store, content, engine and mastery modules already loaded on a temporary
// progress folder.

/** The first topic that opens without other topics and has enough of each kind of question. */
export function standingFixtureTopic({ content, mastery, kindOf, metaOf }) {
  const dim = (it, source) => mastery.dimensionOf(source, kindOf(it), !!metaOf(it)?.business_context);
  for (const t of content.topics) {
    if ((t.prereqs || []).length) continue;
    const items = Object.values(content.items).filter((it) => it.topicId === t.id && it.source !== 'placement');
    const know = items.filter((it) => it.source === 'quiz' && dim(it, 'quiz') === 'knowledge').slice(0, 3);
    const skill = items.filter((it) => it.source === 'practice' && dim(it, 'practice') === 'skill').slice(0, 2);
    const apply = items.filter((it) => it.source === 'quiz' && dim(it, 'quiz') === 'application');
    if (know.length === 3 && skill.length === 2 && apply.length) return { topic: t, know, skill, apply };
  }
  throw new Error('no topic has 3 knowledge questions, 2 hands-on tasks and a business question');
}

/**
 * Records the state. Returns what each measure says about the topic afterwards, so the caller can
 * check that the contradiction really is there before testing that the pages do not show it.
 */
export function recordLearningButCompetent(mods) {
  const { engine, mastery } = mods;
  const { topic, know, skill, apply } = standingFixtureTopic(mods);
  const rec = (it, source, rawScore) => engine.recordAttempt({ itemId: it.id, topicId: topic.id, skillId: topic.skill, source, rawScore, concept: it.concept || null, noMistake: rawScore >= 1 });
  for (const it of know) rec(it, 'quiz', 1);
  for (const it of skill) rec(it, 'practice', 1);
  // business questions answered wrongly until the topic's percent is under 50
  for (let i = 0; i < 40 && engine.topicStatus(topic).status !== 'learning'; i++) rec(apply[i % apply.length], 'quiz', 0);
  const status = engine.topicStatus(topic);
  return { topicId: topic.id, skill: topic.skill, percent: status.mastery, status: status.status, stage: mastery.topicView(topic.id).stage };
}
