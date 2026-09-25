// First-run placement check: "What do I already know?", not "Can I already work as a senior
// analyst?". It adapts as it goes (server/index.js, placementPlan):
//   * The learner first says how much they have used each tool. "Never" skips that tool: not
//     knowing Power BI yet is a starting point, never a failure.
//   * Each tool starts with three genuinely basic questions (tier "Basics"). Fewer than two right:
//     that tool starts at its first lesson, and nothing harder is asked.
//   * Only then come the tiers that credit topics, in order (Beginner, Intermediate, Advanced);
//     a tier is asked only after the one before it was passed (2 of 3, or 1 of 1).
//   * "I haven't learned this yet" is always an answer. It is never recorded as a wrong answer.
// Passing a tier credits that tier's topics (a small starting credit, confirmed later by reviews).
// area = the skill the answer credits; "pq" covers data cleaning. Item ids are progress keys: the
// original 20 keep their ids (only their order in the check changed).

export const PLACEMENT_TOOLS = [
  { area: 'excel', name: 'Excel' },
  { area: 'sql', name: 'SQL' },
  { area: 'pq', name: 'Power Query', hint: 'cleaning and combining data, in Excel or Power BI' },
  { area: 'pbi', name: 'Power BI' },
];

/** The order of the check: per area, stages asked one after another while they are passed. */
export const PLACEMENT_STAGES = {
  excel: [
    { tier: 'Basics', ids: ['pl2-xl-1', 'pl2-xl-2', 'pl2-xl-3'], pass: 2 },
    { tier: 'Beginner', ids: ['pl-xl-b1', 'pl-xl-b2', 'pl-xl-b3'], pass: 2 },
    { tier: 'Intermediate', ids: ['pl-xl-i1', 'pl-xl-i2', 'pl-xl-i3'], pass: 2 },
    { tier: 'Advanced', ids: ['pl-xl-a1'], pass: 1 },
  ],
  sql: [
    { tier: 'Basics', ids: ['pl2-sql-1', 'pl2-sql-2', 'pl2-sql-3'], pass: 2 },
    { tier: 'Beginner', ids: ['pl-sql-b1', 'pl-sql-b2', 'pl-sql-b3'], pass: 2 },
    { tier: 'Intermediate', ids: ['pl-sql-i1', 'pl-sql-i2'], pass: 2 },
    { tier: 'Advanced', ids: ['pl-sql-a1'], pass: 1 },
  ],
  pq: [
    { tier: 'Basics', ids: ['pl2-pq-1', 'pl2-pq-2', 'pl2-pq-3'], pass: 2 },
    { tier: 'Beginner', ids: ['pl-pq-b1', 'pl-pq-b2', 'pl-pq-b3'], pass: 2 },
  ],
  pbi: [
    { tier: 'Basics', ids: ['pl2-pbi-1', 'pl2-pbi-2', 'pl2-pbi-3'], pass: 2 },
  ],
  think: [
    { tier: 'Basics', ids: ['pl2-th-1', 'pl2-th-2', 'pl-th-4'], pass: 2 },
    { tier: 'Beginner', ids: ['pl-th-1', 'pl-th-2', 'pl-th-3'], pass: 2 },
  ],
};

export const PLACEMENT = [
  // ---- the basics: what anyone who has used the tool a little knows
  { id: 'pl2-xl-1', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'basic-agg', prompt: 'In Excel, what does the formula `=A2+B2` do?', options: ['Adds the numbers in cells A2 and B2', 'Writes the text "A2+B2" in the cell', 'Copies A2 into B2', 'Counts the cells from A2 to B2'], answer: 0 },
  { id: 'pl2-xl-2', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'basic-agg', prompt: 'Which formula adds up all the numbers in A2 to A10?', options: ['=SUM(A2:A10)', '=ADD(A2-A10)', '=TOTAL(A2,A10)', '=COUNT(A2:A10)'], answer: 0 },
  { id: 'pl2-xl-3', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'sort-filter', prompt: 'A sheet lists sales for every region. What is the quickest way to see only the rows for the West region?', options: ['Filter the Region column to West', 'Delete every row that is not West', 'Sort by Region and scroll down', 'Copy the West rows by hand'], answer: 0 },
  { id: 'pl2-sql-1', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'select-basics', prompt: 'What does `SELECT * FROM customers;` show?', options: ['Every column and row of the customers table', 'How many customers there are', 'Only the first customer', 'The names of the columns only'], answer: 0 },
  { id: 'pl2-sql-2', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'where-logic', prompt: 'Which part of a query keeps only the rows that meet a condition, like `city = \'Leeds\'`?', options: ['WHERE', 'ORDER BY', 'SELECT', 'LIMIT'], answer: 0 },
  { id: 'pl2-sql-3', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'select-basics', prompt: 'What does `ORDER BY total DESC` do?', options: ['Sorts the rows from the highest total to the lowest', 'Keeps only the row with the highest total', 'Adds all the totals together', 'Sorts the rows from the lowest total to the highest'], answer: 0 },
  { id: 'pl2-pq-1', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'pq-basics', prompt: 'What is Power Query mainly used for?', options: ['Getting data in and cleaning it before you analyse it', 'Drawing charts for a presentation', 'Sending finished reports by email', 'Protecting a workbook with a password'], answer: 0 },
  { id: 'pl2-pq-2', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'pq-clean', prompt: 'A Region column holds "West", "west " and "WEST". Which cleaning makes them one value?', options: ['Trim the spaces and make the capitals match', 'Sort the column from A to Z', 'Change the column type to a number', 'Delete the column and type it again'], answer: 0 },
  { id: 'pl2-pq-3', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'pq-basics', prompt: 'You clean a file in Power Query. Next month a new file arrives with the same layout. What do you do?', options: ['Refresh: the saved steps run again on the new data', 'Repeat every cleaning step by hand', 'Build a completely new query from scratch', 'Paste the new rows under the old ones'], answer: 0 },
  { id: 'pl2-pbi-1', area: 'pbi', tier: 'Beginner', type: 'mc', concept: 'pbi-basics', prompt: 'What is Power BI mainly used for?', options: ['Building interactive reports and dashboards from data', 'Writing and formatting long documents', 'Storing and sending company email', 'Editing photos for a website'], answer: 0 },
  { id: 'pl2-pbi-2', area: 'pbi', tier: 'Beginner', type: 'mc', concept: 'pbi-visuals', prompt: 'In a Power BI report, what is a "visual"?', options: ['A chart, table or card that shows the data', 'A picture pasted onto the page', 'The file the data comes from', 'A password that protects the report'], answer: 0 },
  { id: 'pl2-pbi-3', area: 'pbi', tier: 'Beginner', type: 'mc', concept: 'pbi-model', prompt: 'A Sales table and a Customers table both have a Customer ID column. What does Power BI use that for?', options: ['A relationship, so both tables can be analysed together', 'Deleting duplicate customers from both tables', 'Sorting the customers by their ID number', 'Nothing: it ignores columns with the same name'], answer: 0 },
  { id: 'pl2-th-1', area: 'think', tier: 'Beginner', type: 'mc', concept: 'duplicates', prompt: 'A sales report counts the same order twice. What happens to the total sales?', options: ['It is too high', 'It is too low', 'Nothing: duplicates cancel out', 'The report stops working'], answer: 0 },
  { id: 'pl2-th-2', area: 'think', tier: 'Beginner', type: 'mc', concept: 'data-trust', prompt: 'Before you trust a number in a report, what is a good first check?', options: ['Where it came from, and whether it matches another source', 'Whether it is a nice round number', 'Whether it is higher than last year', 'Whether the chart around it looks good'], answer: 0 },
  // Excel
  { id: 'pl-xl-b1', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'cell-refs', prompt: 'D2 contains `=B2*$F$1`. You copy D2 to E5. What is in E5?', options: ['=B5*$F$1', '=C5*$F$1', '=C5*$G$4', '=B2*$F$1'], answer: 1 },
  { id: 'pl-xl-b2', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'countif-sumif', prompt: 'What does `=SUMIF(B2:B100,"West",C2:C100)` return?', options: ['The number of West rows', 'The total of column C for rows where column B is "West"', 'The average of West', 'An error: SUMIF needs three conditions'], answer: 1 },
  { id: 'pl-xl-b3', area: 'excel', tier: 'Beginner', type: 'mc', concept: 'if-logic', prompt: 'What does `=IF(A2>100,"High")` show when A2 is 50?', options: ['Low', 'An empty cell', 'FALSE', '#N/A'], answer: 2 },
  { id: 'pl-xl-i1', area: 'excel', tier: 'Intermediate', type: 'mc', concept: 'exact-match', prompt: '`=VLOOKUP(A2, Prices!A:C, 3)` returns believable but wrong prices, and never an error. Why?', options: ['The prices sheet is protected', 'The 4th argument is missing, so it does an approximate match', 'VLOOKUP can only return column 2', 'The data must be a Table'], answer: 1 },
  { id: 'pl-xl-i2', area: 'excel', tier: 'Intermediate', type: 'mc', concept: 'date-criteria', prompt: 'Which SUMIFS condition means "on or after 1 March 2026"?', options: ['">=DATE(2026,3,1)"', '">="&DATE(2026,3,1)', '>=DATE(2026,3,1)', '"&>=DATE(2026,3,1)"'], answer: 1 },
  { id: 'pl-xl-i3', area: 'excel', tier: 'Intermediate', type: 'mc', concept: 'dynamic-arrays', prompt: '`=FILTER(A2:A50, B2:B50="West")` shows #SPILL!. The most likely cause?', options: ['No West rows', 'The cells below the formula are not empty', 'FILTER needs sorted data', 'The workbook is too big'], answer: 1 },
  { id: 'pl-xl-a1', area: 'excel', tier: 'Advanced', type: 'mc', concept: 'weighted-avg', prompt: 'A PivotTable shows "Average of UnitPrice" by category. The manager wants the average selling price per unit. What should you use instead?', options: ['Max of UnitPrice', 'Sum of Revenue ÷ Sum of Units (a weighted average)', 'Count of UnitPrice', 'The same average: it is correct'], answer: 1 },
  // SQL
  { id: 'pl-sql-b1', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'null', prompt: '300 orders have no promo code. `SELECT COUNT(*) FROM orders WHERE promo_code = NULL;` returns…', options: ['300', '0', 'An error', 'The rows with a promo code'], answer: 1 },
  { id: 'pl-sql-b2', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'having', prompt: 'You want only the regions with more than 100 customers. Which clause filters on the count?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1 },
  { id: 'pl-sql-b3', area: 'sql', tier: 'Beginner', type: 'mc', concept: 'count-distinct', prompt: 'Column x: 5, 5, NULL, 7, NULL. COUNT(*), COUNT(x), COUNT(DISTINCT x)?', options: ['5, 5, 3', '3, 3, 2', '5, 3, 2', '5, 3, 3'], answer: 2 },
  { id: 'pl-sql-i1', area: 'sql', tier: 'Intermediate', type: 'mc', concept: 'join-filter', prompt: "`FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_date >= '2026-01-01'`. Customers with no 2026 orders…", options: ['appear with NULLs', 'disappear: the WHERE turns it into an inner join', 'appear with their old orders', 'cause an error'], answer: 1 },
  { id: 'pl-sql-i2', area: 'sql', tier: 'Intermediate', type: 'mc', concept: 'fan-out', prompt: '`SELECT SUM(o.shipping_fee) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id;` The result is…', options: ['correct', 'too high: fees are counted once per item', 'too low', 'an error'], answer: 1 },
  { id: 'pl-sql-a1', area: 'sql', tier: 'Advanced', type: 'mc', concept: 'window-rank', prompt: 'Scores 100, 90, 90, 80 ranked descending with RANK()?', options: ['1, 2, 3, 4', '1, 2, 2, 3', '1, 2, 2, 4', '1, 1, 2, 3'], answer: 2 },
  // Data cleaning / Power Query
  { id: 'pl-pq-b1', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'pq-append', prompt: 'You have 12 monthly files with the same columns and want all rows in one table. In Power Query you use…', options: ['Merge', 'Append', 'Pivot', 'Group By'], answer: 1 },
  { id: 'pl-pq-b2', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'text-numbers', prompt: 'SUM over a quantity column gives less than you count by hand. Some cells show green triangles. Why?', options: ['SUM rounds the values it adds', 'Some quantities are stored as text and SUM skips them', 'Some rows are hidden by a filter', 'There are too many rows to add'], answer: 1 },
  { id: 'pl-pq-b3', area: 'pq', tier: 'Beginner', type: 'mc', concept: 'pq-robust', prompt: 'A query refreshed fine last month; now it fails with "column Qty not found". The usual culprit?', options: ['The version of Excel has been updated recently', 'A step (like Changed Type) that hard-codes a column name the source has renamed', 'There is too much data for it to load', 'The source file is open in Excel'], answer: 1 },
  // Analytical thinking
  { id: 'pl-th-1', area: 'think', tier: 'Beginner', type: 'mc', concept: 'pct-points', prompt: 'Conversion rose from 2.0% to 2.5%. Which is correct?', options: ['+0.5% relative', '+0.5 percentage points (+25% relative)', '+25 percentage points', '+2.5%'], answer: 1 },
  { id: 'pl-th-2', area: 'think', tier: 'Beginner', type: 'mc', concept: 'mean-median', prompt: 'Order values: 42, 38, 55, 47, 51, 39, 44, 2,450. The best "typical" value to report?', options: ['The mean (345.75)', 'The median (45.50), flagging the 2,450 order', '2,450', 'The total'], answer: 1 },
  { id: 'pl-th-3', area: 'think', tier: 'Beginner', type: 'mc', concept: 'data-trust', prompt: '"Sales increased 20% this month." Is that automatically good?', options: ['Yes, because growth is always a good thing to see', 'Not necessarily: check the season (vs last year), margin, one-off orders and the target', 'No: a 20% rise is too little to matter', 'Only if costs fell in the same month'], answer: 1 },
  { id: 'pl-th-4', area: 'think', tier: 'Beginner', type: 'mc', concept: 'chart-choice', prompt: 'Best default chart for monthly revenue over 24 months?', options: ['Pie', 'Line', 'Scatter', 'Radar'], answer: 1 },
];
