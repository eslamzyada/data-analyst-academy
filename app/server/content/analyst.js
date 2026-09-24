// Real Analyst mode: work as it arrives, not as a textbook exercise.
//
// Three kinds of work, all without a method, a formula, a technique or a chart named:
//   toolchoice   a short situation: which tool (or tools) would you use, and why? More than one
//                answer can be right; each tool is rated on correctness, scalability,
//                repeatability, clarity, data volume and business need.
//   request      a work request from someone in the business. Level 1 states the objective,
//                Level 2 needs it sharpened first, Level 3 is a vague ask where deciding what to
//                answer, and what data is needed, is part of the work.
//   assessment   a mixed-skill problem on data the learner has not seen: a messy export arrives,
//                and working out what is wrong, how to clean it, which tool, which measures and
//                what it means is the whole job.
//
// Parts are shown one at a time, so the plan comes before the specific questions. Findings are
// checked against answers.json (tools/data/answers-analyst.js computes them from the data).
//
// Tool ratings: six digits for correctness, scalability, repeatability, clarity, data volume and
// business need, each 0 (weak), 1 (fair) or 2 (strong). grading/analyst.js explains them.

// ---------------------------------------------------------------- shared part builders
const tools = (spec, prompt = 'Which tool, or tools, would you use for this, and why? More than one answer can be right.') => ({
  id: 'tools', type: 'tools', title: 'Your approach', prompt, tools: spec,
  topics: ['think-tools'], concept: 'tool-choice', criteria: ['tools'],
});
const conclusion = (prompt, extra) => ({
  id: 'conclude', type: 'conclusion', title: 'Your answer', prompt, topics: ['think-communication'], concept: 'communication',
  criteria: ['insight', 'communication', 'business'], ...extra,
});

export const ANALYST = [
  // ================================================================= CROSS-TOOL CHALLENGES
  {
    id: 'tc-monthly-folder', kind: 'toolchoice', title: 'The same clean-up every month', level: 1, difficulty: 2, minutes: 8, business: 'Retail',
    from: { name: 'Marta Silva', role: 'Finance Business Partner' },
    message: `Every month the three stores each drop a CSV export into the shared finance folder: about 5,000 rows in total. I copy them into one sheet, delete the title lines, fix the dates and rename two columns that one store's till spells differently. It takes me the best part of two days and I still find mistakes afterwards. The combined table feeds the board pack, which is an Excel workbook. Can we stop doing this by hand?`,
    constraints: ['The board pack stays in Excel.', 'The stores cannot change their till exports.', 'Marta is comfortable in Excel but has never written code.'],
    parts: [
      tools({
        excel: { verdict: 'weak', rate: '100120', why: 'Copying and pasting is how it is done now. 5,000 rows is nothing for Excel, but every month repeats the same two days of manual work and the same risk of a missed step.' },
        sql: { verdict: 'good', rate: '221121', why: 'Loading the files into a database and cleaning them with a query would repeat reliably, but there is no database here and Marta would depend on someone else to run it.' },
        pq: { verdict: 'best', rate: '222222', why: 'Point a query at the folder, clean one file, and the same steps run on every file on refresh. The result loads straight into the Excel board pack, and next month is one click.' },
        pbi: { verdict: 'good', rate: '222121', why: 'Power BI has the same Power Query inside it and would work, but the board pack is an Excel workbook, so building it there adds a second tool for no gain.' },
      }),
      { id: 'decide', type: 'scope', title: 'Making it last', prompt: 'Whatever you build, next month one store adds a new column to its export. Which set-up is most likely to survive that without anyone noticing a problem?',
        topics: ['pq-dynamic'], concept: 'pq-robust', criteria: ['validation'],
        options: [
          { text: 'Steps that refer to columns by name, keep only the columns the report needs, and flag any file with missing columns', score: 1, why: 'A new column is simply ignored, and a missing one is caught instead of silently producing blanks.' },
          { text: 'Steps that remove columns by their position, so the layout is fixed', score: 0.2, why: 'A new column shifts every position, so the wrong column gets deleted without any error.' },
          { text: 'A recorded macro that repeats last month\'s clicks', score: 0.3, why: 'A macro replays clicks on fixed cells and ranges: it breaks, or worse, runs quietly on the wrong columns.' },
          { text: 'Ask the stores to stop changing their exports', score: 0.5, why: 'Worth asking, but it is outside your control, so the process still has to cope when it happens.' },
        ] },
    ],
    debrief: `**Power Query** is the natural fit: a folder query cleans every file the same way, refreshes in seconds, and feeds the Excel workbook the board already uses. Power BI would do the same job if the board pack were a Power BI report. A database and SQL would also work, but only with a database and someone to run it. The part most people forget is the second question: a refresh that silently drops a column is worse than a manual process, so build steps by column name and check what arrives.`,
  },
  {
    id: 'tc-quick-question', kind: 'toolchoice', title: 'A question before a meeting', level: 1, difficulty: 1, minutes: 5, business: 'Sales',
    from: { name: 'Owen Price', role: 'Head of Sales' },
    message: `Quick one: I'm in with the MD at half four. Which was our best month this year? It's all in the sales spreadsheet I sent you this morning, about 2,000 rows.`,
    constraints: ['Thirty minutes until the meeting.', 'The data is already open in Excel.', 'Nobody will ask for this again.'],
    parts: [
      tools({
        excel: { verdict: 'best', rate: '211222', why: 'A PivotTable by month answers it in two minutes, on data that is already open. Nothing about this needs to repeat.' },
        sql: { verdict: 'weak', rate: '211100', why: 'The data is not in a database. Loading it first would take longer than the answer is worth.' },
        pq: { verdict: 'weak', rate: '222120', why: 'Power Query is for preparing data you will refresh. For a one-off question on clean data it is extra steps for nothing.' },
        pbi: { verdict: 'weak', rate: '222200', why: 'A report built for one question that will never be asked again, delivered after the meeting.' },
      }),
      { id: 'decide', type: 'scope', title: 'Before you answer', prompt: 'You have five minutes left over. Which check is worth making before you send "best month" to Owen?',
        topics: ['think-definitions'], concept: 'definitions', criteria: ['validation', 'business'],
        options: [
          { text: 'Whether "best" means revenue, orders or profit, and whether the latest month is complete', score: 1, why: 'A different measure can change the answer, and a half-finished month always looks weak.' },
          { text: 'Whether the chart looks professional enough for the MD', score: 0.1, why: 'Owen asked a question, not for a chart. The answer matters more than its formatting.' },
          { text: 'Whether the spreadsheet has any formulas in it', score: 0.2, why: 'That does not change which month was best.' },
          { text: 'Nothing: the biggest total is the best month', score: 0.4, why: 'Usually right, but "best" is ambiguous and the current month is only part-way through.' },
        ] },
    ],
    debrief: `This is an **Excel** job, and a quick one: a PivotTable by month. The skill being tested is not picking the most powerful tool, it is picking the one that fits the time and the need. The one thing worth the spare five minutes is the definition: "best" by revenue and "best" by orders are often different months, and the current month is never finished.`,
  },
  {
    id: 'tc-big-join', kind: 'toolchoice', title: 'Returns by category, every quarter', level: 2, difficulty: 3, minutes: 8, business: 'E-commerce',
    from: { name: 'Hana Sato', role: 'Head of E-commerce' },
    message: `I need the return rate by product category, by month, for the last three years. The order system has about 4 million order lines and 300,000 returns, in separate tables. I'll want it refreshed every quarter.`,
    constraints: ['The data lives in the company\'s SQL database.', 'About 4 million order lines.', 'Refreshed every quarter.'],
    parts: [
      tools({
        excel: { verdict: 'weak', rate: '100100', why: 'A worksheet holds about 1 million rows, so 4 million order lines do not fit. Lookups between two tables that size would be slow and fragile even if they did.' },
        sql: { verdict: 'best', rate: '222222', why: 'The data is already in the database: one query joins lines to returns, groups by category and month, and runs again next quarter unchanged.' },
        pq: { verdict: 'good', rate: '211211', why: 'Power Query can pull from the database and merge the tables, but on 4 million rows it is slower, and the work is better pushed down to the database.' },
        pbi: { verdict: 'good', rate: '222221', why: 'A Power BI model with the two tables and a return-rate measure would refresh each quarter and let Hana slice by category herself. Heavier to set up than one query.' },
      }),
      { id: 'decide', type: 'scope', title: 'The trap', prompt: 'You join order lines to returns and count returned lines. What is the most likely way the return rate comes out wrong?',
        topics: ['sql-multijoins'], concept: 'fan-out', criteria: ['transformation', 'validation'],
        options: [
          { text: 'A line returned in two parts appears twice after the join, so it is counted twice', score: 1, why: 'One order line can have several return records. Count distinct returned lines, or aggregate returns per line first.' },
          { text: 'SQL cannot divide one count by another', score: 0, why: 'It can; watch integer division, but that is not the main risk here.' },
          { text: 'An inner join keeps only lines that were returned, so the rate is 100%', score: 0.5, why: 'True if you use the wrong join, and worth checking, but a left join avoids it. The subtler problem is lines counted twice.' },
          { text: 'Category names might be in lower case', score: 0.1, why: 'Cosmetic. It does not change the rate.' },
        ] },
    ],
    debrief: `**SQL** is the strongest choice because the data is already in a database and is far too big for a worksheet. **Power BI** is a good answer too if Hana wants to explore it herself. Both depend on the same thing: joining lines to returns without counting a line twice when it has more than one return record.`,
  },
  {
    id: 'tc-self-serve', kind: 'toolchoice', title: 'Twelve managers, their own numbers', level: 2, difficulty: 3, minutes: 7, business: 'Retail',
    from: { name: 'Priya Nair', role: 'Operations Director' },
    message: `Each of my twelve regional managers wants to see their own weekly numbers (sales, returns, staffing) and filter by store. Right now someone emails twelve spreadsheets every Monday and they're out of date by Wednesday. The data comes from the sales database and the rota system.`,
    constraints: ['Twelve people, each should see only their own region.', 'Refreshed at least weekly, without anyone emailing files.', 'The managers will not write queries.'],
    parts: [
      tools({
        excel: { verdict: 'weak', rate: '101210', why: 'Twelve emailed workbooks is the problem being solved: they go stale, and nothing stops someone opening another region\'s file.' },
        sql: { verdict: 'weak', rate: '222000', why: 'SQL can produce the numbers, but managers will not write queries, and a query is not something you hand to twelve people.' },
        pq: { verdict: 'good', rate: '222111', why: 'Power Query can combine the two sources and refresh, but on its own it prepares data; it does not give managers filters or control who sees what.' },
        pbi: { verdict: 'best', rate: '222222', why: 'One published report, refreshed on a schedule, with slicers for store and row-level security so each manager sees only their region.' },
      }),
      { id: 'decide', type: 'scope', title: 'Who sees what', prompt: 'How should each manager end up seeing only their own region?',
        topics: ['pbi-reports'], concept: 'pbi-sharing', criteria: ['business'],
        options: [
          { text: 'One report with security rules on the region, so each manager\'s login only returns their rows', score: 1, why: 'One report to maintain, and the restriction is enforced by the data, not by trusting people to pick the right filter.' },
          { text: 'Twelve copies of the report, one per region', score: 0.3, why: 'It works on day one, then twelve reports have to be changed every time anything changes.' },
          { text: 'A region slicer, and trust managers to choose their own', score: 0.2, why: 'Anyone can pick any region, so it does not restrict anything.' },
          { text: 'A page per region in one report', score: 0.3, why: 'Everyone can still open every page.' },
        ] },
    ],
    debrief: `This is **Power BI**'s job: a published report, refreshed on a schedule, with row-level security. Power Query sits inside it to combine the sales and rota data. Spreadsheets and SQL each solve part of the problem, but not the part Priya actually has: stale files, and people seeing what they should not.`,
  },
  {
    id: 'tc-budget-whatif', kind: 'toolchoice', title: 'What if prices go up and volume goes down?', level: 1, difficulty: 2, minutes: 6, business: 'Finance',
    from: { name: 'Grace Hughes', role: 'Chief Financial Officer' },
    message: `For tomorrow's budget meeting I want to be able to say: if we put prices up 3% and lose 5% of volume, what happens to profit? And at what price increase do we break even on that volume loss? I'd like to change the numbers live in the meeting.`,
    constraints: ['A handful of inputs: price, volume, unit cost, fixed costs.', 'Changed live, in a meeting.', 'One meeting, possibly revisited next year.'],
    parts: [
      tools({
        excel: { verdict: 'best', rate: '212222', why: 'A small model with input cells, a data table for several scenarios and Goal Seek for the break-even price. Anyone in the meeting can see how it works.' },
        sql: { verdict: 'weak', rate: '201100', why: 'SQL answers questions about stored data. A what-if on five inputs is not a query.' },
        pq: { verdict: 'weak', rate: '111000', why: 'Power Query prepares data; it does not model scenarios.' },
        pbi: { verdict: 'good', rate: '211111', why: 'Power BI has what-if parameters and could do it, but it is far more set-up for a five-input model, and harder to change on the spot.' },
      }),
      { id: 'decide', type: 'scope', title: 'The break-even price', prompt: 'Which feature finds the price increase at which profit is back where it started?',
        topics: ['xl-scenario'], concept: 'what-if', criteria: ['analysis'],
        options: [
          { text: 'Goal Seek: set the profit change to zero by changing the price increase', score: 1, why: 'Exactly what Goal Seek is for: work backwards from the result you want to the input that produces it.' },
          { text: 'A PivotTable of prices', score: 0, why: 'A PivotTable summarises data; it does not solve for an input.' },
          { text: 'Try prices by hand until profit is roughly unchanged', score: 0.4, why: 'It gets there eventually, but Goal Seek gives the exact figure in one step.' },
          { text: 'A chart of profit against price', score: 0.5, why: 'Helpful to show the trade-off, and you can read the crossing point off it, but not precisely.' },
        ] },
    ],
    debrief: `**Excel** is built for this: input cells, a scenario table and Goal Seek, all visible to everyone in the room. Power BI's what-if parameters can do it too, which is why it counts as a reasonable answer, but it is a lot of machinery for five numbers that someone wants to change live.`,
  },
  {
    id: 'tc-one-off-roster', kind: 'toolchoice', title: 'A one-off messy roster', level: 1, difficulty: 2, minutes: 6, business: 'HR',
    from: { name: 'Rania Haddad', role: 'HR Director' },
    message: `I've been sent the staff roster from the company we're acquiring. About 900 rows, title lines at the top, some merged cells, and dates in two formats. I just need headcount by department for a meeting this afternoon. We won't get this file again: they'll be on our system by next month.`,
    constraints: ['One file, never repeated.', 'About 900 rows.', 'Needed this afternoon.'],
    parts: [
      tools({
        excel: { verdict: 'best', rate: '211222', why: 'Delete the title lines, unmerge, fix the dates, remove duplicates and run a PivotTable. For 900 rows that will never come back, this is the fastest honest route.' },
        sql: { verdict: 'weak', rate: '211100', why: 'The file would have to be loaded into a database first, and cleaning merged cells and mixed dates in SQL is awkward for a one-off.' },
        pq: { verdict: 'best', rate: '222221', why: 'Promote the right row to headers, set the date type with the right locale, remove duplicates, group by department. Also quick, and every step is recorded if the question comes back.' },
        pbi: { verdict: 'weak', rate: '222110', why: 'A report for a single headcount number that will not be needed again.' },
      }),
      { id: 'decide', type: 'scope', title: 'What counts as a person', prompt: 'The roster has 900 rows. Which check matters most before you count heads?',
        topics: ['think-quality'], concept: 'duplicates', criteria: ['quality'],
        options: [
          { text: 'Whether anyone appears twice, and whether leavers are still listed', score: 1, why: 'Headcount is people who work there now. Duplicates and leavers both inflate it.' },
          { text: 'Whether the columns are in alphabetical order', score: 0, why: 'Column order has no effect on the count.' },
          { text: 'Whether the file is in .xlsx or .csv format', score: 0.1, why: 'Either opens; it does not change who is counted.' },
          { text: 'Whether salaries are filled in for everyone', score: 0.3, why: 'Worth knowing for other questions, but a missing salary does not change the headcount.' },
        ] },
    ],
    debrief: `Both **Excel** and **Power Query** are good answers here, which is the point of this one. Excel is quickest for a file that will never come back; Power Query costs a few more minutes and leaves every step recorded. What matters more than the tool is the definition of a head: current staff, each counted once.`,
  },
  {
    id: 'tc-reconcile-large', kind: 'toolchoice', title: '200,000 payments to match', level: 2, difficulty: 3, minutes: 8, business: 'Finance',
    from: { name: 'Karim Mensah', role: 'Finance Controller' },
    message: `Every month the payment provider sends a CSV of about 200,000 card payments. We need to find the ones that don't match an order in our system, and the orders that were never paid. Right now it's done with VLOOKUPs in a very slow workbook that crashes about once a month.`,
    constraints: ['About 200,000 rows a month.', 'Our orders are in the company database.', 'Run every month by the finance team.'],
    parts: [
      tools({
        excel: { verdict: 'weak', rate: '100101', why: 'It fits on a sheet, but lookups on 200,000 rows each way are slow, crash-prone and have to be rebuilt every month, which is exactly the problem.' },
        sql: { verdict: 'best', rate: '222212', why: 'Load the file into a table and run two anti-joins: payments with no order, orders with no payment. Fast on this volume and repeatable.' },
        pq: { verdict: 'best', rate: '222212', why: 'A merge with an anti join, each way, against the database. Handles 200,000 rows comfortably and refreshes each month with the new file.' },
        pbi: { verdict: 'weak', rate: '211110', why: 'Power BI is built to summarise, not to hand finance a list of individual unmatched payments to chase.' },
      }),
      { id: 'decide', type: 'scope', title: 'Matching on what?', prompt: 'Payments and orders share an order reference, but some references in the provider file have extra spaces and different capitalisation. What do you do before matching?',
        topics: ['pq-clean'], concept: 'pq-clean', criteria: ['cleaning'],
        options: [
          { text: 'Trim and standardise the case of the reference on both sides, then match', score: 1, why: 'Cleaning the key on both sides turns false "unmatched" rows into real matches.' },
          { text: 'Match on the amount instead', score: 0.2, why: 'Many payments share an amount, so this matches the wrong rows.' },
          { text: 'Nothing: anything that does not match is unmatched', score: 0.1, why: 'You would chase hundreds of payments that are fine, only formatted differently.' },
          { text: 'Fix the references by hand in the CSV', score: 0.3, why: 'Correct, but it has to be redone every month, and on 200,000 rows.' },
        ] },
    ],
    debrief: `**SQL** and **Power Query** are both strong: two anti-joins (or anti-join merges) find what is unmatched in each direction, and both handle 200,000 rows and repeat monthly. The workbook of lookups is the thing being replaced. Either way, clean the reference on both sides first, or half the "unmatched" list is formatting.`,
  },
  {
    id: 'tc-targets-vs-actuals', kind: 'toolchoice', title: 'Targets in a spreadsheet, actuals in the database', level: 2, difficulty: 3, minutes: 7, business: 'Retail',
    from: { name: 'Tom Okafor', role: 'Commercial Manager' },
    message: `Targets live in a spreadsheet the regional team updates. Actual sales are in the database. Every month I want a variance table in Excel: actual against target, by region and month, with the gap in dollars and percent.`,
    constraints: ['Targets: a small spreadsheet, edited by hand.', 'Actuals: the sales database.', 'The output is an Excel table, every month.'],
    parts: [
      tools({
        excel: { verdict: 'good', rate: '211211', why: 'Paste this month\'s actuals and use lookups against the targets. Fine for a small table, but the paste is manual every month.' },
        sql: { verdict: 'good', rate: '221111', why: 'A query gives actuals by region and month in one go, but the targets are in a spreadsheet, so someone still has to join the two.' },
        pq: { verdict: 'best', rate: '222222', why: 'One query reads the targets workbook, another the database; a merge on region and month and a couple of custom columns produce the variance table, straight into Excel, on refresh.' },
        pbi: { verdict: 'good', rate: '222221', why: 'Would work well as a report, but Tom wants an Excel table, so it adds a step.' },
      }),
      { id: 'decide', type: 'scope', title: 'Making the two sides meet', prompt: 'The targets sheet writes months as "Apr-26"; the database gives dates. What is the most reliable way to line them up?',
        topics: ['pq-types'], concept: 'pq-types', criteria: ['transformation'],
        options: [
          { text: 'Turn both into a real first-of-month date, and merge on region and that date', score: 1, why: 'A proper date key works for sorting, filtering and matching, and cannot be mistyped.' },
          { text: 'Merge on the month text as it is', score: 0.2, why: '"Apr-26" and a date never match as text.' },
          { text: 'Add the target month by hand to each actual', score: 0.2, why: 'Manual, every month, and exactly the kind of step that goes wrong.' },
          { text: 'Merge on region only', score: 0, why: 'Every month of target would match every month of actual.' },
        ] },
    ],
    debrief: `**Power Query** is the best fit because it can read both sources and do the matching on refresh, landing an Excel table each month. Excel with lookups, SQL, and Power BI are all workable: each leaves one manual step or one extra tool. The detail that decides whether it works: both sides need the same, real month key.`,
  },

  // ================================================================= WORK REQUESTS · LEVEL 1 (clear brief)
  {
    id: 'ra-dairy', kind: 'request', title: 'Pizza costs crept up before the big rise', level: 1, difficulty: 3, minutes: 35, business: 'Restaurant',
    from: { name: 'Nadia Rahman', role: 'Head Chef, Olive & Ember' },
    message: `Everyone's talking about the beef price rise in June, but my pizza costings started going up in **May**, and we haven't changed a single recipe. Can you find out what changed in May, how big the change was, and what it has cost us from May to the end of August? Finance will want a number they can check.`,
    context: `Olive & Ember runs three restaurants. Every delivery from every supplier is in the purchasing records, with quantity and price.`,
    data: { db: 'restaurant', datasets: ['restaurant-db'] },
    objective: 'Identify what changed in May, measure it, and put a cost on it from May to August 2026.',
    constraints: ['Use the purchasing records: menu prices are not the issue.', 'A number finance can reproduce.'],
    answersKey: 'ra-dairy',
    parts: [
      tools({
        excel: { verdict: 'good', rate: '211211', why: 'An export of the relevant purchases is small enough for a PivotTable by supplier and month. Workable, with a manual export.' },
        sql: { verdict: 'best', rate: '222222', why: 'The purchases are already in the database: prices by supplier and month, then the cost of the change, in two queries finance can rerun.' },
        pq: { verdict: 'good', rate: '222121', why: 'Could pull the purchases and group them, then load to Excel. More set-up than a one-off question needs.' },
        pbi: { verdict: 'good', rate: '221121', why: 'A price-by-month visual would show the jump clearly, but it is a lot to build for one question.' },
      }),
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-interpret'], concept: 'anomaly', criteria: ['analysis', 'validation'],
        byTool: { sql: ['sql-dates', 'sql-dates'], excel: ['xl-pivots', 'pivot'], pq: ['pq-reshape', 'pq-group'], pbi: ['pbi-analysis', 'pbi-analysis'] },
        prompt: 'Report what you found.',
        pick: (a) => [a.month, a.supplier, a.risePct, a.extraMayAug],
        questions: [
          { label: 'The month the change started (YYYY-MM)', month: true },
          { label: 'The supplier whose prices changed', accept: ['Dairy Valley', 'dairy valley', 'Dairy'] },
          { label: 'How much their prices rose against April (%)', percent: true, tolerance: 1 },
          { label: 'What the rise cost from May to August, compared with paying April\'s prices ($)', tolerance: 330 },
        ] },
      conclusion('Write Nadia a short answer she can forward to finance: what changed, by how much, what it has cost, and what you would do about it.', {
        reasoning: { figures: (a) => [a.risePct, a.extraMayAug], question: [['dairy', 'dairy valley'], ['may'], ['cost', 'price', 'spend']], overclaims: ['menu prices went up', 'recipes changed'] },
        checklist: [
          { point: 'Names the supplier and the month', keywords: [['dairy'], ['may']] },
          { point: 'Gives the size of the price rise', keywords: [['8', '8.3', '8%']] },
          { point: 'Puts a cost on it from May to August', keywords: [['8,3', '8,4', '8.3k', '8.4k', '8364', '8,36']] },
          { point: 'Recommends a next step (renegotiate, compare suppliers, re-cost the menu)', keywords: [['negotiat', 'quote', 'other supplier', 'alternative', 're-cost', 'recost', 'menu price', 'contract']] },
        ],
      }),
    ],
    debrief: `Dairy Valley put its prices up by about **8%** from **1 May 2026**. Mozzarella, cream, butter and parmesan all moved together, which is why every pizza costing rose at once. Against April's prices, the rise cost the group roughly **$8,360** from May to August, on about $105,700 of dairy.

A strong answer measures the change **with the basket held fixed**. Otherwise a month that simply bought more parmesan looks like a price rise. It also separates this from the June beef rise, which is a different supplier and a different story.`,
    routes: [
      { tool: 'SQL', how: 'Average price per unit by supplier and month (SUM(line_total) / SUM(qty)), then the May–August cost as quantity × (price − April price) per ingredient.' },
      { tool: 'Excel', how: 'Export the purchases, PivotTable of spend and quantity by supplier and month, a price column, and a second pivot for the cost of the change.' },
      { tool: 'Power Query + Excel', how: 'Group the purchases by supplier, ingredient and month, merge April\'s price back on, and add a cost-of-change column.' },
    ],
  },
  {
    id: 'ra-two-revenues', kind: 'request', title: 'Two revenue numbers for the same quarter', level: 1, difficulty: 3, minutes: 35, business: 'Retail',
    from: { name: 'Adam Schmidt', role: 'Chief Operating Officer, Cedarline' },
    message: `The ops dashboard says online revenue for Q2 was **$189,534**. Finance's report says **$156,305**. The board meets on Thursday and I can't put two numbers in front of them. Which one is right, and what is the difference made of?`,
    context: `Cedarline sells outdoor gear in five stores and online. Orders, order lines, discounts and returns are all in the order database.`,
    data: { db: 'cedarline', datasets: ['cedarline-db'] },
    objective: 'Explain the gap between the two figures and say which one belongs in front of the board.',
    constraints: ['Finance counts completed orders placed in Q2, after discounts, less refunds on those orders.', 'The dashboard has not documented its rules.'],
    answersKey: 'ra-two-revenues',
    parts: [
      { id: 'scope', type: 'scope', title: 'What is the question?', prompt: 'Before you touch the data: what is Adam really asking?',
        topics: ['think-questions'], concept: 'scoping', criteria: ['business', 'understanding'],
        options: [
          { text: 'What each number measures, what the gap is made of, and which one answers the board\'s question', score: 1, why: 'Both numbers can be arithmetically right: they just count different things. The board needs the one that matches its question, with the difference explained.' },
          { text: 'Which of the two numbers is wrong', score: 0.5, why: 'A natural first reading, but it assumes one is a mistake. Often both are correct answers to different questions.' },
          { text: 'Whether the dashboard is broken', score: 0.3, why: 'Possible, but you cannot tell until you know what it is counting.' },
          { text: 'Take the average of the two, to be safe', score: 0, why: 'An average of two different measures means nothing.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'An export of Q2 orders and lines is small enough for Excel, but joining lines, orders and returns by hand is where mistakes creep in.' },
        sql: { verdict: 'best', rate: '222222', why: 'Orders, lines and returns are already in one database: rebuild each figure with a query, then split the gap into its parts.' },
        pq: { verdict: 'good', rate: '222121', why: 'Could merge the three tables and load the result, but it is more set-up than a reconciliation of one quarter needs.' },
        pbi: { verdict: 'good', rate: '221111', why: 'Useful if the fix is to publish one agreed measure afterwards; heavy for finding the gap itself.' },
      }),
      { id: 'find', type: 'numbers', title: 'What the gap is made of', topics: ['think-validation'], concept: 'reconciliation', criteria: ['analysis', 'validation', 'understanding'],
        byTool: { sql: ['sql-multijoins', 'join-filter'], excel: ['xl-sumifs', 'sumifs'], pq: ['pq-merge', 'pq-merge'], pbi: ['pbi-calculate', 'calculate'] },
        prompt: 'Split the gap between the two figures into its parts. All three are for online orders placed in Q2 2026.',
        pick: (a) => [a.cancelled, a.discount, a.refunds],
        questions: [
          { label: 'Value of lines on orders that were not completed (the dashboard counts them) ($)', tolerance: 2 },
          { label: 'Discounts given on completed orders ($)', tolerance: 2 },
          { label: 'Refunds on those completed orders ($)', tolerance: 2 },
        ] },
      conclusion('Write Adam a short note for the board pack: what each number measures, what the gap is made of, and which number the board should see.', {
        reasoning: { figures: (a) => [a.opsFigure, a.financeFigure, a.cancelled, a.discount, a.refunds], question: [['board'], ['finance', 'dashboard'], ['cancel', 'discount', 'refund']], overclaims: ['the dashboard is wrong', 'finance is wrong'] },
        checklist: [
          { point: 'Explains that the dashboard counts cancelled orders', keywords: [['cancel'], ['12,8', '12.8', '12814']] },
          { point: 'Explains that the dashboard ignores discounts', keywords: [['discount'], ['4,8', '4.8', '4805']] },
          { point: 'Explains that the dashboard ignores refunds', keywords: [['refund', 'return'], ['15,6', '15.6', '15609', '15610']] },
          { point: 'Shows that the parts add up to the gap', keywords: [['33,2', '33.2', '33229', 'adds up', 'add up', 'reconcil']] },
          { point: 'Recommends one agreed definition for the future', keywords: [['defin', 'agree', 'one number', 'single', 'dashboard should', 'relabel', 'rename']] },
        ],
      }),
    ],
    debrief: `Neither number is wrong. They answer different questions. The dashboard adds up the list price of **every** online order line placed in Q2: $189,534. Finance counts completed orders after discounts and less refunds: $156,305. The $33,229 gap is exactly three things: **$12,814** of cancelled orders, **$4,806** of discounts, and **$15,610** of refunds.

For the board, finance's figure is the one that means "money we kept". The more useful recommendation is to relabel the dashboard figure ("gross orders placed") or change it, so the two never collide again.`,
    routes: [
      { tool: 'SQL', how: 'Three sums over Q2 online orders: all lines at list price, completed lines after discount, refunds joined through order lines, then the differences.' },
      { tool: 'Excel', how: 'Export Q2 online order lines with status and discount, and the matching returns; SUMIFS by status, a discount column, and a refund total.' },
    ],
  },
  {
    id: 'ra-invoices', kind: 'request', title: 'Does the supplier\'s bill match our books?', level: 1, difficulty: 3, minutes: 30, business: 'Restaurant',
    from: { name: 'Samira Okoro', role: 'Accounts Payable, Olive & Ember' },
    message: `Prime Meats has sent their invoice files for May to August and says we owe **$158,670.62**. Our purchasing system shows **$158,572.61** of Prime Meats deliveries. It's not a big gap, but I'm not paying for something we didn't receive. What is the difference, and is it their mistake or ours?`,
    context: `Prime Meats supplies all three restaurants. Their invoice files are in the Data library; our side of every delivery is in the purchasing records.`,
    data: { db: 'restaurant', datasets: ['prime-meats', 'restaurant-db'], files: [{ label: 'prime_meats_invoices.zip (4 monthly CSVs)', path: 'prime_meats_invoices.zip' }] },
    objective: 'Find and explain the difference between the supplier\'s total and ours, before payment.',
    constraints: ['Four monthly files from the supplier; they are not all laid out the same way.'],
    answersKey: 'ra-invoices',
    parts: [
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'Four small files can be combined by hand and compared with a lookup, if you are careful with the layouts.' },
        sql: { verdict: 'good', rate: '221111', why: 'Our side is in the database already, but the supplier\'s files would have to be loaded first.' },
        pq: { verdict: 'best', rate: '222222', why: 'Combine the four files (fixing the differences between them), then compare with our deliveries line by line. The same query checks next month\'s statement.' },
        pbi: { verdict: 'weak', rate: '211100', why: 'A report is not how you find one wrong line to dispute.' },
      }),
      { id: 'issues', type: 'select', title: 'What is wrong with the files?', prompt: 'Which of these problems did you find in the supplier\'s files? Pick every one that is really there.',
        topics: ['think-quality'], concept: 'data-quality', criteria: ['quality', 'cleaning'],
        options: [
          { text: 'The July file ends with a TOTAL line, so adding up the column counts July twice', right: true, why: 'The last line of July is a total, with no invoice number.' },
          { text: 'One August line appears twice', right: true, why: 'The same lamb shoulder line on invoice PM-20260806-DT is listed twice.' },
          { text: 'The June file calls the quantity column "Quantity" instead of "Qty"', right: true, why: 'Combining the files by column name leaves June\'s quantities blank unless you rename it.' },
          { text: 'Product names have spaces before and after them in some files', right: true, why: '" Beef mince " and "Beef mince" do not match unless you trim them.' },
          { text: 'Some lines are priced in a different currency', right: false, why: 'Every price is in the same currency; nothing in the files suggests otherwise.' },
          { text: 'Some invoices belong to a different restaurant group', right: false, why: 'Every line is for one of the three Olive & Ember sites.' },
        ] },
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-validation'], concept: 'reconciliation', criteria: ['analysis', 'validation', 'transformation'],
        byTool: { sql: ['sql-multijoins', 'anti-join'], excel: ['xl-xlookup', 'xlookup'], pq: ['pq-append', 'pq-append'], pbi: ['pbi-pq', 'pbi-query'] },
        prompt: 'Report what you found.',
        pick: (a) => [a.difference, a.dupInvoice, a.dupCount],
        questions: [
          { label: 'The difference between their total and ours ($)', tolerance: 0.02 },
          { label: 'The invoice number where the problem is', accept: ['PM-20260806-DT', 'pm-20260806-dt'] },
          { label: 'How many lines they have billed twice', tolerance: 0 },
        ] },
      conclusion('Write Samira a short reply: what the difference is, whose mistake it is, and what she should do before paying.', {
        reasoning: { figures: (a) => [a.difference, a.statement, a.books], question: [['prime meats', 'supplier'], ['pay', 'dispute', 'owe'], ['duplicate', 'twice', 'double']], overclaims: ['fraud', 'deliberately', 'on purpose'] },
        checklist: [
          { point: 'States the difference', keywords: [['98']] },
          { point: 'Names the invoice and the duplicated line', keywords: [['pm-20260806', '6 august', '06/08', 'lamb']] },
          { point: 'Says the mistake is on the supplier\'s side', keywords: [['their', 'supplier', 'prime meats'], ['duplicat', 'twice', 'double']] },
          { point: 'Tells her what to do (pay the agreed amount, ask for a credit note)', keywords: [['credit', 'dispute', 'query', 'pay', 'short-pay', 'correct']] },
        ],
      }),
    ],
    debrief: `The files differ from our books by **$98.01**: one lamb shoulder line on invoice **PM-20260806-DT** is billed twice. Everything else matches line for line, so this is the supplier's mistake, and a small one: pay $158,572.61 and ask for a credit note for the duplicate.

Getting there cleanly is the actual skill. The July file ends with a TOTAL line, so adding up the column doubles July and makes the gap look like $44,000. June's quantity column has a different name, and product names carry stray spaces. A reconciliation that skips those checks finds the wrong answer confidently.`,
    routes: [
      { tool: 'Power Query', how: 'Folder query, rename June\'s column, remove the TOTAL line, trim product names, then a merge with our deliveries (anti join both ways) to list what does not match.' },
      { tool: 'Excel', how: 'Stack the four files on one sheet, delete the TOTAL line, TRIM the names, flag duplicates with COUNTIFS, and compare totals by invoice with our purchases export.' },
      { tool: 'SQL', how: 'Load the files into a table, then compare invoice totals and look for lines that appear more than once.' },
    ],
  },

  // ================================================================= WORK REQUESTS · LEVEL 2 (partial brief)
  {
    id: 'ra-portion', kind: 'request', title: 'The Airport\'s food cost still does not add up', level: 2, difficulty: 4, minutes: 50, business: 'Restaurant',
    from: { name: 'Leo Grant', role: 'Operations Manager, Olive & Ember' },
    message: `We sorted the fridge, and the waste log at the Airport looks normal again. But its food cost is still out of line with the other two sites. Something else is going on in that kitchen. Can you take a look?`,
    context: `Recipes say how much of each ingredient goes into every dish. Sales record how many of each dish were sold. Stock is counted at every month end, and every delivery and every logged piece of waste is recorded.`,
    data: { db: 'restaurant', datasets: ['restaurant-db'] },
    objective: null,
    constraints: ['Compare like with like: summer 2026 (June to August) against the months before it.'],
    answersKey: 'ra-portion',
    parts: [
      { id: 'scope', type: 'scope', title: 'What is the question?', prompt: 'Leo has not said exactly what he wants measured. What is the question worth answering?',
        topics: ['think-questions'], concept: 'scoping', criteria: ['business', 'understanding'],
        options: [
          { text: 'How much food is used that neither the recipes nor the waste log explain, and whether the Airport is different from the others', score: 1, why: 'Food cost is purchases corrected for stock. If recipes and logged waste do not account for what was used, the gap is the "something else" Leo means.' },
          { text: 'Whether the Airport is paying more for its ingredients', score: 0.3, why: 'Worth ruling out, but all three sites buy from the same suppliers; prices do not explain one kitchen using more.' },
          { text: 'Which chef is responsible', score: 0, why: 'Nothing in the data records who cooked what. Blaming a person is not an analysis.' },
          { text: 'Whether the Airport sells more of the expensive dishes', score: 0.5, why: 'A fair thing to check, but a different mix of dishes changes what the recipes predict, not the gap between recipes and actual use.' },
        ] },
      tools({
        excel: { verdict: 'weak', rate: '100110', why: 'Recipes × every day\'s dish sales × three sites, against stock movements, is tens of thousands of rows and several joins. Possible, but slow and easy to get wrong.' },
        sql: { verdict: 'best', rate: '222222', why: 'Recipes, sales, purchases, stock counts and waste are all in the database: what should have been used and what was used, per site, in a few CTEs.' },
        pq: { verdict: 'good', rate: '221121', why: 'Could build the same comparison with merges and groups, but it is a lot of steps compared with a query.' },
        pbi: { verdict: 'good', rate: '221221', why: 'A model with recipes, sales and stock could show the gap by site and month once built; a big job for one investigation.' },
      }),
      { id: 'causes', type: 'select', title: 'What could explain it?', prompt: 'Suppose a kitchen uses more food than its recipes and its waste log explain. Which of these could be the reason? Pick every one that could.',
        topics: ['think-causation'], concept: 'causation', criteria: ['business', 'understanding'],
        options: [
          { text: 'Portions bigger than the recipe says', right: true, why: 'The most common cause: every plate carries a little extra.' },
          { text: 'Waste thrown away without being logged', right: true, why: 'Anything binned and not written down looks like extra usage.' },
          { text: 'Staff meals not recorded', right: true, why: 'Food eaten but never sold or logged.' },
          { text: 'Stock counts that are wrong at month end', right: true, why: 'A miscounted closing stock moves the usage figure directly.' },
          { text: 'Theft', right: true, why: 'Possible, and it looks the same in the data as the others, which is why you cannot conclude it.' },
          { text: 'Supplier price rises', right: false, why: 'Prices change what food costs, not how much of it is used. The comparison here is in quantities.' },
          { text: 'More customers', right: false, why: 'More dishes sold raises what the recipes predict too, so it does not create a gap.' },
        ] },
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-interpret'], concept: 'anomaly', criteria: ['analysis', 'transformation', 'validation'],
        byTool: { sql: ['sql-cte', 'cte'], excel: ['xl-sumifs', 'sumifs'], pq: ['pq-merge', 'pq-merge'], pbi: ['pbi-calculate', 'calculate'] },
        prompt: 'Treat recipes × dishes sold as what each kitchen should have used, and opening stock + deliveries − closing stock as what it did use. Take off logged waste, and value the rest at each site\'s average purchase price for the period. What share of the recipe usage is left unexplained?',
        pick: (a) => [a.apSummer, a.apSpring, a.dtSummer],
        questions: [
          { label: 'Airport, June to August 2026 (% of recipe usage)', percent: true, tolerance: 0.5 },
          { label: 'Airport, January to May 2026 (%)', percent: true, tolerance: 0.5 },
          { label: 'Downtown, June to August 2026 (%)', percent: true, tolerance: 0.3 },
        ] },
      conclusion('Write Leo a short answer: what you found, how sure you are, what it could be, and what you would do next.', {
        reasoning: { figures: (a) => [a.apSummer, a.apSpring, a.dtSummer], question: [['airport'], ['usage', 'recipe', 'portion', 'unexplained', 'gap']], overclaims: ['stealing', 'theft is the cause', 'the chef'] },
        checklist: [
          { point: 'Gives the Airport\'s unexplained usage in summer', keywords: [['6', '6.0', '6%']] },
          { point: 'Compares it with the months before (it doubled)', keywords: [['3', '3.0', 'doubl', 'twice']] },
          { point: 'Compares it with another site', keywords: [['downtown', 'riverside'], ['1.5', '2.0', '2%', '1.5%']] },
          { point: 'Says the data cannot tell which cause it is', keywords: [['cannot', 'can\'t', 'does not show', 'not tell', 'not know', 'unclear']] },
          { point: 'Proposes a way to find out (portion checks, weekly counts, logging staff meals)', keywords: [['portion', 'weigh', 'count', 'staff meal', 'spot check', 'audit']] },
        ],
      }),
    ],
    debrief: `Since June the Airport has used about **6.0%** more food than its recipes and waste log explain, double its own **3.0%** from January to May. Downtown sits at about **1.5%** and Riverside at 2.0%. So the Airport's extra cost is not only waste, and it started when the waste did.

What the data cannot say is **why**. Bigger portions, unlogged waste, staff meals, count errors and theft all look identical in stock figures. The honest next step is to find out, not to guess: weigh plates for a week, count the top ingredients weekly instead of monthly, and log staff meals.`,
    routes: [
      { tool: 'SQL', how: 'CTEs for recipe usage (sales × recipes), actual usage (open + purchases − close), logged waste and average cost, joined per site and ingredient.' },
      { tool: 'Power BI', how: 'A model with recipes, sales, stock and waste, and measures for theoretical usage, actual usage and the gap.' },
    ],
  },
  {
    id: 'ra-absence', kind: 'request', title: 'Absence at the hubs', level: 2, difficulty: 3, minutes: 40, business: 'Logistics',
    from: { name: 'Jonah Evans', role: 'Chief Operating Officer, Brightpath' },
    message: `Absence has gone from about 4.3% to over 5% in two years. The hubs are clearly the problem: they're a point higher than head office. I want a proposal to tighten attendance rules at the hubs on my desk by Friday. Can you pull the numbers together for it?`,
    context: `Brightpath has staff at two hubs and a head office. Monthly attendance (days scheduled, days absent, overtime) is recorded for every employee from 2024.`,
    data: { db: 'hr', datasets: ['hr-db'] },
    objective: null,
    constraints: ['Jonah has already decided what he thinks the answer is.', 'Friday.'],
    answersKey: 'ra-absence',
    parts: [
      { id: 'scope', type: 'scope', title: 'What is the question?', prompt: 'Jonah asked for "the numbers" for his proposal. What is the question you should actually answer?',
        topics: ['think-questions'], concept: 'business-questions', criteria: ['business'],
        options: [
          { text: 'Where exactly absence has risen, and whether location is really what explains it', score: 1, why: 'The proposal assumes the hubs are the cause. Checking that first is what makes the numbers worth having.' },
          { text: 'Confirm that the hubs have the highest absence', score: 0.3, why: 'They do, but confirming a conclusion is not the same as testing it.' },
          { text: 'List the employees with the most days absent', score: 0.2, why: 'A list of names invites blame and says nothing about what changed.' },
          { text: 'Work out what absence costs the company', score: 0.4, why: 'Useful context for a proposal, but it does not tell you where to act.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211121', why: 'Sixteen thousand attendance rows fit in Excel and a PivotTable by location and department answers it, after an export and a lookup to departments.' },
        sql: { verdict: 'best', rate: '222222', why: 'Attendance, employees and departments are in one database: rates by year, location and department in one query.' },
        pq: { verdict: 'good', rate: '221121', why: 'Could merge and group the tables, then load to Excel. More steps than the question needs.' },
        pbi: { verdict: 'good', rate: '222221', why: 'A matrix of absence by location and department, with a year slicer, shows the answer at a glance; worth it if HR will keep watching this.' },
      }),
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-averages'], concept: 'simpson', criteria: ['analysis', 'insight'],
        byTool: { sql: ['sql-groupby', 'group-by'], excel: ['xl-pivots', 'pivot'], pq: ['pq-reshape', 'pq-group'], pbi: ['pbi-analysis', 'pbi-analysis'] },
        prompt: 'Absence rate = days absent ÷ days scheduled. Report what you found.',
        pick: (a) => [a.all2024, a.all2026, a.transport2026, a.hubsOthers2026],
        questions: [
          { label: 'Company absence rate, 2024 (%)', percent: true, tolerance: 0.2 },
          { label: 'Company absence rate, January to August 2026 (%)', percent: true, tolerance: 0.2 },
          { label: 'Transport\'s absence rate, January to August 2026 (%)', percent: true, tolerance: 0.2 },
          { label: 'Absence of staff at the two hubs who are not in Transport, January to August 2026 (%)', percent: true, tolerance: 0.2 },
        ] },
      { id: 'critique', type: 'select', title: 'Does the evidence support the plan?', prompt: 'Which of these statements does the data support? Pick every one that it does.',
        topics: ['think-causation'], concept: 'simpson', criteria: ['business', 'insight'],
        options: [
          { text: 'The hubs have higher absence than head office overall', right: true, why: 'True: about 5.4% against 4.3%.' },
          { text: 'Hub staff outside Transport are absent more than head office staff', right: false, why: 'They are not: about 4.4% against 4.3%. The hubs look worse only because Transport works there.' },
          { text: 'The rise since 2024 happened in Transport', right: true, why: 'Transport went from about 4.25% to 7.5%; everyone else stayed near 4.3%.' },
          { text: 'Tighter rules for everyone at the hubs would fix the rise', right: false, why: 'Most hub staff have normal absence. The rise is in one department.' },
          { text: 'The data proves overtime causes the absence', right: false, why: 'Transport\'s overtime and absence both rose from 2025, which is worth investigating, but it does not prove one causes the other.' },
        ] },
      conclusion('Write Jonah a short, honest answer he can use before Friday: what the numbers show, what they do not, and what you would propose instead.', {
        reasoning: { figures: (a) => [a.all2024, a.all2026, a.transport2026, a.hubsOthers2026, a.headOffice2026], question: [['hub'], ['absence'], ['rule', 'proposal', 'plan']], overclaims: ['overtime causes', 'caused by overtime', 'lazy', 'the hubs are the problem'] },
        checklist: [
          { point: 'States the overall rise', keywords: [['4.3'], ['5.3', '5.26', '5.2']] },
          { point: 'Locates the rise in Transport', keywords: [['transport'], ['7.5', '7.49', '7.4']] },
          { point: 'Shows the hubs are normal outside Transport', keywords: [['4.4', '4.36', 'same as head office', 'no different']] },
          { point: 'Advises against hub-wide rules', keywords: [['not', 'instead', 'rather'], ['rule', 'policy', 'hub']] },
          { point: 'Suggests looking at Transport\'s workload or overtime, without claiming it is proven', keywords: [['overtime', 'workload', 'driver'], ['may', 'might', 'could', 'investigat', 'likely', 'worth']] },
        ],
      }),
    ],
    debrief: `The rise is real, **4.3% → 5.3%**, but it is not a hub problem. Outside Transport, hub staff are absent about **4.4%** of scheduled days, the same as head office. The hubs look a point worse only because that is where Transport works, and Transport's absence jumped from about 4.3% to **7.5%** from 2025. That is the same year its drivers' overtime rose sharply.

That is a **mix effect**: a group total moves because of what is inside it. Hub-wide rules would punish hundreds of people whose attendance has not changed. The useful proposal is about Transport: workload, overtime and rota. It should be framed as something to test, because the data shows the two rising together, not that one causes the other.`,
    routes: [
      { tool: 'SQL', how: 'Absence rate grouped by year and location, then by year and department, then location split into Transport and everyone else.' },
      { tool: 'Excel or Power BI', how: 'A PivotTable (or matrix) with location and department on rows, year on columns, and days absent ÷ days scheduled as the value.' },
    ],
  },

  // ================================================================= WORK REQUESTS · LEVEL 3 (vague request)
  {
    id: 'ra-monday', kind: 'request', title: 'Something for Monday', level: 3, difficulty: 3, minutes: 45, business: 'Restaurant',
    from: { name: 'Elena Costa', role: 'Owner, Olive & Ember' },
    message: `Can you put something together for Monday's management meeting? Just the restaurants. August has closed.`,
    context: `Everything about the three restaurants is in the Olive & Ember database: sales, purchases, stock counts, labour and running costs.`,
    data: { db: 'restaurant', datasets: ['restaurant-db'] },
    objective: null,
    constraints: ['It is a management meeting, not an analysis session.'],
    answersKey: 'ra-monday',
    parts: [
      { id: 'scope', type: 'scope', title: 'What is being asked?', prompt: 'Elena gave you one line. What does a management meeting actually need from you?',
        topics: ['think-questions'], concept: 'business-questions', criteria: ['business'],
        options: [
          { text: 'A short page: how August went against last year and against costs, and the one thing that needs a decision', score: 1, why: 'A management meeting decides things. It needs the few numbers that show how the month went and what to act on.' },
          { text: 'Every number available for August, so nothing is missed', score: 0.2, why: 'Twenty numbers hide the two that matter.' },
          { text: 'A deep dive into one restaurant', score: 0.4, why: 'Maybe later, if the overview points there; it is not what was asked for.' },
          { text: 'A forecast for the rest of the year', score: 0.3, why: 'Useful sometimes, but nobody asked, and August has only just closed.' },
        ] },
      { id: 'metrics', type: 'select', title: 'What goes on the page?', prompt: 'Which of these belong on a one-page management summary for the month? Pick every one that does.',
        topics: ['think-kpis'], concept: 'kpi', criteria: ['business', 'understanding'],
        options: [
          { text: 'Net sales, against the same month last year', right: true, why: 'The headline, compared fairly (same month, so the season is the same).' },
          { text: 'Food cost as a % of sales', right: true, why: 'The biggest controllable cost in a restaurant.' },
          { text: 'Labour cost as a % of sales', right: true, why: 'The other big controllable cost.' },
          { text: 'The biggest change this month and what is behind it', right: true, why: 'What turns numbers into a discussion.' },
          { text: 'The sales of every dish, every day', right: false, why: 'Detail for an operations report, not a management page.' },
          { text: 'The number of rows in the sales table', right: false, why: 'A fact about the data, not about the business.' },
          { text: 'Social media followers', right: false, why: 'There is no such data here, and it is not what the meeting runs on.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'A one-page summary in Excel is fine, though rebuilding it by hand every month is where it starts to hurt.' },
        sql: { verdict: 'good', rate: '222111', why: 'The right way to get the numbers, but a query is not what goes in front of a management meeting.' },
        pq: { verdict: 'weak', rate: '212110', why: 'Prepares data; on its own it does not make the page.' },
        pbi: { verdict: 'best', rate: '222222', why: 'One report page on the database, refreshed each month: Monday\'s summary stops being a job, and anyone can drill into a number they question.' },
      }),
      { id: 'find', type: 'numbers', title: 'The numbers on your page', topics: ['think-kpis'], concept: 'kpi', criteria: ['analysis', 'validation'],
        byTool: { sql: ['sql-business', 'optimization'], excel: ['xl-dashboards', 'dashboard'], pq: ['pq-reshape', 'pq-group'], pbi: ['pbi-reports', 'report-design'] },
        prompt: 'Whatever else you include, the meeting will ask for these. Food cost = opening stock + purchases − closing stock, over net sales.',
        pick: (a) => [a.aug26, a.aug25, a.foodPct, a.labourPct],
        questions: [
          { label: 'Group net sales, August 2026 ($)', tolerance: 400 },
          { label: 'Group net sales, August 2025 ($)', tolerance: 400 },
          { label: 'Food cost as a % of net sales, August 2026', percent: true, tolerance: 0.3 },
          { label: 'Labour cost as a % of net sales, August 2026', percent: true, tolerance: 0.3 },
        ] },
      conclusion('Write the summary for Monday. Keep it to what a management meeting needs, and end with the one thing you think needs a decision.', {
        reasoning: { figures: (a) => [a.aug26, a.aug25, a.yoyPct, a.foodPct, a.labourPct], question: [['august'], ['sales'], ['food', 'labour', 'labor', 'cost']], overclaims: ['best month ever', 'record'] },
        checklist: [
          { point: 'Gives August net sales against last August', keywords: [['440', '441'], ['402', '9.5', '9.54', '9.5%']] },
          { point: 'Gives food cost %', keywords: [['28', '28.1']] },
          { point: 'Gives labour cost %', keywords: [['26.6', '26.7', '26.65']] },
          { point: 'Picks out one thing that needs a decision', keywords: [['decide', 'decision', 'action', 'recommend', 'propose', 'should']] },
          { point: 'Stays short (a summary, not a data dump)', keywords: [['summary', 'in short', 'headline', 'overall', 'august']] },
        ],
      }),
    ],
    debrief: `A good Monday page is short. August net sales were about **$440,700**, up **9.5%** on August 2025. Food cost was about **28.1%** of sales and labour **26.7%**. Then comes the one thing to decide. The strongest candidate is food cost: well above where it was in spring, and highest at the Airport, which has two known causes (waste and portions) that have owners.

What makes this a Level 3 request is that nobody told you any of that. Choosing the measures, comparing with the same month last year rather than with July, and ending on a decision *is* the job. So is noticing that a monthly report is worth building once in Power BI rather than every month by hand.`,
    routes: [
      { tool: 'SQL + Excel', how: 'Queries for the four figures, pasted into a one-page Excel summary.' },
      { tool: 'Power BI', how: 'A report page on the database with the four measures and last year beside each, refreshed monthly.' },
    ],
  },
  {
    id: 'ra-programme', kind: 'request', title: 'Does the programme work?', level: 3, difficulty: 4, minutes: 45, business: 'NGO',
    from: { name: 'Ruth Adeyemi', role: 'Chair of Trustees, Bright Wells' },
    message: `A funder has asked whether our school programme works. We've got the village survey. What can we tell them?`,
    context: `Bright Wells surveys school enrolment and attendance in the villages it works with, at the end of each school year. Villages joined the programme in different years.`,
    data: { datasets: ['bright-wells-survey'], files: [{ label: 'bright_wells_school_survey.xlsx', path: 'powerquery/bright_wells_school_survey.xlsx' }] },
    objective: null,
    constraints: ['The funder will read whatever you send very carefully.'],
    answersKey: 'ra-programme',
    parts: [
      { id: 'scope', type: 'scope', title: 'What can be answered?', prompt: 'The funder asks whether the programme works. What should your answer set out to do?',
        topics: ['think-questions'], concept: 'scoping', criteria: ['business', 'understanding'],
        options: [
          { text: 'Show what the survey can and cannot say about the programme\'s effect, and what would settle the question', score: 1, why: 'The honest answer to "does it work?" starts with what the evidence can support. A careful funder will respect that more than a confident claim.' },
          { text: 'Show that attendance went up, which proves the programme works', score: 0.2, why: 'Attendance can rise for many reasons. Without a comparison, a rise alone proves nothing about the programme.' },
          { text: 'Report attendance by region', score: 0.4, why: 'A useful table, but it does not address "does it work".' },
          { text: 'Pick the villages that improved most and feature them', score: 0.1, why: 'Choosing the best cases is exactly what a careful funder will distrust.' },
        ] },
      { id: 'dataneeds', type: 'select', title: 'What would you need?', prompt: 'To say whether the programme caused a change in attendance, which of these would you need? Pick every one.',
        topics: ['think-causation'], concept: 'causation', criteria: ['understanding', 'business'],
        options: [
          { text: 'Attendance in comparable villages that are not in the programme, over the same years', right: true, why: 'Without a comparison group, you cannot separate the programme from everything else that changed.' },
          { text: 'A survey from before each village joined', right: true, why: 'The villages that joined in 2026 were never surveyed before joining, so there is no "before".' },
          { text: 'The same definition of "attending" every year', right: true, why: 'If the counting rule changed, the numbers are not comparable.' },
          { text: 'What else changed locally (new schools, teachers, the flood)', right: true, why: 'Other changes can raise or lower attendance on their own. One village was flooded in 2026.' },
          { text: 'More villages from inside the programme', right: false, why: 'More of the same does not provide the missing comparison.' },
          { text: 'The list of donors', right: false, why: 'Says nothing about attendance.' },
          { text: 'Next year\'s enrolment forecast', right: false, why: 'A forecast is not evidence of what happened.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'A small sheet: unpivot by hand or with formulas, then a PivotTable. Fine for 36 villages.' },
        sql: { verdict: 'weak', rate: '211100', why: 'The survey is one small spreadsheet; a database adds nothing here.' },
        pq: { verdict: 'best', rate: '222222', why: 'Unpivot the year columns into rows, set types, and group: the survey is laid out one column per year, which is exactly what Power Query untangles, and next year\'s survey drops straight in.' },
        pbi: { verdict: 'good', rate: '222121', why: 'Would chart it well once unpivoted in Power Query; more than the question needs.' },
      }),
      { id: 'find', type: 'numbers', title: 'What the survey can say', topics: ['think-trust'], concept: 'missing-data', criteria: ['analysis', 'quality', 'transformation'],
        byTool: { sql: ['sql-aggregate', 'aggregates'], excel: ['xl-pivots', 'pivot'], pq: ['pq-reshape', 'pq-unpivot'], pbi: ['pbi-pq', 'pbi-query'] },
        prompt: 'Attendance rate = pupils attending ÷ pupils enrolled, totalled across villages. Report what you found.',
        pick: (a) => [a.both, a.rate2024, a.rate2026, a.noBefore],
        questions: [
          { label: 'How many villages were surveyed in both 2024 and 2026?', tolerance: 0 },
          { label: 'Their attendance rate in 2024 (%)', percent: true, tolerance: 0.3 },
          { label: 'Their attendance rate in 2026 (%)', percent: true, tolerance: 0.3 },
          { label: 'How many villages have no survey from before they joined?', tolerance: 0 },
        ] },
      conclusion('Write the trustees\' reply to the funder: what you can say, what you cannot, and what you would do so that next year you can answer properly.', {
        reasoning: { figures: (a) => [a.rate2024, a.rate2026, a.both, a.noBefore], question: [['programme', 'program'], ['work', 'effect', 'impact', 'attendance']], overclaims: ['proves the programme', 'proves that the programme', 'caused by the programme', 'the programme caused'] },
        checklist: [
          { point: 'Reports the attendance change for villages surveyed both years', keywords: [['63', '64'], ['73']] },
          { point: 'Says this does not show the programme caused it', keywords: [['cannot', 'can\'t', 'does not show', 'not prove', 'not enough', 'no comparison']] },
          { point: 'Names the missing comparison (villages outside the programme, or before joining)', keywords: [['comparison', 'compare', 'outside the programme', 'not in the programme', 'before joining', 'control', 'baseline']] },
          { point: 'Mentions the data gaps (villages never surveyed before, the flooded village)', keywords: [['flood', 'not surveyed', 'missing', 'no survey', '8 villages', 'eight villages']] },
          { point: 'Proposes what to collect from now on', keywords: [['collect', 'survey', 'from now', 'next year', 'going forward', 'start']] },
        ],
      }),
    ],
    debrief: `The 28 villages surveyed in both 2024 and 2026 went from about **63.7%** to **73.2%** attendance. That is encouraging, and it is **not** evidence that the programme caused it. Every village in the survey is in the programme, so there is nothing to compare with. The 8 villages that joined in 2026 were never surveyed before joining. And one village was flooded in 2026.

The strong answer to the funder says exactly that, then turns it into a plan. Survey villages before they join. Find comparable villages outside the programme. Keep the definition of "attending" fixed. Record what else changes. That is what "decide which data is needed" means: the most valuable output here is not a number but the list of data that would let you answer next year.`,
    routes: [
      { tool: 'Power Query', how: 'Promote the header row, unpivot the year columns, split "2024 Enrolled" into year and measure, pivot the measure back out, filter villages with both years.' },
      { tool: 'Excel', how: 'SUMIFS over the villages that have both years filled in, and COUNTIFS for the gaps.' },
    ],
  },

  // ================================================================= MIXED-SKILL ASSESSMENTS
  {
    id: 'ax-fieldhouse', kind: 'assessment', title: 'The membership export', level: 2, difficulty: 4, minutes: 60, business: 'Leisure',
    from: { name: 'Beth Morales', role: 'General Manager, Fieldhouse Gyms' },
    message: `Riverside's manager says April's price rise went through "without a problem". Head office thinks we're losing members. I've attached the export from the club system. Are we losing members? If so, where, and why?`,
    context: `Fieldhouse Gyms has three clubs: Northgate, Riverside and Old Town. The export lists every member who has joined since January 2024, with their club, plan, current monthly fee, join date and, if they have left, the date they cancelled.`,
    data: { datasets: ['fieldhouse-export'], files: [{ label: 'fieldhouse_members_export.csv', path: 'assessment/fieldhouse_members_export.csv' }] },
    objective: null,
    constraints: ['The club system writes dates with slashes in day/month/year order.', 'Nobody has checked this export before.'],
    answersKey: 'ax-fieldhouse',
    parts: [
      { id: 'issues', type: 'select', title: 'What is wrong with the data?', prompt: 'Look at the file before you count anything. Which of these problems are really in it? Pick every one.',
        topics: ['think-quality'], concept: 'data-quality', criteria: ['quality', 'understanding'],
        options: [
          { text: 'Some members appear twice', right: true, why: 'Fourteen members were exported twice.' },
          { text: 'There are test accounts set up by the front desk', right: true, why: 'Six rows with @fieldhouse.test emails and no fee.' },
          { text: 'The same club is spelled in several ways', right: true, why: 'Old Town appears as "Oldtown", "OLD TOWN" and with a trailing space.' },
          { text: 'Dates are written in two different formats', right: true, why: 'Most are 2026-03-14, some are 14/03/2026.' },
          { text: 'Some fees have a currency sign and some do not', right: true, why: '"$45.00" and "45.00" in the same column: one is text.' },
          { text: 'The file has blank lines and a total line at the bottom', right: true, why: 'Two blank lines in the middle, one before a "Total rows" line.' },
          { text: 'Some fees are in euros', right: false, why: 'Every fee is in dollars; the sign is just missing on most rows.' },
          { text: 'Some members joined after the export date', right: false, why: 'No join date is later than 31 August 2026.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'About 1,800 rows: cleaning by hand is possible in an afternoon, but every fix is a manual step you cannot rerun next month.' },
        sql: { verdict: 'weak', rate: '211110', why: 'The file would have to be loaded into a database, and parsing two date formats and stray text in SQL is awkward for this job.' },
        pq: { verdict: 'best', rate: '222222', why: 'Remove blanks, the footer, test accounts and duplicates; trim and fix club names; parse both date formats with the right locale; strip the sign from the fee. Next month\'s export runs through the same steps.' },
        pbi: { verdict: 'good', rate: '222221', why: 'Power Query inside Power BI does the cleaning, and a membership report by club and month would be worth keeping. More than a first look needs.' },
      }),
      { id: 'metrics', type: 'select', title: 'What would you measure?', prompt: 'Which measures answer "are we losing members, and where"? Pick every one that helps.',
        topics: ['think-kpis'], concept: 'kpi', criteria: ['business', 'understanding'],
        options: [
          { text: 'Active members at a date, by club (joined by then and not yet cancelled)', right: true, why: 'The direct answer to "are we losing members".' },
          { text: 'Cancellations per month, by club', right: true, why: 'Shows when the change started and where.' },
          { text: 'Cancellations relative to the number of members', right: true, why: 'A bigger club has more cancellations; the rate makes clubs comparable.' },
          { text: 'New members joining per month', right: true, why: 'Losing members is cancellations minus new joiners: both matter.' },
          { text: 'The number of rows in the export', right: false, why: 'Includes duplicates, tests and everyone who ever left.' },
          { text: 'The average fee across every row', right: false, why: 'Mixes current and former members and tells you nothing about losses.' },
        ] },
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-trust'], concept: 'duplicates', criteria: ['cleaning', 'analysis', 'validation'],
        byTool: { sql: ['sql-strings', 'string-funcs'], excel: ['xl-cleaning', 'cleaning'], pq: ['pq-clean', 'pq-clean'], pbi: ['pbi-pq', 'pbi-query'] },
        prompt: 'After cleaning, report what you found. A member is active on a date if they had joined by then and had not cancelled by then.',
        pick: (a) => [a.members, a.active0331, a.active0831, a.lostClub, a.lostN, a.rsCancelAfter, a.rsMonthlyAfter],
        questions: [
          { label: 'Real members in the export (each person once, no test accounts)', tolerance: 0 },
          { label: 'Active members on 31 March 2026', tolerance: 0 },
          { label: 'Active members on 31 August 2026', tolerance: 0 },
          { label: 'The club that lost the most active members between those two dates', accept: ['Riverside', 'riverside', 'RS'] },
          { label: 'How many active members it lost', tolerance: 0 },
          { label: 'That club\'s cancellations from April to August 2026', tolerance: 0 },
          { label: 'How many of those were on the Monthly plan', tolerance: 0 },
        ] },
      conclusion('Write Beth a short answer: are you losing members, where, what the evidence suggests about why, and what you would do.', {
        reasoning: { figures: (a) => [a.active0331, a.active0831, a.lostN, a.rsCancelAfter, a.rsMonthlyAfter, a.rsCancelBefore], question: [['member'], ['riverside', 'club'], ['losing', 'lost', 'cancel']], overclaims: ['everyone is leaving', 'all clubs are losing', 'proves the price rise'] },
        checklist: [
          { point: 'Says the group as a whole is not losing members', keywords: [['1,174', '1174', '1,228', '1228', 'grew', 'up overall', 'not losing', 'overall']] },
          { point: 'Names Riverside as the club losing members', keywords: [['riverside'], ['21', 'lost', 'fell', 'down']] },
          { point: 'Shows cancellations there rose after April', keywords: [['106', '34', 'tripl', 'three times']] },
          { point: 'Links it to the Monthly plan and the price rise, carefully', keywords: [['monthly', 'price'], ['82', 'rise', 'increase']] },
          { point: 'Mentions the cleaning the export needed', keywords: [['duplicat', 'test', 'clean']] },
          { point: 'Recommends a next step (talk to leavers, review the price, watch next month)', keywords: [['recommend', 'suggest', 'review', 'survey', 'exit', 'watch', 'monitor', 'offer']] },
        ],
      }),
    ],
    debrief: `Overall, Fieldhouse is **not** losing members: active members went from **1,174** at the end of March to **1,228** at the end of August. Riverside is the exception. It lost **21** active members while the other two clubs grew. It had **106** cancellations from April to August, against 34 in the five months before, and **82** of them were on the Monthly plan, the plan whose fee went up in April.

That timing and that concentration make the price rise the obvious suspect, not a proven cause. The fair next step is to ask Riverside's leavers why. Before any of that, the export needed work: 14 duplicate rows, 6 test accounts, three spellings of Old Town, two date formats, and a footer line. Skip those checks and every count in this answer is wrong.`,
    routes: [
      { tool: 'Power Query', how: 'Filter out blanks, the footer and test emails; remove duplicate MemberIDs; trim and map club names; parse both date formats (UK locale); then group by club for active members and cancellations.' },
      { tool: 'Excel', how: 'Clean on a copy: Remove Duplicates, filter out the tests, TRIM/PROPER the club, DATEVALUE with a day/month rule, then COUNTIFS for active members and cancellations.' },
    ],
  },
  {
    id: 'ax-cedarline', kind: 'assessment', title: 'The Q2 export from the stores', level: 3, difficulty: 5, minutes: 60, business: 'Retail',
    from: { name: 'Mariam D\'Souza', role: 'Regional Director, Cedarline' },
    message: `Our Q2 order-line export adds up to **$366,378** of sales, but finance booked quite a bit less. Can you check the file, tell me what's wrong with it, and give me the real completed sales for the quarter and how West did against its target?`,
    context: `The export comes from the tills and the website combined. The workbook also holds the product list, the regional targets for Q2 and the data dictionary written by the sales team.`,
    data: { datasets: ['cedarline-q2'], files: [{ label: 'cedarline_q2_2026_order_lines.xlsx', path: 'retail/cedarline_q2_2026_order_lines.xlsx' }] },
    objective: null,
    constraints: ['Targets are for completed orders, after line discounts, before returns, excluding shipping (see the Targets sheet).'],
    answersKey: 'ax-cedarline',
    parts: [
      { id: 'issues', type: 'select', title: 'What is wrong with the file?', prompt: 'Which of these problems are really in the export? Pick every one.',
        topics: ['think-quality'], concept: 'data-quality', criteria: ['quality', 'understanding'],
        options: [
          { text: 'Some rows are exact duplicates of other rows', right: true, why: 'Fourteen rows are copies.' },
          { text: 'There are blank rows and a total row', right: true, why: 'Two blank rows and a total at the very bottom, which a column sum picks up.' },
          { text: 'Cancelled lines are mixed in with completed ones', right: true, why: 'Status says Completed, Cancelled, or "Canceled": spelled two ways.' },
          { text: 'A few unit prices are about 100 times too high', right: true, why: 'Five lines have the decimal point in the wrong place, overstating sales by tens of thousands.' },
          { text: 'Discounts are written as fractions on some rows and whole percentages on others', right: true, why: '0.10 and 10 both appear, and some are blank.' },
          { text: 'The same region is spelled in different ways', right: true, why: 'About 120 rows use a variant spelling or case.' },
          { text: 'Returns were typed in by hand as extra lines with negative quantities', right: true, why: 'Eight lines with LineIDs ending in "-R" are manual returns, not sales.' },
          { text: 'Some orders are dated outside Q2', right: false, why: 'Every line is dated April to June 2026.' },
          { text: 'The same LineID is used for two different products', right: false, why: 'Apart from the exact duplicates, every LineID is unique.' },
        ] },
      tools({
        excel: { verdict: 'good', rate: '211221', why: 'Three thousand rows and a Targets sheet in the same workbook: cleaning by hand works if you are systematic, and it is where the file already lives.' },
        sql: { verdict: 'weak', rate: '211110', why: 'Loading a hand-edited workbook into a database, with text dates and mixed discount formats, is more trouble than the cleaning itself.' },
        pq: { verdict: 'best', rate: '222222', why: 'Skip the title rows, remove blanks, the total and duplicates, standardise status, region and discount, fix types, and merge the targets: every fix recorded, and next quarter\'s export goes through the same steps.' },
        pbi: { verdict: 'good', rate: '222221', why: 'Same cleaning in its Power Query, then an attainment visual by region. Worth it if the region reports continue.' },
      }),
      { id: 'find', type: 'numbers', title: 'Your findings', topics: ['think-validation'], concept: 'reconciliation', criteria: ['cleaning', 'analysis', 'validation'],
        byTool: { sql: ['sql-strings', 'string-funcs'], excel: ['xl-cleaning', 'cleaning'], pq: ['pq-clean', 'pq-clean'], pbi: ['pbi-pq', 'pbi-query'] },
        prompt: 'After cleaning, report what you found.',
        pick: (a) => [a.truthLines, a.completedNet, a.overstatement, a.westAttainment],
        questions: [
          { label: 'Genuine order lines: no blank or total rows, no duplicates and no manual return lines', tolerance: 0 },
          { label: 'Completed sales for Q2, after line discounts ($)', tolerance: 60 },
          { label: 'How much the misplaced decimal points overstate the total ($)', tolerance: 120 },
          { label: 'West\'s Q2 sales as a % of its target', percent: true, tolerance: 0.5 },
        ] },
      conclusion('Write Mariam a short answer: what was wrong with the export, the real Q2 completed sales, how West did against target, and what should change in how the export is produced.', {
        reasoning: { figures: (a) => [a.completedNet, a.overstatement, a.westAttainment, a.naiveTotal], question: [['west'], ['target'], ['sales', 'completed']], overclaims: ['west is failing', 'west is the worst region because of the staff'] },
        checklist: [
          { point: 'Gives the real completed sales', keywords: [['347']] },
          { point: 'Explains why the export total was too high (duplicates, cancelled lines, price errors, the total row)', keywords: [['duplicat', 'cancel', 'total row', 'decimal', 'price']] },
          { point: 'Gives West against its target', keywords: [['west'], ['87', '87.2']] },
          { point: 'Recommends fixing the export at the source', keywords: [['source', 'export', 'validation', 'lock', 'drop-down', 'dropdown', 'template', 'fix']] },
        ],
      }),
    ],
    debrief: `Summed as it stands, the export says **$366,378**. Cleaned, completed Q2 sales are about **$347,418**. That the two are only 5% apart is luck, not accuracy. Five prices typed about 100 times too high overstate sales by roughly **$51,800**, while discounts typed as whole numbers (15 instead of 0.15) pull the total down by a similar amount. Duplicates, cancelled lines (some spelled "Canceled"), manual return lines and a total row sit on top. Against the cleaned figure, West reached about **87%** of its Q2 target.

The part many people skip is the last one: an export this hand-edited will be wrong again next quarter. The recommendation that saves the most time is at the source. Validate prices and statuses where they are typed, and stop hand-editing the export.`,
    routes: [
      { tool: 'Power Query', how: 'Skip the title rows, promote headers, remove blank, total and duplicate rows, standardise status, region and discount, set types, and merge the Targets sheet by region and month.' },
      { tool: 'Excel', how: 'Clean on a copy with Remove Duplicates, filters and helper columns for status, region and discount, flag outlier prices against the Products list price, then SUMIFS against the targets.' },
    ],
  },
];

export const ANALYST_KINDS = Object.freeze({
  toolchoice: { label: 'Cross-tool challenge', plural: 'Cross-tool challenges', blurb: 'A situation, four tools, and more than one good answer.' },
  request: { label: 'Work request', plural: 'Work requests', blurb: 'A request from someone in the business. Nobody tells you how.' },
  assessment: { label: 'Mixed assessment', plural: 'Mixed assessments', blurb: 'An unfamiliar problem on data you have not seen: everything at once.' },
});
export const LEVEL_NAME = Object.freeze({ 1: 'Clear brief', 2: 'Partial brief', 3: 'Vague request' });
