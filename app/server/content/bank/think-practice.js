// Extra practice for the original Analyst Thinking topics.
export const THINK_PRACTICE = [
  {
    id: 'think-causation-p2', topic: 'think-causation', type: 'numbers', title: 'Do discounts kill sales?', difficulty: 3, concept: 'causation',
    business: 'Restaurant', minutes: 25, db: 'restaurant', dataset: 'restaurant-db',
    skills_tested: ['causation', 'interpretation'],
    context: 'A consultant shows Olive & Ember a chart: "On the days with the heaviest discounting, gross sales are lowest. Stop discounting!" Before the owner acts, check what is behind the pattern.',
    prompt: 'For **2026** (all sites together), compare Mondays with Saturdays: average gross sales per day, and discounts as a percentage of gross sales.',
    questions: [
      { label: 'Average gross sales per Monday, 2026', unit: '$' },
      { label: 'Average gross sales per Saturday, 2026', unit: '$' },
      { label: 'Discounts as % of gross sales on Mondays', unit: '%', percent: true, tolerance: 0.05 },
      { label: 'Discounts as % of gross sales on Saturdays', unit: '%', percent: true, tolerance: 0.05 },
    ],
    answersKey: 'think-cause-discount',
    hints: ["strftime('%w', sale_date): 1 = Monday, 6 = Saturday.", 'Average per day = SUM(gross_sales) ÷ COUNT(DISTINCT sale_date).'],
    explain: 'Mondays are quiet and carry about twice the discounting of Saturdays. The discounts are given *because* the day is slow, not the other way round. That is reverse causation: stopping discounts would not make Mondays busier. A fair test compares Mondays with and without a promotion.',
  },
  {
    id: 'think-communication-p2', type: 'open', topic: 'think-communication', title: 'Rewrite the summary for the director', difficulty: 3, concept: 'communication',
    business: 'HR', minutes: 20,
    skills_tested: ['communication', 'interpretation'],
    context: 'A colleague wrote this summary for the operations director: "I ran a query joining employees, attendance and exit interviews with a LEFT JOIN and grouped by department. Transport had 3,412 absence days and 61 leavers, Operations 2,980 and 48, Customer Service 1,510 and 12. There may be issues with the data. See attached 40 tabs."',
    prompt: 'Rewrite it as a short message the director can act on (4 to 7 sentences). You may assume Transport has 140 staff, Operations 179 and Customer Service 90.',
    checklist: [
      { point: 'Starts with the answer, not the method', keywords: [['transport', 'highest', 'main', 'biggest'], ['absence', 'leav', 'turnover']] },
      { point: 'Uses rates per employee rather than raw totals', keywords: [['per employee', 'per person', 'per head', 'rate', '%', 'days each']] },
      { point: 'Names Transport as the outlier once size is taken into account', keywords: [['transport']] },
      { point: 'States any data caveat specifically, not "may be issues"', keywords: [['caveat', 'note', 'excludes', 'based on', 'only', 'check']] },
      { point: 'Ends with a recommendation or next step', keywords: [['recommend', 'suggest', 'next', 'propose', 'should']] },
    ],
    model: `**Transport has the biggest absence and turnover problem once department size is taken into account.**

- Transport: about 24 absence days per employee and 61 leavers from 140 staff (44%).
- Operations: about 17 days per employee and 48 leavers from 179 staff (27%).
- Customer Service: about 17 days per employee and 12 leavers from 90 staff (13%).

Operations looks similar to Transport on raw totals only because it is larger. The leaver figures compare leavers with current staff, which overstates rates slightly; I will switch to average headcount in the final version.

I suggest we look at Transport's exit-interview reasons and overtime levels next, and I can have that ready by Friday.`,
    hints: ['Divide each total by the department size before comparing.', 'What does the director need to know first?'],
    explain: 'Answer first, rates instead of totals, a specific caveat, and a next step. The method belongs in an appendix, not the message.',
  },
];
