// The abilities a data analyst needs, in plain language. Each one groups the concepts the
// questions are tagged with, so every answer counts towards exactly one ability. The Mastery
// Layer (server/mastery.js) judges each ability on four kinds of evidence: understanding it,
// doing it, using it on a real problem, and doing that without help.
//
// `core: true` marks the abilities a milestone insists on.

export const COMPETENCIES = [
  // ---------------------------------------------------------------- Excel
  { id: 'c-xl-formulas', skill: 'excel', name: 'Formulas that copy correctly', can: 'Write formulas with the right references, logic and error handling.', core: true,
    concepts: ['cell-refs', 'basic-agg', 'count-types', 'if-logic', 'iferror'] },
  { id: 'c-xl-conditions', skill: 'excel', name: 'Counting and summing with conditions', can: 'Answer "how many / how much where…" questions with COUNTIFS and SUMIFS.', core: true,
    concepts: ['countif-sumif', 'sumifs', 'date-criteria'] },
  { id: 'c-xl-lookup', skill: 'excel', name: 'Looking things up', can: 'Bring data together from two tables and handle what does not match.', core: true,
    concepts: ['xlookup', 'exact-match', 'index-match', 'lookup-strategy'] },
  { id: 'c-xl-clean', skill: 'excel', name: 'Cleaning messy spreadsheets', can: 'Fix text, dates and numbers stored the wrong way before trusting a total.',
    concepts: ['text-funcs', 'dates', 'text-numbers', 'cleaning', 'data-validation'] },
  { id: 'c-xl-summarise', skill: 'excel', name: 'Summarising with PivotTables and Tables', can: 'Turn thousands of rows into a summary that answers the question.', core: true,
    concepts: ['pivot', 'pivot-charts', 'tables', 'structured-refs', 'sort-filter', 'dynamic-arrays'] },
  { id: 'c-xl-model', skill: 'excel', name: 'What-if and weighted numbers', can: 'Model scenarios and average things correctly when they are different sizes.',
    concepts: ['weighted-avg', 'scenario', 'what-if'] },
  { id: 'c-xl-present', skill: 'excel', name: 'Dashboards in Excel', can: 'Build a one-page view that a manager can read in a minute.',
    concepts: ['dashboard', 'conditional-format'] },

  // ---------------------------------------------------------------- SQL
  { id: 'c-sql-query', skill: 'sql', name: 'Selecting and filtering rows', can: 'Get exactly the rows a question needs, including the awkward NULL ones.', core: true,
    concepts: ['select-basics', 'where-logic', 'null', 'like-in-between'] },
  { id: 'c-sql-summarise', skill: 'sql', name: 'Summarising data', can: 'Group, count and total correctly, and filter the groups.', core: true,
    concepts: ['aggregates', 'count-distinct', 'group-by', 'having', 'case', 'conditional-agg', 'integer-division'] },
  { id: 'c-sql-join', skill: 'sql', name: 'Combining tables', can: 'Choose the right join for the question and notice when a join multiplies rows.', core: true,
    concepts: ['inner-join', 'left-join', 'join-filter', 'fan-out', 'anti-join'] },
  { id: 'c-sql-steps', skill: 'sql', name: 'Building a query in steps', can: 'Break a hard question into readable steps with subqueries and CTEs.',
    concepts: ['subquery', 'cte', 'not-in-null', 'union', 'optimization'] },
  { id: 'c-sql-clean', skill: 'sql', name: 'Cleaning data in SQL', can: 'Tidy text and remove duplicates before counting anything.',
    concepts: ['string-funcs', 'dedup'] },
  { id: 'c-sql-time', skill: 'sql', name: 'Dates and change over time', can: 'Compare periods, running totals and month-on-month change.',
    concepts: ['sql-dates', 'lag-lead', 'running-total', 'window-frame'] },
  { id: 'c-sql-rank', skill: 'sql', name: 'Ranking within groups', can: 'Find the top items per group without losing ties or rows.',
    concepts: ['window-rank', 'top-n-group', 'window-filter'] },
  { id: 'c-sql-segment', skill: 'sql', name: 'Cohorts and segments', can: 'Split customers into fair groups and follow them over time.',
    concepts: ['cohort', 'segmentation', 'funnel'] },

  // ---------------------------------------------------------------- Power Query
  { id: 'c-pq-import', skill: 'pq', name: 'Importing with the right types', can: 'Bring files in with dates, numbers and locales read correctly.', core: true,
    concepts: ['pq-basics', 'pq-types', 'locale'] },
  { id: 'c-pq-clean', skill: 'pq', name: 'Cleaning columns', can: 'Trim, split, replace and fill so every row is usable.', core: true,
    concepts: ['pq-clean', 'pq-split'] },
  { id: 'c-pq-combine', skill: 'pq', name: 'Combining sources', can: 'Append files and merge tables, and check what did not match.', core: true,
    concepts: ['pq-append', 'pq-merge', 'pq-folder'] },
  { id: 'c-pq-reshape', skill: 'pq', name: 'Reshaping tables', can: 'Unpivot wide reports and group long ones into the shape the analysis needs.',
    concepts: ['pq-unpivot', 'pq-group'] },
  { id: 'c-pq-custom', skill: 'pq', name: 'Custom columns and M', can: 'Write the logic the buttons cannot do.',
    concepts: ['pq-custom', 'm-code', 'pq-functions'] },
  { id: 'c-pq-robust', skill: 'pq', name: 'Queries that survive next month', can: 'Build a refresh that still works when the files change.',
    concepts: ['pq-robust', 'pq-params', 'pq-dynamic'] },

  // ---------------------------------------------------------------- Power BI
  { id: 'c-pbi-model', skill: 'pbi', name: 'Modelling data', can: 'Build a star schema with a date table and relationships that filter the right way.', core: true,
    concepts: ['pbi-model', 'star-schema', 'date-table', 'pbi-query'] },
  { id: 'c-pbi-measures', skill: 'pbi', name: 'Writing measures', can: 'Write DAX that stays right under any filter.', core: true,
    concepts: ['measure-vs-column', 'dax-basics', 'calculate', 'filter-context', 'row-context'] },
  { id: 'c-pbi-time', skill: 'pbi', name: 'Time and ranking in DAX', can: 'Compare with last year and rank without breaking totals.',
    concepts: ['time-intel', 'dax-ranking'] },
  { id: 'c-pbi-report', skill: 'pbi', name: 'Report pages people can use', can: 'Choose visuals and layout that answer the reader\'s question.', core: true,
    concepts: ['pbi-basics', 'pbi-visuals', 'report-design', 'pbi-sharing'] },
  { id: 'c-pbi-analysis', skill: 'pbi', name: 'Analysing in Power BI', can: 'Use the model to find and explain what changed.',
    concepts: ['pbi-analysis'] },

  // ---------------------------------------------------------------- Analyst thinking
  { id: 'c-th-trust', skill: 'think', name: 'Checking whether a number can be trusted', can: 'Find duplicates, gaps and mismatches before anyone relies on a figure.', core: true,
    concepts: ['data-trust', 'data-quality', 'missing-data', 'duplicates', 'validation', 'reconciliation'] },
  { id: 'c-th-measure', skill: 'think', name: 'Choosing and defining the measure', can: 'Pick a KPI that answers the question, with the right denominator.', core: true,
    concepts: ['denominator', 'kpi', 'definitions', 'metric-choice', 'pct-points', 'mean-median'] },
  { id: 'c-th-cause', skill: 'think', name: 'Separating cause from coincidence', can: 'Say what the data supports, and no more.', core: true,
    concepts: ['causation', 'simpson', 'survivorship', 'sample-size'] },
  { id: 'c-th-patterns', skill: 'think', name: 'Reading trends and anomalies', can: 'Tell a real change from season, noise or a data problem.',
    concepts: ['anomaly', 'outliers', 'seasonality', 'interpretation'] },
  { id: 'c-th-questions', skill: 'think', name: 'Turning a request into a question', can: 'Work out what the person actually needs to decide.',
    concepts: ['business-questions', 'scoping'] },
  { id: 'c-th-tools', skill: 'think', name: 'Choosing the right tool', can: 'Pick Excel, SQL, Power Query or Power BI for good reasons.', core: true,
    concepts: ['tool-choice'] },
  { id: 'c-th-communicate', skill: 'think', name: 'Communicating findings', can: 'Write a conclusion a manager can act on, with the evidence and its limits.', core: true,
    concepts: ['communication', 'chart-choice', 'chart-honesty'] },
];

export const COMPETENCY_MAP = Object.fromEntries(COMPETENCIES.map((c) => [c.id, c]));

/** concept → competency id */
export const CONCEPT_COMPETENCY = Object.fromEntries(COMPETENCIES.flatMap((c) => c.concepts.map((k) => [k, c.id])));
