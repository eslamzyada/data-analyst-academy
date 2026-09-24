// SQL topics added by the content expansion. They slot into the existing path (see `after`).
// Every SQL task is graded by running the learner's query and comparing results with the answer.
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount_pct)';

export const SQL_EXTRA = [
  // ================================================================ CTEs in depth
  {
    id: 'sql-cte', skill: 'sql', level: 'Intermediate', title: 'CTEs: queries in readable steps', minutes: 18,
    prereqs: ['sql-subqueries'], after: 'sql-subqueries',
    summary: 'Break a hard question into named steps, fill gaps with a generated calendar, and test each step on its own.',
    lesson: `
### A CTE is a named step
\`\`\`sql
WITH order_totals AS (
  SELECT o.order_id, SUM(${NET}) AS value
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_id
)
SELECT ROUND(AVG(value), 2) FROM order_totals;
\`\`\`
The WITH block builds a small table (order_totals) that the final SELECT uses. Nothing is saved in the database.

### Several steps in a row
\`\`\`sql
WITH spend AS (…per customer…),
     ranked AS (SELECT *, NTILE(10) OVER (ORDER BY total DESC) AS decile FROM spend)
SELECT decile, COUNT(*), SUM(total) FROM ranked GROUP BY decile;
\`\`\`
Each step may use the ones before it. Name steps after what they contain (\`customer_spend\`, not \`t2\`).

### Why analysts like them
- **Readable:** the logic reads top to bottom, like a recipe.
- **Testable:** run \`SELECT * FROM spend LIMIT 10\` to check a step before building on it.
- **Reusable:** one step can be used twice in the final query (for example a total and its average).
- **Right grain:** aggregate to the level you need (per order, per customer) before the next step.

### A calendar without a calendar table
Reports need rows for days with no activity. A recursive CTE generates them:
\`\`\`sql
WITH RECURSIVE days(d) AS (
  SELECT '2026-08-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-08-31'
)
SELECT days.d, COUNT(w.waste_date)
FROM days LEFT JOIN waste_log w ON w.waste_date = days.d
GROUP BY days.d;
\`\`\`
The first SELECT is the starting row; the second adds a day until the condition stops it. The LEFT JOIN keeps quiet days with a count of 0.

### Headcount on a date
An employee is on the books on date D when \`hire_date <= D\` and (\`termination_date IS NULL\` or \`termination_date > D\`). CTEs make turnover calculations tidy: one step for headcount at the start and end, one for leavers, one for the rate.`,
    tryIt: {
      id: 'sql-cte-try', type: 'sql', kind: 'sql-writing', db: 'cedarline', difficulty: 2, concept: 'cte',
      prompt: `Using a CTE of **order totals** (${NET} per order, completed orders dated **2026** only), return the **average order value**, rounded to 2 decimals.`,
      answer: `WITH order_totals AS (SELECT o.order_id, SUM(${NET}) AS value FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.order_date >= '2026-01-01' GROUP BY o.order_id) SELECT ROUND(AVG(value), 2) FROM order_totals;`,
      traps: [{ sql: `SELECT ROUND(AVG(${NET}), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.order_date >= '2026-01-01';`, feedback: 'That is the average order line, not the average order. Total each order in the CTE first.' }],
      hints: ['Step 1: one row per order with its value. Step 2: average those values.'],
      explain: 'The CTE sets the grain to one row per order, so the average is per order: about 197.30.',
    },
    practice: [
      {
        id: 'sql-cte-p1', type: 'sql', db: 'cedarline', title: 'Big spenders in 2026', difficulty: 3, concept: 'cte', business: 'Retail', minutes: 12,
        prompt: `Marketing wants to know how many customers spent **more than 1,000** on **completed orders dated in 2026** (net revenue: ${NET}), and how much they spent in total. Return one row: the number of customers and their total spend (2 decimals). Ignore orders without a customer.`,
        answer: `WITH spend AS (SELECT o.customer_id, SUM(${NET}) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date >= '2026-01-01' GROUP BY o.customer_id) SELECT COUNT(*), ROUND(SUM(total), 2) FROM spend WHERE total > 1000;`,
        traps: [{ sql: `SELECT COUNT(*), ROUND(SUM(${NET}), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date >= '2026-01-01' AND ${NET} > 1000;`, feedback: 'That tests single order lines above 1,000. Total the spend per customer first, then compare.' }],
        hints: ['Step 1 (CTE): customer_id and total spend in 2026.', 'Step 2: WHERE total > 1000, then COUNT(*) and SUM(total).'],
        explain: '135 customers spent over 1,000 each in 2026, about 183,000 together. The threshold is applied to customer totals, which is only possible after the first step.',
      },
      {
        id: 'sql-cte-p2', type: 'sql', db: 'restaurant', title: 'A calendar for quiet days', difficulty: 3, concept: 'cte', business: 'Restaurant', minutes: 12, ordered: true,
        prompt: 'The Airport manager wants a chart of waste entries for **every day of August 2026**, including days with none. Return each date (2026-08-01 to 2026-08-31) and the number of waste_log entries for **restaurant_id 3** that day, in date order.',
        answer: "WITH RECURSIVE days(d) AS (SELECT '2026-08-01' UNION ALL SELECT date(d, '+1 day') FROM days WHERE d < '2026-08-31') SELECT days.d, COUNT(w.waste_date) FROM days LEFT JOIN waste_log w ON w.waste_date = days.d AND w.restaurant_id = 3 GROUP BY days.d ORDER BY days.d;",
        traps: [{ sql: "SELECT waste_date, COUNT(*) FROM waste_log WHERE restaurant_id = 3 AND waste_date BETWEEN '2026-08-01' AND '2026-08-31' GROUP BY waste_date ORDER BY waste_date;", feedback: 'That only lists days with entries. The chart needs all 31 days, with 0 on quiet days: generate the dates first.' }],
        hints: ['WITH RECURSIVE days(d) AS (SELECT \'2026-08-01\' UNION ALL SELECT date(d, \'+1 day\') FROM days WHERE d < \'2026-08-31\')', 'LEFT JOIN waste_log on the date, keep restaurant_id = 3 in the ON clause, and COUNT a waste_log column.'],
        explain: 'Waste is logged once a week, so most days show 0. Without the calendar, the chart would join the logging days together and hide that pattern.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'sql-cte-ch', type: 'sql', db: 'hr', title: 'Turnover by department, step by step', difficulty: 4, concept: 'cte', business: 'HR', minutes: 20, ordered: true,
      prompt: 'HR wants **voluntary turnover for 2025** per department. For each department **name**, return: headcount on **2025-01-01**, headcount on **2025-12-31**, **voluntary leavers** in 2025 (termination_date in 2025 and termination_type = \'Voluntary\'), and the **rate** = leavers ÷ ((start + end) ÷ 2) × 100, rounded to 1 decimal. Highest rate first. Someone is on the books on date D when hire_date <= D and (termination_date IS NULL or termination_date > D).',
      answer: "WITH counts AS (SELECT department_id, SUM(CASE WHEN hire_date <= '2025-01-01' AND (termination_date IS NULL OR termination_date > '2025-01-01') THEN 1 ELSE 0 END) AS start_hc, SUM(CASE WHEN hire_date <= '2025-12-31' AND (termination_date IS NULL OR termination_date > '2025-12-31') THEN 1 ELSE 0 END) AS end_hc, SUM(CASE WHEN termination_type = 'Voluntary' AND termination_date BETWEEN '2025-01-01' AND '2025-12-31' THEN 1 ELSE 0 END) AS leavers FROM employees GROUP BY department_id) SELECT d.name, c.start_hc, c.end_hc, c.leavers, ROUND(100.0 * c.leavers / ((c.start_hc + c.end_hc) / 2.0), 1) AS rate FROM counts c JOIN departments d ON d.department_id = c.department_id ORDER BY rate DESC;",
      traps: [{ sql: "WITH counts AS (SELECT department_id, SUM(CASE WHEN termination_date IS NULL THEN 1 ELSE 0 END) AS hc, SUM(CASE WHEN termination_type = 'Voluntary' AND termination_date BETWEEN '2025-01-01' AND '2025-12-31' THEN 1 ELSE 0 END) AS leavers FROM employees GROUP BY department_id) SELECT d.name, c.hc, c.hc, c.leavers, ROUND(100.0 * c.leavers / c.hc, 1) AS rate FROM counts c JOIN departments d ON d.department_id = c.department_id ORDER BY rate DESC;", feedback: 'Today\'s headcount is not the 2025 headcount. Count who was employed on each of the two dates.' }],
      hints: ['One CTE with three conditional counts per department_id: start headcount, end headcount, voluntary leavers.', 'Divide by 2.0 (not 2) so the average keeps its decimals, then join departments for the names.'],
      explain: 'Customer Service (about 41%) and Transport (about 39%) lose people at twice the rate of Operations. Writing the definition into the query makes the number reproducible for next year.',
    },
    cards: [
      { id: 'sql-cte-c1', front: 'Why use a CTE instead of a nested subquery?', back: 'Named steps that read top to bottom, can be tested one at a time, and can be reused in the final query.' },
      { id: 'sql-cte-c2', front: 'Generate every date of a month in SQLite?', back: 'WITH RECURSIVE days(d) AS (SELECT first_date UNION ALL SELECT date(d, \'+1 day\') FROM days WHERE d < last_date).' },
    ],
  },

  // ================================================================ text functions
  {
    id: 'sql-strings', skill: 'sql', level: 'Intermediate', title: 'Text functions & cleaning in SQL', minutes: 16,
    prereqs: ['sql-dates'], after: 'sql-dates',
    summary: 'Tidy, split and build text so that keys match and groups add up.',
    lesson: `
### The toolkit (SQLite names)
| Function | Does | Example |
|---|---|---|
| \`UPPER\`, \`LOWER\` | change case | \`LOWER(email)\` |
| \`TRIM\`, \`LTRIM\`, \`RTRIM\` | remove spaces at the ends | \`TRIM(city)\` |
| \`LENGTH\` | count characters | \`LENGTH(sku)\` |
| \`SUBSTR(text, start, length)\` | cut a piece (positions start at 1) | \`SUBSTR(sku, 1, 3)\` |
| \`INSTR(text, find)\` | position of the first match (0 if none) | \`INSTR(email, '@')\` |
| \`REPLACE(text, old, new)\` | swap every occurrence | \`REPLACE(phone, ' ', '')\` |
| \`||\` | join text | \`first_name || ' ' || last_name\` |
| \`printf\` | format numbers | \`printf('%.1f%%', rate)\` |

### Splitting on a separator
The part before a separator: \`SUBSTR(x, 1, INSTR(x, '-') - 1)\`.
The part after it: \`SUBSTR(x, INSTR(x, '@') + 1)\`.

### Clean before you compare
\`'Ana@Mail.example '\` and \`'ana@mail.example'\` are different values to a database. Joins, GROUP BY and DISTINCT all see them as two people. Clean the key in the same way on both sides:
\`\`\`sql
GROUP BY LOWER(TRIM(email))
\`\`\`
Count how many values the cleaning changes (\`WHERE email <> LOWER(TRIM(email))\`): it tells the data owner how big the problem is.

### Case and LIKE
In SQLite, \`=\` is case-sensitive, but \`LIKE\` ignores the case of plain letters. Other databases behave differently, so clean the text rather than rely on this.

### Building keys and labels
Concatenation builds codes (\`store_id || '-' || strftime('%Y-%m', order_date)\`) and readable labels. When building logins or IDs from names, check for collisions: two people called Ana Silva would get the same key.

### Text that should be numbers
Numbers stored as text sort as text (\`'100' < '25'\`). \`CAST(x AS REAL)\` converts them for sorting and maths.`,
    tryIt: {
      id: 'sql-strings-try', type: 'sql', kind: 'sql-writing', db: 'cedarline', difficulty: 2, concept: 'string-funcs',
      prompt: 'How many customer **emails change** when you apply LOWER(TRIM(email))? Return one number.',
      answer: 'SELECT COUNT(*) FROM customers WHERE email <> LOWER(TRIM(email));',
      traps: [{ sql: 'SELECT COUNT(*) FROM customers WHERE email <> LOWER(email);', feedback: 'That only finds capital letters. Stray spaces need TRIM too.' }],
      hints: ['Compare each email with its cleaned version.'],
      explain: '71 emails have capitals or stray spaces. Any join or duplicate check on email must use the cleaned version.',
    },
    practice: [
      {
        id: 'sql-strings-p1', type: 'sql', db: 'restaurant', title: 'What do invoice numbers say?', difficulty: 2, concept: 'string-funcs', business: 'Restaurant', minutes: 10,
        prompt: 'Invoice numbers look like "PM-20260702-DT". Finance believes the letters **before the first dash** identify the supplier. For each prefix, return the **prefix**, the **supplier name** and the **number of purchase lines**.',
        answer: "SELECT SUBSTR(p.invoice_no, 1, INSTR(p.invoice_no, '-') - 1) AS prefix, s.name, COUNT(*) FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id GROUP BY prefix, s.name;",
        traps: [{ sql: "SELECT SUBSTR(p.invoice_no, 1, 3) AS prefix, s.name, COUNT(*) FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id GROUP BY prefix, s.name;", feedback: 'Three characters include the dash ("PM-"). Cut at the dash\'s position instead.' }],
        hints: ['INSTR(invoice_no, \'-\') gives the dash position; SUBSTR from 1 to that position − 1 gives the prefix.', 'Group by the prefix and the supplier name: one row per pair.'],
        explain: 'Each of the 7 prefixes belongs to exactly one supplier (PM = Prime Meats, DV = Dairy Valley…), so the prefix is a safe fallback key when the supplier ID is missing.',
      },
      {
        id: 'sql-strings-p2', type: 'sql', db: 'hr', title: 'Will the new logins clash?', difficulty: 3, concept: 'string-funcs', business: 'HR', minutes: 10,
        prompt: 'IT plans logins in the form **first.last** in lower case. Among **current employees**, how many logins would be shared by two or more people, and how many people are affected? Return one row with both numbers.',
        answer: "SELECT COUNT(*), SUM(n) FROM (SELECT LOWER(first_name || '.' || last_name) AS login, COUNT(*) AS n FROM employees WHERE termination_date IS NULL GROUP BY login HAVING COUNT(*) > 1);",
        traps: [{ sql: "SELECT COUNT(*), SUM(n) FROM (SELECT LOWER(first_name || '.' || last_name) AS login, COUNT(*) AS n FROM employees GROUP BY login HAVING COUNT(*) > 1);", feedback: 'That includes former employees. Only current staff need logins.' }],
        hints: ['Build the login with LOWER(first_name || \'.\' || last_name) and group by it.', 'HAVING COUNT(*) > 1 keeps the clashes; wrap it to count them and add up the people.'],
        explain: '59 logins would be shared by 127 people, a quarter of the company: the naming rule needs a tie-breaker (for example a number) before launch.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'sql-strings-ch', type: 'sql', db: 'cedarline', title: 'Email quality report', difficulty: 3, concept: 'string-funcs', business: 'Marketing', minutes: 15,
      prompt: 'Before a campaign, return **one row** with four numbers about customer emails: emails containing **capital letters**, emails with **spaces at either end**, emails with **no @**, and the number of **different domains** (the part after @) once emails are lower-cased and trimmed.',
      answer: "SELECT SUM(CASE WHEN email <> LOWER(email) THEN 1 ELSE 0 END), SUM(CASE WHEN email <> TRIM(email) THEN 1 ELSE 0 END), SUM(CASE WHEN INSTR(email, '@') = 0 THEN 1 ELSE 0 END), COUNT(DISTINCT SUBSTR(LOWER(TRIM(email)), INSTR(LOWER(TRIM(email)), '@') + 1)) FROM customers;",
      traps: [{ sql: "SELECT SUM(CASE WHEN email <> LOWER(email) THEN 1 ELSE 0 END), SUM(CASE WHEN email <> TRIM(email) THEN 1 ELSE 0 END), SUM(CASE WHEN INSTR(email, '@') = 0 THEN 1 ELSE 0 END), COUNT(DISTINCT SUBSTR(email, INSTR(email, '@') + 1)) FROM customers;", feedback: 'Without cleaning, "Mailbox.example" and "mailbox.example " count as different domains. Clean before taking the domain.' }],
      hints: ['SUM(CASE WHEN … THEN 1 ELSE 0 END) counts rows that meet each test.', 'Domain: SUBSTR(clean_email, INSTR(clean_email, \'@\') + 1), with clean_email = LOWER(TRIM(email)).'],
      explain: '35 emails have capitals, 36 have stray spaces, none lacks an @, and there are only 5 real domains. The fixes are simple, but without them a campaign tool may reject or duplicate addresses.',
    },
    cards: [
      { id: 'sql-strings-c1', front: 'The text after the @ in SQLite?', back: 'SUBSTR(email, INSTR(email, \'@\') + 1)' },
      { id: 'sql-strings-c2', front: 'Two emails differ only by capitals and spaces. How do you group them together?', back: 'GROUP BY LOWER(TRIM(email)), and clean the same way on both sides of any join.' },
    ],
  },

  // ================================================================ segmentation
  {
    id: 'sql-segments', skill: 'sql', level: 'Advanced', title: 'Customer segments, Pareto & outliers', minutes: 20,
    prereqs: ['sql-cohorts'], after: 'sql-cohorts',
    summary: 'Group customers by behaviour, measure concentration, and flag unusual values with rules you can explain.',
    lesson: `
### Segments from behaviour
A segment is a rule that puts each customer in one group. Build it in two steps:
1. **One row per customer** with the measures you need (orders, spend, last order date).
2. **A CASE** that turns the measures into a label.

\`\`\`sql
WITH c AS (
  SELECT customer_id, COUNT(DISTINCT order_id) AS orders, SUM(value) AS spend, MAX(order_date) AS last_order
  FROM completed_orders GROUP BY customer_id
)
SELECT CASE WHEN orders = 1 THEN 'One-off' WHEN orders <= 3 THEN 'Occasional' ELSE 'Regular' END AS segment,
       COUNT(*), SUM(spend)
FROM c GROUP BY segment;
\`\`\`

### RFM
**R**ecency (days since last order), **F**requency (orders), **M**onetary (spend). Score each from 1 to 5 with \`NTILE(5) OVER (ORDER BY …)\` and combine. Keep the rules simple enough for marketing to act on.

### Concentration (Pareto)
\`NTILE(10) OVER (ORDER BY spend DESC)\` puts customers into deciles. The top decile's share of revenue tells you how dependent the business is on a few customers:
\`\`\`sql
SUM(CASE WHEN decile = 1 THEN spend END) * 100.0 / SUM(spend)
\`\`\`

### Lapsed customers
"Were regulars last year, have not ordered recently" is \`NOT EXISTS\` against recent orders. It turns an analysis into a list someone can call.

### Outliers in SQL
- **z-score:** \`(x − AVG(x) OVER ()) / stdev\`. SQLite has no STDEV, but \`sqrt(AVG(x*x) − AVG(x)*AVG(x))\` gives the population standard deviation.
- **Compared with a typical value:** \`x > 3 * AVG(x) OVER (PARTITION BY store)\`.
- **Context first:** a seasonal business flags every summer day against a yearly average. Compare with the same weekday, month or season before calling something unusual.

### Report segments honestly
Show the size of each segment, the rule that defines it, and the date it was calculated. Segments move as customers do.`,
    tryIt: {
      id: 'sql-segments-try', type: 'sql', kind: 'sql-writing', db: 'cedarline', difficulty: 3, concept: 'segmentation',
      prompt: `For **completed 2025** orders (customers only), put each customer in a band by number of orders: "1 order", "2-3 orders" or "4+ orders". Return the band, the number of customers and their revenue (${NET}, 2 decimals).`,
      answer: `WITH c AS (SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS orders, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id) SELECT CASE WHEN orders = 1 THEN '1 order' WHEN orders <= 3 THEN '2-3 orders' ELSE '4+ orders' END AS band, COUNT(*), ROUND(SUM(spend), 2) FROM c GROUP BY band;`,
      traps: [{ sql: `WITH c AS (SELECT o.customer_id, COUNT(*) AS orders, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id) SELECT CASE WHEN orders = 1 THEN '1 order' WHEN orders <= 3 THEN '2-3 orders' ELSE '4+ orders' END AS band, COUNT(*), ROUND(SUM(spend), 2) FROM c GROUP BY band;`, feedback: 'COUNT(*) counts order lines after the join. Use COUNT(DISTINCT o.order_id).' }],
      hints: ['Step 1: one row per customer with COUNT(DISTINCT order_id) and spend.', 'Step 2: a CASE on the order count, then GROUP BY the band.'],
      explain: 'The 295 customers with 4+ orders spent almost as much as the 729 with 2 to 3 orders: frequency matters more than headcount.',
    },
    practice: [
      {
        id: 'sql-segments-p1', type: 'sql', db: 'cedarline', title: 'How concentrated is revenue?', difficulty: 4, concept: 'segmentation', business: 'Retail', minutes: 15,
        prompt: `Using **completed 2025** orders (customers only, ${NET}), split customers into 10 groups by spend with NTILE(10), biggest spenders in group 1. Return one row: the **share of revenue** from group 1 (%, 2 decimals) and the **number of customers** in group 1.`,
        answer: `WITH c AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id), d AS (SELECT *, NTILE(10) OVER (ORDER BY spend DESC) AS decile FROM c) SELECT ROUND(100.0 * SUM(CASE WHEN decile = 1 THEN spend END) / SUM(spend), 2), SUM(CASE WHEN decile = 1 THEN 1 ELSE 0 END) FROM d;`,
        traps: [{ sql: `WITH c AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id), d AS (SELECT *, NTILE(10) OVER (ORDER BY spend) AS decile FROM c) SELECT ROUND(100.0 * SUM(CASE WHEN decile = 1 THEN spend END) / SUM(spend), 2), SUM(CASE WHEN decile = 1 THEN 1 ELSE 0 END) FROM d;`, feedback: 'Without DESC, group 1 holds the smallest spenders.' }],
        hints: ['CTE 1: spend per customer. CTE 2: NTILE(10) OVER (ORDER BY spend DESC).', 'Share = SUM(spend in group 1) × 100 ÷ SUM(all spend).'],
        explain: 'The top 10% of customers (206 people) bring in about 35% of revenue: important, but not a dangerous dependence on a handful of buyers.',
      },
      {
        id: 'sql-segments-p2', type: 'sql', db: 'hr', title: 'Does heavy overtime go with absence?', difficulty: 4, concept: 'segmentation', business: 'HR', minutes: 15,
        prompt: 'For **2025** attendance, total each employee\'s overtime_hours, days_absent and scheduled_days. Put employees into 10 groups by overtime (most overtime = group 1). Return two rows, **"Top 10%"** and **"Rest"**, with the number of employees and the **absence rate** (days absent ÷ scheduled days × 100, 2 decimals).',
        answer: "WITH t AS (SELECT employee_id, SUM(overtime_hours) AS ot, SUM(days_absent) AS absent, SUM(scheduled_days) AS scheduled FROM attendance_monthly WHERE month LIKE '2025%' GROUP BY employee_id), d AS (SELECT *, NTILE(10) OVER (ORDER BY ot DESC) AS decile FROM t) SELECT CASE WHEN decile = 1 THEN 'Top 10%' ELSE 'Rest' END AS grp, COUNT(*), ROUND(100.0 * SUM(absent) / SUM(scheduled), 2) FROM d GROUP BY grp;",
        traps: [{ sql: "WITH t AS (SELECT employee_id, SUM(overtime_hours) AS ot, SUM(days_absent) AS absent, SUM(scheduled_days) AS scheduled FROM attendance_monthly WHERE month LIKE '2025%' GROUP BY employee_id), d AS (SELECT *, NTILE(10) OVER (ORDER BY ot DESC) AS decile FROM t) SELECT CASE WHEN decile = 1 THEN 'Top 10%' ELSE 'Rest' END AS grp, COUNT(*), ROUND(AVG(100.0 * absent / scheduled), 2) FROM d GROUP BY grp;", feedback: 'Averaging personal rates weights part-year staff like full-year staff. Build the rate from the group totals.' }],
        hints: ['CTE 1: totals per employee for 2025. CTE 2: NTILE(10) by overtime, descending.', 'Label with CASE, then build the rate from SUM(absent) and SUM(scheduled).'],
        explain: 'The heaviest overtime group is absent 7.86% of scheduled days against 4.78% for everyone else. That is an association, not proof that overtime causes absence, but it is worth raising with operations.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'sql-segments-ch', type: 'sql', db: 'cedarline', title: 'Regulars who went quiet', difficulty: 4, concept: 'segmentation', business: 'Retail', minutes: 20,
      prompt: `A win-back campaign targets **2025 regulars**: customers with **3 or more completed orders in 2025**. How many of them have **no completed order on or after 2026-05-01**, and how much did those customers spend in 2025 (${NET}, 2 decimals)? Return one row.`,
      answer: `WITH regulars AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id HAVING COUNT(DISTINCT o.order_id) >= 3) SELECT COUNT(*), ROUND(SUM(spend), 2) FROM regulars r WHERE NOT EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id = r.customer_id AND o2.status = 'completed' AND o2.order_date >= '2026-05-01');`,
      traps: [{ sql: `WITH regulars AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id HAVING COUNT(*) >= 3) SELECT COUNT(*), ROUND(SUM(spend), 2) FROM regulars r WHERE NOT EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id = r.customer_id AND o2.status = 'completed' AND o2.order_date >= '2026-05-01');`, feedback: 'COUNT(*) counts order lines, so customers with one big order look like regulars. Count distinct orders.' }],
      hints: ['CTE: 2025 customers with HAVING COUNT(DISTINCT order_id) >= 3, keeping their spend.', 'Then NOT EXISTS a completed order from 2026-05-01 onwards.'],
      explain: 'Half of the 526 regulars (267) have gone quiet since May; they spent about 210,000 in 2025. That is a concrete call list, and a number worth tracking every month.',
    },
    cards: [
      { id: 'sql-segments-c1', front: 'Share of revenue from the top 10% of customers?', back: 'NTILE(10) OVER (ORDER BY spend DESC) in a CTE, then SUM(spend in decile 1) × 100 ÷ SUM(spend).' },
      { id: 'sql-segments-c2', kind: 'scenario', front: 'A daily-orders outlier rule flags every summer day. What went wrong?', back: 'The comparison ignores seasonality. Compare with the same weekday or month, not the yearly average.' },
    ],
  },
];
