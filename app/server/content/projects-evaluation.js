// Project evaluation: every project is judged on the ten criteria in content/criteria.js, not
// only on whether its numbers are right.
//
// Each project gains three short steps, written for its own data:
//   understand   before you start: which statements about this data are true? (data understanding, data quality)
//   approach     which tool(s) you would use, and why; more than one route can be right (tool choice)
//   check        which checks would really catch a mistake in these numbers? (validation)
// and every existing step is tagged with the criteria it gives evidence of. Numbers steps still
// check results, never the route taken, so any valid method gets full marks.
//
// Tool ratings: correctness, scalability, repeatability, clarity, data volume, business need;
// 0 weak, 1 fair, 2 strong (see grading/analyst.js).

const DB_TOOLS = {
  sql: { verdict: 'best', rate: '222222', why: 'Everything is in one database already: each question is a query, and the queries can be rerun when the data changes.' },
  excel: { verdict: 'good', rate: '211211', why: 'Workable on exports of the tables you need, but joining several large tables by hand is slow and easy to get wrong.' },
  pq: { verdict: 'good', rate: '221221', why: 'Can pull the tables from the database and merge them before loading, at the cost of more steps than a query.' },
  pbi: { verdict: 'good', rate: '222221', why: 'A model over the database answers the questions with measures, and is worth building if the numbers will be watched every month.' },
};

export const PROJECT_EVALUATION = {
  'cap-restaurant': {
    understand: [
      { text: 'Stock is only counted at month ends, so food cost can only be measured for whole months', right: true, why: 'inventory_counts has one count per month end; there is nothing in between.' },
      { text: 'The waste log records quantities, not money', right: true, why: 'Waste has to be valued with purchase prices before it can be compared with sales.' },
      { text: 'Purchases record the price actually paid on each delivery line', right: true, why: 'line_total and unit_cost are what was invoiced, so price changes show up there.' },
      { text: 'The daily sales table records the food cost of each dish', right: false, why: 'It records what was sold and for how much, not what the ingredients cost.' },
      { text: 'Menu prices changed in June 2026', right: false, why: 'The price history shows the last change on 1 October 2025.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'The group food cost % lies between the lowest and highest site\'s %', right: true, why: 'A group rate outside the range of its parts means something is double counted or missing.' },
      { text: 'Each period\'s opening stock is the previous period\'s closing stock', right: true, why: 'If the two differ, the wrong count date was used.' },
      { text: 'Work out one site and one month a second way, by hand, and compare', right: true, why: 'A second route that agrees is the strongest cheap check there is.' },
      { text: 'The percentage is below 100%, so it must be right', right: false, why: 'Almost any mistake still gives a number below 100%.' },
      { text: 'The query ran without an error', right: false, why: 'A wrong query usually runs perfectly.' },
    ],
  },
  'cap-retail': {
    understand: [
      { text: 'Online orders have no store, so their region has to come from the customer', right: true, why: 'store_id is empty on every online order; the company rule takes the customer\'s region instead.' },
      { text: 'In-store sales to walk-in customers have no customer ID', right: true, why: '464 in-store orders have no customer, which matters for any customer-level count.' },
      { text: 'Some customers have no region recorded', right: true, why: '75 customers have no region, so some online sales cannot be placed in a region.' },
      { text: 'Every order has at least one store', right: false, why: 'No online order has a store.' },
      { text: 'Order lines already include the discount in the unit price', right: false, why: 'The discount is a separate column and has to be applied.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'The regions add up to the company total for the same period', right: true, why: 'If they do not, some sales have no region or are counted twice.' },
      { text: 'Recalculate one store\'s quarter a second way and compare', right: true, why: 'Two routes that agree make the regional figures trustworthy.' },
      { text: 'Check that cancelled orders are excluded from every figure', right: true, why: 'Targets are for completed orders only.' },
      { text: 'West\'s figure looks low, which matches what the COO said', right: false, why: 'Agreeing with the expected answer is not a check.' },
      { text: 'The spreadsheet has no #N/A errors', right: false, why: 'A lookup that silently matches the wrong row shows no error at all.' },
    ],
  },
  'cap-hr': {
    understand: [
      { text: 'A current employee has no termination date', right: true, why: 'termination_date is empty for everyone still employed.' },
      { text: 'Not every leaver has an exit interview', right: true, why: '876 people have left and 482 exit interviews exist, so reasons cover only part of the leavers.' },
      { text: 'Attendance and overtime are only recorded from 2024', right: true, why: 'attendance_monthly starts in January 2024, so earlier years cannot be compared on overtime.' },
      { text: 'Every leaver left voluntarily', right: false, why: 'Termination type separates voluntary and involuntary leavers, and the turnover rate here is for voluntary ones.' },
      { text: 'Salary history has one row per employee', right: false, why: 'It has a row for every change, so an employee can have several.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'Headcount on 1 January plus hires minus leavers equals headcount on 31 December', right: true, why: 'If the flow does not balance, the date conditions are wrong somewhere.' },
      { text: 'Compare the rate for one department with a count done by hand', right: true, why: 'A small department is quick to check person by person.' },
      { text: 'Check that exit-interview reasons are reported as a share of interviews, not of leavers', right: true, why: 'Only 482 of 876 leavers were interviewed.' },
      { text: 'The turnover rate is between 0% and 100%', right: false, why: 'That rules out very little.' },
      { text: 'The HR director expected Transport to be worst, and it is', right: false, why: 'Matching expectations is not evidence of correctness.' },
    ],
  },
  'cap-waste': {
    understand: [
      { text: 'Waste has to be valued with purchase prices before sites can be compared in money', right: true, why: 'The log holds quantities only.' },
      { text: 'A busier site will waste more in total even if it is no less careful', right: true, why: 'Which is why waste has to be compared against something like purchases.' },
      { text: 'Each waste entry has a reason attached', right: true, why: 'The reason column lets you separate expiry, over-preparation and equipment failure.' },
      { text: 'The waste log already includes the cost of each item', right: false, why: 'There is no cost column in the waste log.' },
      { text: 'Waste is logged every day', right: false, why: 'It is logged weekly, so daily patterns cannot be seen in it.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'The three sites\' waste costs add up to the group total', right: true, why: 'A mismatch means rows were lost or doubled in the join to prices.' },
      { text: 'The number of waste rows is the same before and after joining prices', right: true, why: 'A join that multiplies rows inflates waste without any error.' },
      { text: 'Value one ingredient\'s waste at one site by hand', right: true, why: 'A second route that agrees confirms the valuation.' },
      { text: 'Waste is under 10% of purchases, which sounds normal', right: false, why: 'Sounding normal is not a check.' },
      { text: 'Every waste row found a price', right: false, why: 'Useful, but it does not show the prices are the right ones or that nothing was doubled.' },
    ],
  },
  'cap-retention': {
    understand: [
      { text: 'Customers who signed up recently have had less time to order again', right: true, why: 'The data ends on 31 August 2026, so a 2026 customer has had months, a 2023 customer years.' },
      { text: 'Some people appear on more than one customer record', right: true, why: 'Duplicate records split one person\'s orders across two customers.' },
      { text: 'Walk-in store orders have no customer, so they cannot count towards repeat purchase', right: true, why: 'They are invisible to any customer-level measure.' },
      { text: 'Every customer has placed at least one order', right: false, why: 'Some customers signed up and never ordered.' },
      { text: 'Cancelled orders count as purchases', right: false, why: 'Repeat purchase should count completed orders only.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'Measure every cohort over the same length of time after its first order', right: true, why: 'That is what makes cohorts comparable at all.' },
      { text: 'Reproduce the board\'s original figures first, then change one thing at a time', right: true, why: 'If you cannot reproduce the chart, you do not know what it measured.' },
      { text: 'Check how many customers each cohort holds', right: true, why: 'A rate on a tiny cohort is unreliable.' },
      { text: 'The newest cohort looks worst, as the board said', right: false, why: 'Agreeing with the claim is not checking it.' },
      { text: 'The query returns one row per year', right: false, why: 'The shape can be right and the numbers wrong.' },
    ],
  },
  'cap-returns': {
    understand: [
      { text: 'An order line can have more than one return record', right: true, why: '37 lines were returned in more than one go, so a join from lines to returns can count a line twice.' },
      { text: 'A return rate needs a denominator you can defend', right: true, why: 'Returned lines over lines sold, or refunds over revenue, answer different questions.' },
      { text: 'Every return has a reason', right: true, why: 'The reason column is filled for every return.' },
      { text: 'Returns are stored on the orders table', right: false, why: 'They are a separate table, linked through the order line.' },
      { text: 'Cancelled orders have returns', right: false, why: 'A return is for something that was delivered; cancelled orders should not be in the rate.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'Count returned lines with DISTINCT (or aggregate returns per line first) and compare with a plain count', right: true, why: 'If the two differ, the plain count is double counting lines with several returns.' },
      { text: 'The online and in-store rates, weighted by their lines, give the overall rate', right: true, why: 'A good consistency check on the denominators.' },
      { text: 'Check one product\'s rate by hand', right: true, why: 'A small, independent check of the whole chain.' },
      { text: 'The online rate is higher, as finance said', right: false, why: 'Agreement with expectations is not validation.' },
      { text: 'The result has no NULL values', right: false, why: 'Missing matches often show up as NULLs, but having none proves little.' },
    ],
  },
  'cap-supplier': {
    understand: [
      { text: 'Food prices move with the seasons, so a supplier should be compared with others in the same months', right: true, why: 'Summer tomatoes are cheaper than spring ones whoever sells them.' },
      { text: 'A price per unit has to be weighted by quantity, not averaged across invoice lines', right: true, why: 'A small delivery at a high price should not count as much as a large one.' },
      { text: 'Two suppliers deliver produce', right: true, why: 'GreenLeaf Farms and QuickVeg Wholesale, which is what makes a fair comparison possible.' },
      { text: 'Every supplier delivers to all three sites', right: false, why: 'Riverside switched produce supplier in June; supply is not identical across sites.' },
      { text: 'Invoice lines already show the price per kilo for every item', right: false, why: 'Some items are sold per litre or each; the unit matters.' },
    ],
    tools: DB_TOOLS,
    check: [
      { text: 'Supplier shares add up to 100% of spend', right: true, why: 'A simple check that nothing is missing or doubled.' },
      { text: 'Compare the same ingredients in the same months when comparing two suppliers', right: true, why: 'Otherwise the mix of items or the season explains the gap.' },
      { text: 'Recompute one ingredient\'s price change by hand', right: true, why: 'A second route that agrees confirms the method.' },
      { text: 'The biggest supplier by spend is the one the finance director expected', right: false, why: 'Expectation is not evidence.' },
      { text: 'All prices are positive', right: false, why: 'Rules out almost nothing.' },
    ],
  },
  'cap-ngo': {
    understand: [
      { text: 'Each row is one gift, and a donor can give several times', right: true, why: 'Donor totals need gifts added up per donor first.' },
      { text: 'Recurring gifts are marked on each row', right: true, why: 'Which is what lets you separate the dependable income.' },
      { text: 'The file covers one year only', right: true, why: 'Every gift is from 2025, so trends across years cannot be seen.' },
      { text: 'Each row is one donor', right: false, why: 'Rows are gifts; there are far more gifts than donors.' },
      { text: 'Amounts are in several currencies', right: false, why: 'Every amount is in pounds.' },
    ],
    tools: {
      excel: { verdict: 'best', rate: '212222', why: 'One workbook of gifts: PivotTables and a few formulas answer every question, where the trustees can see how.' },
      sql: { verdict: 'weak', rate: '211100', why: 'The data is a single workbook; loading it into a database adds work and nothing else.' },
      pq: { verdict: 'good', rate: '222121', why: 'Would group and shape the gifts cleanly, and suits next year\'s file too; more set-up than one year needs.' },
      pbi: { verdict: 'good', rate: '222121', why: 'A donor report would be useful if the trustees want to watch concentration over time; heavy for one analysis.' },
    },
    check: [
      { text: 'The donor totals add up to the total of all gifts', right: true, why: 'A mismatch means gifts were dropped or doubled when grouping by donor.' },
      { text: 'The count of distinct donors is below the number of gifts', right: true, why: 'If they are equal, the count is of gifts, not donors.' },
      { text: 'The quarters add up to the year', right: true, why: 'Checks the date grouping.' },
      { text: 'The top donor gave more than the average donor', right: false, why: 'Always true, so it checks nothing.' },
      { text: 'The PivotTable refreshed without an error', right: false, why: 'A refresh that works can still summarise the wrong field.' },
    ],
  },
  'cap-sales': {
    understand: [
      { text: 'Each sales row is one dish at one restaurant on one day', right: true, why: 'So totals need adding across dishes and days, and counts of rows are not counts of customers.' },
      { text: 'The data stops at the end of August 2026', right: true, why: 'Which is why comparisons with 2025 must use January to August in both years.' },
      { text: 'Menu prices changed once in the period, in October 2025', right: true, why: 'So 2026 months are priced higher than the 2025 months they are compared with.' },
      { text: 'The number of rows is the number of customers served', right: false, why: 'A row is a dish-day; guest counts are not in this data.' },
      { text: 'Net sales already include the discount', right: true, why: 'Net = gross − discount, so it is the number to use for revenue.' },
    ],
    tools: {
      sql: DB_TOOLS.sql, excel: DB_TOOLS.excel, pq: DB_TOOLS.pq,
      pbi: { verdict: 'best', rate: '222222', why: 'The owner asked for a page to look at every Monday: a Power BI model over the database answers the growth questions and becomes that page.' },
    },
    check: [
      { text: 'The three sites add up to the group total for each period', right: true, why: 'Catches rows dropped or doubled by a join.' },
      { text: 'Items × average price per item gives back net sales', right: true, why: 'Confirms the price and volume split is consistent.' },
      { text: 'The months of 2026 add up to the January–August total', right: true, why: 'Checks the date filter.' },
      { text: 'Growth is positive, as the owner said', right: false, why: 'Agreeing with the claim is not checking it.' },
      { text: 'Every dish appears in the result', right: false, why: 'Useful for completeness, but it does not show the totals are right.' },
    ],
  },
  'cap-profit': {
    understand: [
      { text: 'Running costs are stored by month as text such as "2026-03"', right: true, why: 'They have to be filtered by month text, not by date.' },
      { text: 'Labour is recorded daily, by role', right: true, why: 'Which is what makes the fixed and variable split possible.' },
      { text: 'Management labour costs the same at all three sites', right: true, why: 'A clue that it is a fixed cost.' },
      { text: 'Rent is recorded per day', right: false, why: 'Rent is a monthly running cost.' },
      { text: 'Food cost is the same as purchases', right: false, why: 'Food cost adjusts purchases for the change in stock between the two counts.' },
    ],
    tools: {
      sql: DB_TOOLS.sql, pq: DB_TOOLS.pq, pbi: DB_TOOLS.pbi,
      excel: { verdict: 'good', rate: '212222', why: 'The profit and loss itself is small once the totals are out of the database, and the what-if and break-even steps are natural in Excel.' },
    },
    check: [
      { text: 'The three sites\' profits add up to the group profit', right: true, why: 'Catches a cost counted twice or left out.' },
      { text: 'Sales minus every cost line gives the profit you reported', right: true, why: 'Re-adding the parts is a simple, strong check.' },
      { text: 'At the break-even sales level, profit works out to about zero', right: true, why: 'Plug the answer back in: if profit is not zero, the split or the formula is wrong.' },
      { text: 'The weakest site is the one the owner suspected', right: false, why: 'Expectation is not evidence.' },
      { text: 'Every margin is positive', right: false, why: 'A negative margin could be correct; this checks nothing.' },
    ],
  },
  'cap-swiftline': {
    understand: [
      { text: 'One depot measures distance in miles, the others in kilometres', right: true, why: 'Distances cannot be compared until they are converted.' },
      { text: 'One file ends with a totals line', right: true, why: 'If it stays in, it counts as a run and roughly doubles that depot.' },
      { text: 'The depot code is only in the file name', right: true, why: 'It has to be kept as a column while combining, or depots cannot be told apart.' },
      { text: 'Every depot exports its columns in the same order', right: false, why: 'The column order differs; combine by name, not by position.' },
      { text: 'Every run has a fuel reading', right: false, why: 'Some runs have none, and one depot writes "n/a" instead of leaving it blank.' },
    ],
    tools: {
      pq: { verdict: 'best', rate: '222222', why: 'Four differently shaped files in one folder, refreshed every quarter: exactly what a folder query with a few fix-up steps is for.' },
      pbi: { verdict: 'best', rate: '222222', why: 'The same Power Query steps inside Power BI, plus the depot dashboard the director wants to refresh each quarter.' },
      excel: { verdict: 'weak', rate: '100120', why: 'Pasting four exports together by hand every quarter is the problem the director is describing.' },
      sql: { verdict: 'good', rate: '221111', why: 'Loading the files into tables and combining them in SQL works, but needs a database and someone to load each quarter.' },
    },
    check: [
      { text: 'The number of runs after combining equals the sum of the real rows in each file', right: true, why: 'Catches the totals line and any file dropped from the combine.' },
      { text: 'Delivered + failed equals parcels loaded on every run', right: true, why: 'A row-level check that the columns were matched correctly.' },
      { text: 'Distances per run look similar across depots once converted', right: true, why: 'A depot that is off by a factor of 1.6 has not been converted.' },
      { text: 'Easton is worst, which is what everyone expected', right: false, why: 'Expectation is not evidence.' },
      { text: 'The query refreshed without an error', right: false, why: 'A combine can refresh perfectly and still include the totals line.' },
    ],
  },
  'cap-marketing': {
    understand: [
      { text: 'The campaign code is at the front of the campaign name in both exports', right: true, why: 'It has to be extracted before the exports can be joined to the register.' },
      { text: 'One export writes money with a currency sign', right: true, why: 'That column arrives as text and must be converted before it can be added up.' },
      { text: 'The register is the only place a campaign\'s objective is recorded', right: true, why: 'Without joining it, awareness and sales campaigns cannot be told apart.' },
      { text: 'Both exports use the same column names', right: false, why: 'They describe the same things with different names.' },
      { text: 'Every campaign that ran is in the register', right: false, why: 'At least one campaign that spent money is missing from it.' },
    ],
    tools: {
      pq: { verdict: 'best', rate: '222222', why: 'Rename, convert, stack the two exports and merge the register, then refresh next quarter with the new files.' },
      excel: { verdict: 'good', rate: '211221', why: 'Small enough to do by hand in Excel, with a lookup to the register; every step has to be repeated next quarter.' },
      pbi: { verdict: 'good', rate: '222221', why: 'The same preparation inside Power BI and a campaign report on top; worth it if the budget reviews continue.' },
      sql: { verdict: 'weak', rate: '211100', why: 'Three small files, no database: loading them first costs more than it saves.' },
    },
    check: [
      { text: 'Total spend after stacking equals the two exports\' totals added together', right: true, why: 'Catches rows lost, doubled, or skipped because a number was text.' },
      { text: 'Look at the rows that did not match the register, in both directions', right: true, why: 'An ordinary join hides them.' },
      { text: 'Each channel\'s ROAS is built from its totals, not averaged from campaigns', right: true, why: 'An average of ratios gives small campaigns too much weight.' },
      { text: 'Search has the higher ROAS, as the marketing lead thought', right: false, why: 'Expectation is not evidence.' },
      { text: 'No cell in the result is empty', right: false, why: 'Completeness of the output says nothing about its correctness.' },
    ],
  },
};

/** The criteria an original project step gives evidence of, from its type, topics and concept. */
export function criteriaForStep(step) {
  if (step.criteria) return step.criteria;
  if (step.type === 'report') return ['insight', 'communication', 'business'];
  if (step.type === 'choice') return ['business', 'insight'];
  const out = ['analysis'];
  const topics = step.topics || [];
  if (topics.some((t) => /joins|multijoins|cte|subqueries|union|pq-merge|pq-append|pq-reshape|xlookup|indexmatch|pbi-model|pbi-star/.test(t))) out.push('transformation');
  if (topics.some((t) => /clean|strings|textdates|pq-types|pq-split|think-quality/.test(t)) || ['duplicates', 'dedup', 'data-quality', 'missing-data'].includes(step.concept)) out.push('cleaning');
  if (['reconciliation', 'validation', 'data-trust', 'anomaly'].includes(step.concept) || topics.includes('think-trust') || topics.includes('think-validation')) out.push('validation');
  return out;
}

/** The three added steps for a project, in the shape the project page and grader expect. */
export function evaluationSteps(project) {
  const e = PROJECT_EVALUATION[project.id];
  if (!e) return { before: [], beforeFinal: [] };
  return {
    before: [
      { id: 'understand', title: 'Before you start: the data', type: 'select', criteria: ['understanding', 'quality'],
        topics: ['think-trust'], concept: 'data-trust',
        prompt: 'Look at the data before you calculate anything. Which of these statements about it are true? Pick every one that is.',
        options: e.understand },
      { id: 'approach', title: 'Your approach', type: 'tools', criteria: ['tools'], topics: ['think-tools'], concept: 'tool-choice',
        prompt: 'Which tool, or tools, would you use for this project, and why? More than one answer can be right, and the steps below accept any method that gets the right numbers.',
        tools: e.tools },
    ],
    beforeFinal: [
      { id: 'check', title: 'Check your numbers', type: 'select', criteria: ['validation'], topics: ['think-validation'], concept: 'validation',
        prompt: 'Before you write it up: which of these would really catch a mistake in your numbers? Pick every one that would.',
        options: e.check },
    ],
  };
}
