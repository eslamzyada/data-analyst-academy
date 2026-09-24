// SQL: Beginner -> Intermediate -> Advanced. Every task is graded by running the learner's
// query against the practice database and comparing results with the reference query.
// Dialect: SQLite (dates are 'YYYY-MM-DD' text).

const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount_pct)';

export const SQL_TOPICS = [
  // =========================================================================== BEGINNER
  {
    id: 'sql-select', skill: 'sql', level: 'Beginner', title: 'SELECT, ORDER BY & LIMIT', minutes: 10, prereqs: [],
    summary: 'Ask a database for exactly the columns you need, in the order you want.',
    lesson: `
### What is SQL?
A database stores tables (like Excel sheets that never get messy). SQL is how you ask it questions. Every query starts the same way:

\`\`\`sql
SELECT column1, column2      -- which columns
FROM table_name              -- which table
ORDER BY column1 DESC        -- sort (optional)
LIMIT 10;                    -- only the first 10 rows (optional)
\`\`\`

### Example (Cedarline retail database)
\`\`\`sql
SELECT product_name, category, list_price
FROM products
ORDER BY list_price DESC
LIMIT 5;
\`\`\`
→ the 5 most expensive products.

### Useful extras
- \`SELECT *\` → all columns (fine for exploring, avoid in reports)
- **Aliases** rename a column: \`list_price - unit_cost AS margin\`
- **Arithmetic:** \`quantity * unit_price\`
- \`DISTINCT\` → each value once: \`SELECT DISTINCT category FROM products\`
- \`ORDER BY\` is ascending by default; add \`DESC\` for largest first. Sort by several columns: \`ORDER BY region, list_price DESC\`
- In SQL Server, \`LIMIT 5\` is written \`SELECT TOP 5 …\`

### Try it in the SQL Lab
Open **SQL Lab**, pick *Cedarline*, click a table to see its columns, and run \`SELECT * FROM stores;\`

### Common mistakes
- Commas: between columns yes, after the last column no.
- Text values need single quotes ('West'); column names don't.
- Forgetting ORDER BY when you want "the top 5": without it, LIMIT returns 5 random-ish rows.`,
    tryIt: {
      id: 'sql-select-try', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'select-basics', ordered: true,
      prompt: 'List every store\'s **store_name** and **region**, sorted by store name (A to Z).',
      starter: 'SELECT \nFROM stores\n',
      answer: 'SELECT store_name, region FROM stores ORDER BY store_name;',
      hints: ['You need two columns from the stores table.', 'SELECT store_name, region FROM stores ORDER BY store_name;'],
      explain: 'SELECT picks the columns, FROM picks the table, ORDER BY sorts (ascending by default).',
    },
    practice: [
      { id: 'sql-select-p1', type: 'sql', db: 'cedarline', title: 'Most expensive products', difficulty: 1, concept: 'select-basics', ordered: true, business: 'Retail', minutes: 5,
        prompt: 'Merchandising wants the **5 most expensive products**: product_name, category and list_price, most expensive first.',
        answer: 'SELECT product_name, category, list_price FROM products ORDER BY list_price DESC LIMIT 5;',
        traps: [{ sql: 'SELECT product_name, category, list_price FROM products ORDER BY list_price LIMIT 5;', feedback: 'These are the 5 CHEAPEST. ORDER BY sorts ascending unless you add DESC.', mistake: 'Sorted ascending instead of descending', concept: 'select-basics' }],
        hints: ['Sort by list_price, largest first, then keep 5 rows.', 'ORDER BY list_price DESC LIMIT 5'],
        explain: 'ORDER BY … DESC puts the largest first; LIMIT 5 keeps the top five.' },
      { id: 'sql-select-p2', type: 'sql', db: 'cedarline', title: 'Unit margin', difficulty: 2, concept: 'select-basics', ordered: true, business: 'Retail', minutes: 6,
        prompt: 'Show the **5 products with the highest margin per unit**. Return product_name, list_price, unit_cost and a column **margin** = list_price − unit_cost, highest margin first.',
        answer: 'SELECT product_name, list_price, unit_cost, list_price - unit_cost AS margin FROM products ORDER BY margin DESC LIMIT 5;',
        hints: ['You can calculate in SELECT: list_price - unit_cost AS margin', 'You can ORDER BY the alias: ORDER BY margin DESC LIMIT 5'],
        explain: 'Calculated columns + aliases are the SQL version of a helper column in Excel.' },
      { id: 'sql-select-p3', type: 'sql', db: 'cedarline', title: 'Product categories', difficulty: 1, concept: 'select-basics', business: 'Retail', minutes: 3,
        prompt: 'List the **different product categories** (each category once).',
        answer: 'SELECT DISTINCT category FROM products;',
        traps: [{ sql: 'SELECT category FROM products;', feedback: 'You listed the category of every product (with repeats). DISTINCT returns each value once.', mistake: 'Forgot DISTINCT', concept: 'select-basics' }],
        hints: ['One keyword removes repeated values.', 'SELECT DISTINCT category FROM products;'], explain: 'DISTINCT removes duplicate rows from the result.' },
    ],
    quiz: [
      { id: 'sql-select-q1', type: 'mc', difficulty: 1, concept: 'select-basics', prompt: 'Which query returns the 3 newest customers by signup_date?', options: ['SELECT * FROM customers LIMIT 3;', 'SELECT * FROM customers ORDER BY signup_date LIMIT 3;', 'SELECT * FROM customers ORDER BY signup_date DESC LIMIT 3;', 'SELECT TOP 3 FROM customers;'], answer: 2, explain: 'Newest = latest dates first = DESC, then LIMIT 3.' },
      { id: 'sql-select-q2', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'select-basics', ordered: true, prompt: 'Show the **2 most recently opened stores**: store_name and opened_on, newest first.', answer: 'SELECT store_name, opened_on FROM stores ORDER BY opened_on DESC LIMIT 2;', explain: 'ORDER BY opened_on DESC LIMIT 2 → Canyon, then Harborview.' },
      { id: 'sql-select-q3', type: 'tf', difficulty: 1, concept: 'select-basics', prompt: 'True or false: ORDER BY sorts from largest to smallest by default.', answer: false, explain: 'Ascending (smallest first) is the default. Add DESC for largest first.' },
      { id: 'sql-select-q4', type: 'mc', difficulty: 2, concept: 'select-basics', prompt: 'In SQL Server you write `SELECT TOP 10 ...`. What is the SQLite / PostgreSQL / MySQL equivalent?', options: ['FIRST 10', '... LIMIT 10', 'ROWNUM 10', 'SELECT 10 ...'], answer: 1, explain: 'LIMIT 10 goes at the very end, after ORDER BY, so you take the first ten rows of a sorted result. Without ORDER BY, "the first ten" means nothing in particular.' },
      { id: 'sql-select-q5', type: 'fill', difficulty: 1, concept: 'select-basics', prompt: 'Complete: `SELECT ______ region FROM customers;` returns each region only once.', answer: ['DISTINCT', 'distinct'], explain: 'SELECT DISTINCT region FROM customers; gives one row per different region. DISTINCT applies to the whole selected row, not just the first column.' },
    ],
    challenge: {
      id: 'sql-select-ch', type: 'sql', db: 'restaurant', title: 'Menu price list', difficulty: 2, concept: 'select-basics', ordered: true, business: 'Restaurant', minutes: 6,
      context: 'Olive & Ember\'s new menu designer wants the current menu, grouped by category, with the priciest dish first inside each category.',
      prompt: 'Return **category, name and current_price** from menu_items, sorted by **category (A–Z)**, then by **price (highest first)**.',
      answer: 'SELECT category, name, current_price FROM menu_items ORDER BY category, current_price DESC;',
      hints: ['ORDER BY can take several columns, separated by commas.', 'ORDER BY category, current_price DESC'],
      explain: 'Sorting by several columns: the first decides, the second breaks ties inside each category.',
    },
    cards: [
      { id: 'sql-select-c1', front: 'The order of clauses you write in a basic query?', back: 'SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT' },
      { id: 'sql-select-c2', front: 'What does DISTINCT do?', back: 'Removes duplicate rows from the result, so each combination appears once.' },
    ],
  },

  {
    id: 'sql-where', skill: 'sql', level: 'Beginner', title: 'Filtering with WHERE', minutes: 12, prereqs: ['sql-select'],
    summary: 'Keep only the rows you need: AND, OR, IN, BETWEEN, LIKE and NULL.',
    lesson: `
### WHERE keeps rows that pass a test
\`\`\`sql
SELECT customer_id, full_name, region
FROM customers
WHERE region = 'West' AND signup_date >= '2026-01-01';
\`\`\`

### The toolkit
| You want | Write |
|---|---|
| equal / not equal | \`= 'West'\`, \`<> 'West'\` |
| numbers | \`list_price > 150\`, \`quantity >= 2\` |
| one of a list | \`region IN ('North','South')\` |
| a range (inclusive) | \`order_date BETWEEN '2025-01-01' AND '2025-12-31'\` |
| text pattern | \`product_name LIKE '%Tent%'\` (% = anything) |
| missing values | \`region IS NULL\`, \`region IS NOT NULL\` |

### AND / OR and brackets
\`AND\` is evaluated before \`OR\`. So this is wrong:
\`\`\`sql
WHERE region = 'North' OR region = 'South' AND channel = 'Online'
\`\`\`
It means *North (any channel)* OR *South Online*. Use brackets, or IN:
\`\`\`sql
WHERE region IN ('North','South') AND channel = 'Online'
\`\`\`

### NULL is special
NULL means "unknown", so \`region = NULL\` is never true, not even for NULL rows. Always write \`IS NULL\`.

### Dates in this app
Dates are stored as text 'YYYY-MM-DD', so comparisons like \`>= '2026-01-01'\` work correctly.`,
    tryIt: {
      id: 'sql-where-try', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'where-logic',
      prompt: 'Find customers from the **West** region who **signed up in 2026**: customer_id, full_name, signup_date.',
      starter: 'SELECT customer_id, full_name, signup_date\nFROM customers\nWHERE ',
      answer: "SELECT customer_id, full_name, signup_date FROM customers WHERE region = 'West' AND signup_date >= '2026-01-01';",
      hints: ['Two conditions joined with AND.', "WHERE region = 'West' AND signup_date >= '2026-01-01'"],
      explain: 'Dates in YYYY-MM-DD text compare correctly as text, so >= \'2026-01-01\' means "in 2026 or later".',
    },
    practice: [
      { id: 'sql-where-p1', type: 'sql', db: 'cedarline', title: 'Active premium footwear', difficulty: 1, concept: 'where-logic', business: 'Retail', minutes: 5,
        prompt: 'Merchandising wants every **active Footwear** product with a **list price above 150**: sku, product_name, list_price.',
        answer: "SELECT sku, product_name, list_price FROM products WHERE category = 'Footwear' AND is_active = 1 AND list_price > 150;",
        hints: ['Three conditions: category, is_active (1 = active) and price.', "WHERE category = 'Footwear' AND is_active = 1 AND list_price > 150"], explain: 'is_active is stored as 1/0. Four products match.' },
      { id: 'sql-where-p2', type: 'sql', db: 'cedarline', title: 'Customers with no region', difficulty: 2, concept: 'null', business: 'Retail', minutes: 5,
        prompt: 'Data quality check: list customers whose **region is missing**: customer_id, full_name, city.',
        answer: 'SELECT customer_id, full_name, city FROM customers WHERE region IS NULL;',
        traps: [{ sql: 'SELECT customer_id, full_name, city FROM customers WHERE region = NULL;', feedback: 'region = NULL is never true in SQL (NULL means unknown). Use IS NULL.', mistake: 'Used = NULL instead of IS NULL', concept: 'null' }],
        hints: ['Missing values are NULL.', 'WHERE region IS NULL'], explain: '75 customers. Notice they still have a city: you could often recover the region from it.' },
      { id: 'sql-where-p3', type: 'sql', db: 'cedarline', title: 'Pending online orders', difficulty: 2, concept: 'where-logic', business: 'E-commerce', minutes: 5,
        prompt: 'Operations wants all **Online** orders from **August 2026** that are still **pending**: order_id, order_date, customer_id.',
        answer: "SELECT order_id, order_date, customer_id FROM orders WHERE channel = 'Online' AND status = 'pending' AND order_date BETWEEN '2026-08-01' AND '2026-08-31';",
        hints: ['Three conditions: channel, status and a date range.', "BETWEEN '2026-08-01' AND '2026-08-31' includes both ends."], explain: 'These 28 orders are revenue that is not booked yet, which matters when someone asks for "August revenue".' },
      { id: 'sql-where-p4', type: 'sql', db: 'cedarline', title: 'Everything called "Tent"', difficulty: 1, concept: 'like-in-between', business: 'Retail', minutes: 3,
        prompt: 'List every product whose **name contains "Tent"**: sku, product_name.',
        answer: "SELECT sku, product_name FROM products WHERE product_name LIKE '%Tent%';",
        hints: ['Use LIKE with % wildcards on both sides.', "WHERE product_name LIKE '%Tent%'"], explain: '% matches any characters, so %Tent% means "Tent anywhere in the name".' },
    ],
    quiz: [
      { id: 'sql-where-q1', type: 'mc', difficulty: 2, concept: 'null', prompt: '300 orders have no promo code. What does `SELECT COUNT(*) FROM orders WHERE promo_code = NULL;` return?', options: ['300', '0', 'An error', 'The number of orders WITH a promo code'], answer: 1, explain: 'NULL means "unknown", and nothing equals an unknown, so = NULL is never true and you get 0 rows rather than an error. Use IS NULL (and IS NOT NULL).' },
      { id: 'sql-where-q2', type: 'mc', difficulty: 3, concept: 'where-logic', prompt: "`WHERE region = 'North' OR region = 'South' AND channel = 'Online'` returns…", options: ['Online orders from North or South', 'All North orders plus Online South orders', 'Only Online orders', 'An error'], answer: 1, explain: 'AND binds tighter than OR. Use brackets or IN: region IN (\'North\',\'South\') AND channel = \'Online\'.' },
      { id: 'sql-where-q3', type: 'tf', difficulty: 1, concept: 'like-in-between', prompt: "True or false: `BETWEEN 10 AND 20` includes 10 and 20.", answer: true, explain: 'BETWEEN includes both ends, so it is the same as x >= 10 AND x <= 20. Careful with dates and times: BETWEEN two dates misses anything timed later on the last day.' },
      { id: 'sql-where-q4', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'like-in-between', prompt: 'List the **employee_id and full_name** of employees who work at store **N01 or S01** (use IN).', answer: "SELECT employee_id, full_name FROM employees WHERE store_id IN ('N01','S01');", explain: "IN is shorthand for a chain of ORs: store_id = 'N01' OR store_id = 'S01'. It stays readable as the list grows, and it avoids the AND/OR bracket traps." },
      { id: 'sql-where-q5', type: 'mc', difficulty: 2, concept: 'like-in-between', prompt: "Which pattern finds emails ending in '.example'?", options: ["LIKE '.example'", "LIKE '%.example'", "LIKE '.example%'", "= '%.example'"], answer: 1, explain: "'%.example' = anything, then .example at the end. LIKE is needed for wildcards; = compares literally." },
    ],
    challenge: {
      id: 'sql-where-ch', type: 'sql', db: 'cedarline', title: 'Campaign audience', difficulty: 3, concept: 'where-logic', business: 'Marketing', minutes: 8,
      context: 'Marketing is planning a campaign for people who came through paid channels in the North and South last year.',
      prompt: 'Return customer_id, full_name, region and acquisition_channel for customers in the **North or South**, acquired through **Paid Social or Referral**, who **signed up in 2025**.',
      answer: "SELECT customer_id, full_name, region, acquisition_channel FROM customers WHERE region IN ('North','South') AND acquisition_channel IN ('Paid Social','Referral') AND signup_date BETWEEN '2025-01-01' AND '2025-12-31';",
      traps: [{ sql: "SELECT customer_id, full_name, region, acquisition_channel FROM customers WHERE region = 'North' OR region = 'South' AND acquisition_channel IN ('Paid Social','Referral') AND signup_date BETWEEN '2025-01-01' AND '2025-12-31';", feedback: 'AND is evaluated before OR, so this returns every North customer (any channel, any year) plus the correct South ones. Use IN, or put the OR in brackets.', mistake: 'OR without brackets', concept: 'where-logic' }],
      hints: ['Three groups of conditions. Two of them are "one of a list".', "region IN ('North','South') AND acquisition_channel IN ('Paid Social','Referral') AND signup_date BETWEEN …"],
      explain: 'IN keeps each list together, so there is no AND/OR precedence trap.',
    },
    cards: [
      { id: 'sql-where-c1', front: 'How do you test for a missing value?', back: 'column IS NULL (never = NULL).' },
      { id: 'sql-where-c2', kind: 'debug', front: "Why does `WHERE a = 1 OR b = 2 AND c = 3` surprise people?", back: 'AND runs before OR, so it means a = 1 OR (b = 2 AND c = 3). Add brackets.' },
    ],
  },

  {
    id: 'sql-aggregate', skill: 'sql', level: 'Beginner', title: 'COUNT, SUM, AVG, MIN, MAX', minutes: 10, prereqs: ['sql-where'],
    summary: 'Turn thousands of rows into one number: totals, averages and counts.',
    lesson: `
### Aggregate functions
| Function | Returns |
|---|---|
| \`COUNT(*)\` | number of rows |
| \`COUNT(column)\` | rows where that column is **not NULL** |
| \`COUNT(DISTINCT column)\` | number of different values |
| \`SUM(x)\`, \`AVG(x)\` | total, mean (NULLs are ignored) |
| \`MIN(x)\`, \`MAX(x)\` | smallest, largest (works on dates too) |

\`\`\`sql
SELECT COUNT(*) AS orders, MIN(order_date) AS first, MAX(order_date) AS last
FROM orders
WHERE status = 'completed';
\`\`\`

### The three COUNTs
Column x holds 5, 5, NULL, 7, NULL:
- \`COUNT(*)\` = 5 (rows)
- \`COUNT(x)\` = 3 (non-NULL values)
- \`COUNT(DISTINCT x)\` = 2 (5 and 7)

### Rounding and integer division
- \`ROUND(AVG(x), 2)\`
- In SQLite, PostgreSQL and SQL Server, \`7 / 2\` = **3** when both sides are integers. For a rate, multiply by 1.0 first: \`SUM(returned) * 1.0 / SUM(sold)\`.

### Averages can mislead
\`AVG(unit_price)\` over order lines is a *simple* average. It ignores quantities. The real average price per unit is \`SUM(revenue) / SUM(quantity)\`.`,
    tryIt: {
      id: 'sql-aggregate-try', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'aggregates',
      prompt: 'How many rows are in the **orders** table?',
      answer: 'SELECT COUNT(*) FROM orders;', hints: ['COUNT(*) counts rows.'], explain: 'COUNT(*) counts rows, including ones with NULLs: 11,550 orders in total. That is every status, so completed, cancelled and pending are all in there.',
    },
    practice: [
      { id: 'sql-aggregate-p1', type: 'sql', db: 'cedarline', title: '2026 refunds', difficulty: 1, concept: 'aggregates', business: 'Retail', minutes: 4,
        prompt: 'Finance wants two numbers for **returns dated in 2026**: the **number of return events** and the **total refund amount**.',
        answer: "SELECT COUNT(*) AS return_events, ROUND(SUM(refund_amount), 2) AS refunded FROM returns WHERE return_date >= '2026-01-01';",
        hints: ['COUNT(*) and SUM(refund_amount), filtered with WHERE.', "WHERE return_date >= '2026-01-01'"], explain: 'Both aggregates are calculated over the same filtered rows.' },
      { id: 'sql-aggregate-p2', type: 'sql', db: 'cedarline', title: 'Unique buyers in 2025', difficulty: 2, concept: 'count-distinct', business: 'Retail', minutes: 5,
        prompt: 'How many **different customers** placed at least one **completed** order in **2025**?',
        answer: "SELECT COUNT(DISTINCT customer_id) FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-12-31';",
        traps: [{ sql: "SELECT COUNT(customer_id) FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-12-31';", feedback: 'That counts ORDERS that have a customer, not different customers. Use COUNT(DISTINCT customer_id).', mistake: 'COUNT instead of COUNT(DISTINCT)', concept: 'count-distinct' },
          { sql: "SELECT COUNT(*) FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-12-31';", feedback: 'That counts orders. The question asks for different customers: COUNT(DISTINCT customer_id).', mistake: 'Counted rows instead of distinct customers', concept: 'count-distinct' }],
        hints: ['Several orders can belong to the same customer.', 'COUNT(DISTINCT customer_id). NULLs (walk-ins) are ignored automatically.'], explain: 'COUNT(DISTINCT …) ignores NULLs, so anonymous walk-in orders are not counted as a customer.' },
      { id: 'sql-aggregate-p3', type: 'sql', db: 'cedarline', title: 'Shipping fees 2025', difficulty: 2, concept: 'aggregates', business: 'E-commerce', minutes: 5,
        prompt: 'For **completed Online** orders in **2025**: the **total shipping fees** charged and the **average fee per order** (round both to 2 decimals).',
        answer: "SELECT ROUND(SUM(shipping_fee), 2) AS total_fees, ROUND(AVG(shipping_fee), 2) AS avg_fee FROM orders WHERE status = 'completed' AND channel = 'Online' AND order_date BETWEEN '2025-01-01' AND '2025-12-31';",
        hints: ['SUM and AVG on shipping_fee with three filters.'], explain: 'The average includes orders that shipped free (fee 0), so it is well below 7.99.' },
    ],
    quiz: [
      { id: 'sql-aggregate-q1', type: 'mc', difficulty: 2, concept: 'count-distinct', prompt: 'Column x holds 5, 5, NULL, 7, NULL. What do COUNT(*), COUNT(x) and COUNT(DISTINCT x) return?', options: ['5, 5, 3', '3, 3, 2', '5, 3, 2', '5, 3, 3'], answer: 2, explain: 'Rows = 5; non-NULL = 3; distinct non-NULL values = 2.' },
      { id: 'sql-aggregate-q2', type: 'mc', difficulty: 3, concept: 'integer-division', prompt: 'What does `SELECT 45 / 60;` return in SQLite (and SQL Server/PostgreSQL)?', options: ['0.75', '0', '1', 'An error'], answer: 1, explain: 'Integer ÷ integer = integer. Write 45 * 1.0 / 60 (or CAST) to get 0.75.' },
      { id: 'sql-aggregate-q3', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'aggregates', prompt: 'Return the **first and last order_date** in the orders table (two columns).', answer: 'SELECT MIN(order_date), MAX(order_date) FROM orders;', explain: 'MIN and MAX work on dates and text, not only numbers. Checking the first and last date is the quickest way to see what period a table actually covers.' },
      { id: 'sql-aggregate-q4', type: 'tf', difficulty: 2, concept: 'aggregates', prompt: 'True or false: AVG(x) counts NULL values as zero.', answer: false, explain: 'NULLs are ignored: the average is over non-NULL values only. Use COALESCE(x, 0) if NULL really means 0.' },
      { id: 'sql-aggregate-q5', type: 'sql', db: 'hr', difficulty: 2, concept: 'aggregates', prompt: 'In the HR database: the **average current_salary of current employees** (termination_date IS NULL), rounded to 0 decimals.', answer: 'SELECT ROUND(AVG(current_salary), 0) FROM employees WHERE termination_date IS NULL;', explain: 'Current employees are those with no termination date.' },
    ],
    challenge: {
      id: 'sql-aggregate-ch', type: 'sql', db: 'restaurant', title: 'July in numbers', difficulty: 3, concept: 'weighted-avg', crossConcept: true, business: 'Restaurant', minutes: 8,
      context: 'The owner of Olive & Ember wants three July 2026 numbers across all restaurants: net sales, items sold, and the true average price per item sold.',
      prompt: 'From daily_sales for **July 2026**, return **total net_sales**, **total qty_sold**, and **average net price per item** = total net sales ÷ total quantity (2 decimals).',
      answer: "SELECT ROUND(SUM(net_sales), 2) AS net_sales, SUM(qty_sold) AS items, ROUND(SUM(net_sales) * 1.0 / SUM(qty_sold), 2) AS avg_price FROM daily_sales WHERE sale_date BETWEEN '2026-07-01' AND '2026-07-31';",
      traps: [{ sql: "SELECT ROUND(SUM(net_sales), 2), SUM(qty_sold), ROUND(AVG(unit_price), 2) FROM daily_sales WHERE sale_date BETWEEN '2026-07-01' AND '2026-07-31';", feedback: 'AVG(unit_price) is a simple average of rows: a row selling 2 espressos weighs as much as a row selling 90 burgers. The real average price is SUM(net_sales) / SUM(qty_sold).', mistake: 'Used a simple average instead of a weighted one', concept: 'weighted-avg' }],
      hints: ['The average price per item must be weighted by quantity.', 'SUM(net_sales) * 1.0 / SUM(qty_sold)'],
      explain: 'Ratios should be built from totals. It is the same lesson as the Excel weighted average, in SQL.',
    },
    cards: [
      { id: 'sql-aggregate-c1', front: 'COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)?', back: 'All rows · rows where col is not NULL · number of different non-NULL values.' },
      { id: 'sql-aggregate-c2', front: 'How do you avoid integer division for a rate?', back: 'Multiply by 1.0 (or CAST to a decimal) before dividing: SUM(a) * 1.0 / SUM(b).' },
    ],
  },

  {
    id: 'sql-groupby', skill: 'sql', level: 'Beginner', title: 'GROUP BY & HAVING', minutes: 12, prereqs: ['sql-aggregate'],
    summary: 'One number per group: per region, per month, per product.',
    lesson: `
### GROUP BY
GROUP BY splits the rows into groups; the aggregate is calculated for each group.

\`\`\`sql
SELECT channel, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
GROUP BY channel;
\`\`\`
| channel | orders |
|---|---|
| In-Store | … |
| Online | … |

**Rule:** every column in SELECT must either be in GROUP BY or be inside an aggregate.

### HAVING filters groups
- \`WHERE\` filters **rows**, before grouping
- \`HAVING\` filters **groups**, after aggregating

\`\`\`sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
HAVING COUNT(*) > 250;
\`\`\`

### How the database runs a query
\`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT\`
That's why you can't use a SELECT alias in WHERE (it doesn't exist yet), but you can in ORDER BY.

### Common mistakes
- \`WHERE COUNT(*) > 5\` → error. Use HAVING.
- Grouping by a NULLable column: NULL becomes its own group (often useful as "Unknown").`,
    tryIt: {
      id: 'sql-groupby-try', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'group-by',
      prompt: 'How many **completed** orders did each **channel** take in **2025**? Return channel and the count.',
      answer: "SELECT channel, COUNT(*) AS orders FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY channel;",
      hints: ['Filter with WHERE first, then GROUP BY channel.', "SELECT channel, COUNT(*) FROM orders WHERE status = 'completed' AND order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY channel;"],
      explain: 'WHERE picks the rows first, then GROUP BY makes one row per channel: In-Store 2,221 and Online 2,312 completed orders in 2025.',
    },
    practice: [
      { id: 'sql-groupby-p1', type: 'sql', db: 'cedarline', title: 'Customers per region', difficulty: 1, concept: 'group-by', business: 'Retail', minutes: 4,
        prompt: 'Count **customers per region**. Keep the group of customers with no region (it shows as NULL).',
        answer: 'SELECT region, COUNT(*) AS customers FROM customers GROUP BY region;',
        hints: ['GROUP BY region; NULL becomes its own group automatically.'], explain: 'NULL region forms its own group of 75 customers. Worth reporting as "Unknown".' },
      { id: 'sql-groupby-p2', type: 'sql', db: 'restaurant', title: 'Sales by restaurant', difficulty: 2, concept: 'group-by', ordered: true, business: 'Restaurant', minutes: 5,
        prompt: 'Total **net_sales per restaurant_id** in **2025**, highest first (round to 2 decimals).',
        answer: "SELECT restaurant_id, ROUND(SUM(net_sales), 2) AS net_sales FROM daily_sales WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY restaurant_id ORDER BY net_sales DESC;",
        hints: ['Filter the year, group by restaurant_id, then order by the sum.'], explain: 'Downtown (1) sells the most. You will add the restaurant names with a JOIN in the next level.' },
      { id: 'sql-groupby-p3', type: 'sql', db: 'cedarline', title: 'Big cities', difficulty: 2, concept: 'having', business: 'Retail', minutes: 5,
        prompt: 'Which **cities have more than 280 customers**? Return city and the number of customers.',
        answer: 'SELECT city, COUNT(*) AS customers FROM customers GROUP BY city HAVING COUNT(*) > 280;',
        traps: [{ sql: 'SELECT city, COUNT(*) FROM customers GROUP BY city;', feedback: 'You listed every city. Add HAVING COUNT(*) > 280 to keep only the big ones.', mistake: 'Forgot HAVING', concept: 'having' }],
        hints: ['Filtering on a count happens after grouping.', 'HAVING COUNT(*) > 280'], explain: 'HAVING filters groups after the counts are known.' },
    ],
    quiz: [
      { id: 'sql-groupby-q1', type: 'mc', difficulty: 2, concept: 'having', prompt: 'In what order does the database logically evaluate these clauses?', options: ['SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → GROUP BY → WHERE → HAVING → SELECT → ORDER BY', 'FROM → SELECT → WHERE → GROUP BY → ORDER BY → HAVING', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY'], answer: 3, explain: 'FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. That is why SELECT aliases can be used in ORDER BY but not in WHERE.' },
      { id: 'sql-groupby-q2', type: 'mc', difficulty: 2, concept: 'having', prompt: 'You want regions with more than 1,000 customers. Which is right?', options: ['WHERE COUNT(*) > 1000', 'HAVING COUNT(*) > 1000', 'GROUP BY COUNT(*) > 1000', 'ORDER BY COUNT(*) > 1000'], answer: 1, explain: 'WHERE filters rows before grouping, so it cannot see COUNT(*) yet. Conditions on an aggregate belong in HAVING, which runs after the groups are formed.' },
      { id: 'sql-groupby-q3', type: 'sql', db: 'cedarline', difficulty: 1, concept: 'group-by', prompt: 'Count orders per **status** (all orders). Return status and the count.', answer: 'SELECT status, COUNT(*) FROM orders GROUP BY status;', explain: 'Three groups: completed, cancelled, pending.' },
      { id: 'sql-groupby-q4', type: 'tf', difficulty: 2, concept: 'group-by', prompt: 'True or false: in standard SQL, every non-aggregated column in SELECT must appear in GROUP BY.', answer: true, explain: 'True in standard SQL (SQL Server and PostgreSQL enforce it). SQLite is lenient, but don\'t rely on that.' },
      { id: 'sql-groupby-q5', type: 'sql', db: 'hr', difficulty: 2, concept: 'group-by', ordered: true, prompt: 'HR database: number of **voluntary leavers per year** (year of termination_date), oldest year first. Tip: substr(termination_date, 1, 4) gives the year.', answer: "SELECT substr(termination_date, 1, 4) AS yr, COUNT(*) FROM employees WHERE termination_type = 'Voluntary' GROUP BY yr ORDER BY yr;", explain: 'Group by the year part of the date, and filter on the type with WHERE.' },
    ],
    challenge: {
      id: 'sql-groupby-ch', type: 'sql', db: 'hr', title: 'Department pay overview', difficulty: 3, concept: 'having', ordered: true, business: 'HR', minutes: 8,
      context: 'The HR director wants to compare pay across the larger departments.',
      prompt: 'For **current employees** only, return department_id, the **number of employees**, and their **average current_salary** (rounded to 0 decimals), **only for departments with at least 15 current employees**, highest average first.',
      answer: 'SELECT department_id, COUNT(*) AS employees, ROUND(AVG(current_salary), 0) AS avg_salary FROM employees WHERE termination_date IS NULL GROUP BY department_id HAVING COUNT(*) >= 15 ORDER BY avg_salary DESC;',
      traps: [
        { sql: 'SELECT department_id, COUNT(*), ROUND(AVG(current_salary), 0) AS a FROM employees GROUP BY department_id HAVING COUNT(*) >= 15 ORDER BY a DESC;', feedback: 'This includes people who have left. Current employees have termination_date IS NULL (a WHERE condition).', mistake: 'Included former employees', concept: 'null' },
        { sql: 'SELECT department_id, COUNT(*), ROUND(AVG(current_salary), 0) AS a FROM employees WHERE termination_date IS NULL GROUP BY department_id ORDER BY a DESC;', feedback: 'All departments are listed. Keep only groups with 15+ employees using HAVING.', mistake: 'Forgot HAVING', concept: 'having' },
      ],
      hints: ['WHERE filters people (current only); HAVING filters departments (15+).', 'WHERE termination_date IS NULL … GROUP BY department_id HAVING COUNT(*) >= 15 ORDER BY … DESC'],
      explain: 'WHERE and HAVING in one query: rows first, groups second.',
    },
    cards: [
      { id: 'sql-groupby-c1', front: 'WHERE vs HAVING?', back: 'WHERE filters rows before grouping. HAVING filters groups after aggregation (e.g. HAVING SUM(x) > 1000).' },
      { id: 'sql-groupby-c2', kind: 'debug', front: 'Why does `WHERE revenue > 100` fail when revenue is a SELECT alias?', back: 'WHERE runs before SELECT, so the alias doesn\'t exist yet. Repeat the expression, or use a subquery/CTE.' },
    ],
  },

  {
    id: 'sql-case', skill: 'sql', level: 'Beginner', title: 'CASE & handling NULLs', minutes: 10, prereqs: ['sql-groupby'],
    summary: 'IF-logic inside SQL: build bands and labels, and replace NULLs.',
    lesson: `
### CASE is SQL's IF
\`\`\`sql
SELECT product_name, list_price,
       CASE WHEN list_price >= 200 THEN 'Premium'
            WHEN list_price >= 50  THEN 'Mid'
            ELSE 'Budget' END AS price_band
FROM products;
\`\`\`
The conditions are checked **in order**; the first true one wins. Without ELSE, unmatched rows get NULL.

### Group by a CASE
\`\`\`sql
SELECT CASE WHEN list_price >= 200 THEN 'Premium' ELSE 'Other' END AS band, COUNT(*)
FROM products
GROUP BY band;
\`\`\`

### COALESCE: replace NULLs
\`COALESCE(acquisition_channel, 'Unknown')\` returns the first non-NULL value. It's great for labels and for "NULL means 0": \`COALESCE(refund, 0)\`.

### Counting with CASE (a preview of "conditional aggregation")
\`\`\`sql
SELECT status,
       SUM(CASE WHEN channel = 'Online' THEN 1 ELSE 0 END) AS online,
       SUM(CASE WHEN channel = 'In-Store' THEN 1 ELSE 0 END) AS in_store
FROM orders GROUP BY status;
\`\`\``,
    tryIt: {
      id: 'sql-case-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'case',
      prompt: 'For every product return product_name, list_price and **price_band**: "Premium" (200 or more), "Mid" (50 or more) or "Budget".',
      answer: "SELECT product_name, list_price, CASE WHEN list_price >= 200 THEN 'Premium' WHEN list_price >= 50 THEN 'Mid' ELSE 'Budget' END AS price_band FROM products;",
      hints: ['CASE WHEN … THEN … WHEN … THEN … ELSE … END', 'Check the highest band first.'], explain: 'The order of the WHENs matters, just like nested IFs in Excel.',
    },
    practice: [
      { id: 'sql-case-p1', type: 'sql', db: 'cedarline', title: 'Products per price band', difficulty: 2, concept: 'case', business: 'Retail', minutes: 5,
        prompt: 'Count the products in each price band (Premium ≥ 200, Mid ≥ 50, Budget). Return band and count.',
        answer: "SELECT CASE WHEN list_price >= 200 THEN 'Premium' WHEN list_price >= 50 THEN 'Mid' ELSE 'Budget' END AS band, COUNT(*) FROM products GROUP BY band;",
        hints: ['Group by the CASE expression (or its alias).'], explain: 'You can GROUP BY a calculated column. That is how analysts create segments.' },
      { id: 'sql-case-p2', type: 'sql', db: 'cedarline', title: 'Acquisition channels, including unknown', difficulty: 2, concept: 'null', business: 'Marketing', minutes: 4,
        prompt: 'Count customers per acquisition channel, showing missing channels as **"Unknown"**. Return channel and count.',
        answer: "SELECT COALESCE(acquisition_channel, 'Unknown') AS channel, COUNT(*) FROM customers GROUP BY channel;",
        hints: ["COALESCE(acquisition_channel, 'Unknown')"], explain: '250 customers have no channel recorded. Labelling them makes the gap visible.' },
      { id: 'sql-case-p3', type: 'sql', db: 'cedarline', title: 'Channel mix per status', difficulty: 3, concept: 'conditional-agg', business: 'E-commerce', minutes: 6,
        prompt: 'For each order **status**, count **Online** orders and **In-Store** orders in two separate columns.',
        answer: "SELECT status, SUM(CASE WHEN channel = 'Online' THEN 1 ELSE 0 END) AS online, SUM(CASE WHEN channel = 'In-Store' THEN 1 ELSE 0 END) AS in_store FROM orders GROUP BY status;",
        hints: ['SUM(CASE WHEN channel = \'Online\' THEN 1 ELSE 0 END) counts Online rows.'], explain: 'Pending orders are all Online; cancellations happen more online.' },
    ],
    quiz: [
      { id: 'sql-case-q1', type: 'mc', difficulty: 2, concept: 'case', prompt: 'A CASE has no ELSE and no WHEN matches a row. What is returned?', options: ['0', "''", 'NULL', 'An error'], answer: 2, explain: 'Unmatched rows get NULL. Add ELSE for a default.' },
      { id: 'sql-case-q2', type: 'fill', difficulty: 1, concept: 'null', prompt: 'Which function returns the first non-NULL value in its list? (one word)', answer: ['COALESCE', 'coalesce'], explain: 'COALESCE(a, b, c). In SQL Server ISNULL(a, b) works for two values.' },
      { id: 'sql-case-q3', type: 'sql', db: 'hr', difficulty: 2, concept: 'case', prompt: 'HR database: count current employees (termination_date IS NULL) by hire period: "Before 2020", "2020-2022", "2023-2024", "2025-2026". Return the period label and the count. Tip: substr(hire_date,1,4) is the year.', answer: "SELECT CASE WHEN substr(hire_date,1,4) < '2020' THEN 'Before 2020' WHEN substr(hire_date,1,4) <= '2022' THEN '2020-2022' WHEN substr(hire_date,1,4) <= '2024' THEN '2023-2024' ELSE '2025-2026' END AS period, COUNT(*) FROM employees WHERE termination_date IS NULL GROUP BY period;", explain: 'Because the year is text, compare it with text (\'2020\'), or CAST it to an integer.' },
      { id: 'sql-case-q4', type: 'tf', difficulty: 2, concept: 'case', prompt: "True or false: in `CASE WHEN x >= 50 THEN 'Mid' WHEN x >= 200 THEN 'Premium' END`, a value of 300 gets 'Premium'.", answer: false, explain: 'The first true WHEN wins: 300 >= 50 is true, so it gets \'Mid\'. Test the highest band first.' },
    ],
    challenge: {
      id: 'sql-case-ch', type: 'sql', db: 'cedarline', title: 'Discount depth', difficulty: 3, concept: 'case', business: 'Retail', minutes: 8,
      context: 'The pricing manager wants to know how much revenue comes from discounted sales in 2025.',
      prompt: 'For **completed 2025** order lines, group them by discount depth: "No discount" (0), "Up to 15%" (above 0 up to 0.15), "Deep" (above 0.15). Return the band, the number of lines and the net revenue (quantity × unit_price × (1 − discount_pct), 2 decimals). Join order_items to orders to get status and date.',
      answer: `SELECT CASE WHEN oi.discount_pct = 0 THEN 'No discount' WHEN oi.discount_pct <= 0.15 THEN 'Up to 15%' ELSE 'Deep' END AS band, COUNT(*) AS lines, ROUND(SUM(${NET}), 2) AS net_revenue FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY band;`,
      hints: ['You need orders for the status and date: JOIN orders o ON o.order_id = oi.order_id', 'Group by a CASE on oi.discount_pct; sum the net revenue expression.'],
      explain: 'Segmenting by a CASE and then aggregating is one of the most common analyst queries. (Your first JOIN: more on those in the next level.)',
    },
    cards: [
      { id: 'sql-case-c1', front: 'Replace NULL with "Unknown" in SQL?', back: "COALESCE(column, 'Unknown')" },
      { id: 'sql-case-c2', front: 'Count rows meeting a condition inside a GROUP BY?', back: 'SUM(CASE WHEN condition THEN 1 ELSE 0 END)' },
    ],
  },

  // =========================================================================== INTERMEDIATE
  {
    id: 'sql-joins', skill: 'sql', level: 'Intermediate', title: 'INNER JOIN & LEFT JOIN', minutes: 15, prereqs: ['sql-groupby', 'sql-case'],
    summary: 'Combine tables, and keep (or deliberately drop) rows with no match.',
    lesson: `
### Why joins?
Data lives in separate tables: orders don't store product names, products don't store sales. A JOIN matches rows using a key.

\`\`\`sql
SELECT o.order_id, o.order_date, s.store_name
FROM orders o
JOIN stores s ON s.store_id = o.store_id;
\`\`\`
\`o\` and \`s\` are **aliases**: short names for the tables.

### INNER JOIN vs LEFT JOIN
- **INNER JOIN** (or just JOIN): only rows that match in **both** tables.
- **LEFT JOIN**: **every** row from the left table, plus the matches (NULLs where there's no match).

"A manager wants **every customer, including those who never ordered**" → customers LEFT JOIN orders.

### Finding rows with no match
\`\`\`sql
SELECT c.customer_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;        -- no order matched
\`\`\`

### The #1 LEFT JOIN trap
\`\`\`sql
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-01-01'   -- ✗ removes customers with no 2026 orders
\`\`\`
A filter on the right table in WHERE throws away the NULL rows, turning it back into an inner join. Put the condition **in the ON clause** instead:
\`\`\`sql
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.order_date >= '2026-01-01'
\`\`\``,
    tryIt: {
      id: 'sql-joins-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'inner-join',
      prompt: 'List **In-Store** orders from **2026-08-01**: order_id, order_date and the **store_name**.',
      answer: "SELECT o.order_id, o.order_date, s.store_name FROM orders o JOIN stores s ON s.store_id = o.store_id WHERE o.order_date = '2026-08-01';",
      hints: ['orders has store_id; stores has store_name.', "FROM orders o JOIN stores s ON s.store_id = o.store_id WHERE o.order_date = '2026-08-01'"],
      explain: 'Online orders have no store_id, so an inner join to stores naturally keeps only In-Store orders.',
    },
    practice: [
      { id: 'sql-joins-p1', type: 'sql', db: 'cedarline', title: 'Revenue by category 2025', difficulty: 2, concept: 'inner-join', business: 'Retail', minutes: 8,
        prompt: 'Net revenue by **product category** for **completed** orders in **2025** (quantity × unit_price × (1 − discount_pct), 2 decimals). Return category and revenue.',
        answer: `SELECT p.category, ROUND(SUM(${NET}), 2) AS revenue FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.category;`,
        traps: [{ sql: `SELECT p.category, ROUND(SUM(${NET}), 2) FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.category;`, feedback: 'Close, but you included cancelled orders. Revenue only counts status = \'completed\'.', mistake: 'Included cancelled orders in revenue', concept: 'where-logic' }],
        hints: ['Three tables: order_items (amounts) → orders (status, date) → products (category).', 'Join both, filter status and dates, GROUP BY p.category.'], explain: 'Joining a fact table (order lines) to its descriptions (orders, products) and grouping is the bread and butter of analytics.' },
      { id: 'sql-joins-p2', type: 'sql', db: 'cedarline', title: 'Signed up, never bought', difficulty: 3, concept: 'anti-join', business: 'Marketing', minutes: 8,
        prompt: '**How many customers signed up in 2025 but have never placed an order** (of any status)? Return one number.',
        answer: "SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE c.signup_date BETWEEN '2025-01-01' AND '2025-12-31' AND o.order_id IS NULL;",
        traps: [{ sql: "SELECT COUNT(*) FROM customers c WHERE c.signup_date BETWEEN '2025-01-01' AND '2025-12-31' AND c.customer_id NOT IN (SELECT customer_id FROM orders);", feedback: '0 can\'t be right. orders.customer_id contains NULLs (walk-in sales), and NOT IN with a NULL in the list is never true. Use LEFT JOIN … IS NULL, or NOT EXISTS. (An INNER JOIN also returns 0: it can\'t find rows without a match.)', mistake: 'NOT IN over a column with NULLs', concept: 'not-in-null' }],
        hints: ['LEFT JOIN orders and keep the customers where no order matched.', 'WHERE … AND o.order_id IS NULL'], explain: '194 people signed up and never bought: a re-engagement campaign audience.' },
      { id: 'sql-joins-p3', type: 'sql', db: 'cedarline', title: 'Employees and their managers', difficulty: 3, concept: 'left-join', business: 'HR', minutes: 7,
        prompt: 'HR wants every employee next to their **manager\'s name**: employee_id, full_name, manager_name. People with **no manager must still appear**.',
        answer: 'SELECT e.employee_id, e.full_name, m.full_name AS manager_name FROM employees e LEFT JOIN employees m ON m.employee_id = e.manager_id;',
        traps: [{ sql: 'SELECT e.employee_id, e.full_name, m.full_name FROM employees e JOIN employees m ON m.employee_id = e.manager_id;', feedback: 'An INNER JOIN drops the Head of Retail, who has no manager. The task says everyone must appear: use LEFT JOIN.', mistake: 'Used INNER JOIN when LEFT JOIN was required', concept: 'left-join' }],
        hints: ['Join the employees table to itself: e for the employee, m for the manager.', 'LEFT JOIN employees m ON m.employee_id = e.manager_id'], explain: 'A self-join treats one table as two. LEFT keeps the person with no manager.' },
    ],
    quiz: [
      { id: 'sql-joins-q1', type: 'mc', difficulty: 3, concept: 'join-filter', prompt: "`FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_date >= '2026-01-01'`. What happens to customers with no 2026 orders?", options: ['They appear once with NULL order columns', 'They disappear: the WHERE turns it into an inner join', 'They appear with all their older orders', 'An error'], answer: 1, explain: 'Their order columns are NULL, and NULL >= date is not true, so they are filtered out. Move the condition into ON.' },
      { id: 'sql-joins-q2', type: 'mc', difficulty: 2, concept: 'left-join', prompt: 'A manager wants EVERY customer, including customers who never ordered, with their order count. Which join?', options: ['INNER JOIN customers to orders', 'customers LEFT JOIN orders', 'orders LEFT JOIN customers', 'CROSS JOIN'], answer: 1, explain: 'Keep all rows of the table you must not lose (customers) on the LEFT.' },
      { id: 'sql-joins-q3', type: 'sql', db: 'restaurant', difficulty: 2, concept: 'inner-join', prompt: 'Restaurant database: total **net_sales per restaurant name** for **2025** (join daily_sales to restaurants). Return name and net sales.', answer: "SELECT r.name, ROUND(SUM(d.net_sales), 2) FROM daily_sales d JOIN restaurants r ON r.restaurant_id = d.restaurant_id WHERE d.sale_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY r.name;", explain: 'JOIN on restaurant_id, group by the name.' },
      { id: 'sql-joins-q4', type: 'tf', difficulty: 2, concept: 'inner-join', prompt: 'True or false: JOIN without the word INNER is an inner join.', answer: true, explain: 'Plain JOIN means INNER JOIN: only rows that match on both sides survive. Writing INNER in full is worth the extra word when LEFT JOINs are nearby.' },
      { id: 'sql-joins-q5', type: 'mc', difficulty: 2, concept: 'anti-join', prompt: 'After a LEFT JOIN, how do you keep only left rows that had NO match?', options: ['WHERE right.key = NULL', 'WHERE right.key IS NULL', 'HAVING COUNT(*) = 0', 'WHERE left.key IS NULL'], answer: 1, explain: 'Unmatched rows have NULLs in every right-table column. Test the right table\'s key with IS NULL.' },
    ],
    challenge: {
      id: 'sql-joins-ch', type: 'sql', db: 'restaurant', title: 'Waste by ingredient (July 2026)', difficulty: 4, concept: 'join-filter', business: 'Restaurant', minutes: 10,
      context: 'The head chef wants a list of **every ingredient** and how much of it was logged as waste in July 2026. Ingredients with no July waste must show 0, so nothing is overlooked.',
      prompt: 'Return ingredient **name** and **total waste qty in July 2026** (0 if none), for every ingredient.',
      answer: "SELECT i.name, COALESCE(SUM(w.qty), 0) AS july_waste FROM ingredients i LEFT JOIN waste_log w ON w.ingredient_id = i.ingredient_id AND w.waste_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY i.ingredient_id, i.name;",
      traps: [{ sql: "SELECT i.name, COALESCE(SUM(w.qty), 0) FROM ingredients i LEFT JOIN waste_log w ON w.ingredient_id = i.ingredient_id WHERE w.waste_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY i.ingredient_id, i.name;", feedback: 'The date filter in WHERE removes every ingredient with no July waste, so your LEFT JOIN became an inner join. Move the date condition into the ON clause.', mistake: 'Filtered the right table in WHERE after a LEFT JOIN', concept: 'join-filter' }],
      hints: ['Every ingredient must appear: ingredients LEFT JOIN waste_log.', 'Put the July condition in the ON clause, not in WHERE. COALESCE(SUM(...), 0) turns NULL into 0.'],
      explain: 'Conditions on the right-hand table of a LEFT JOIN belong in ON. It is the most common join bug in real reports.',
    },
    cards: [
      { id: 'sql-joins-c1', front: 'What is a LEFT JOIN?', back: 'Returns every row from the left table plus matching rows from the right; where there is no match, the right-table columns are NULL.' },
      { id: 'sql-joins-c2', kind: 'scenario', front: 'A manager wants every customer, including those who never ordered. Which join do you consider?', back: 'customers LEFT JOIN orders. And any filter on orders goes in the ON clause.' },
      { id: 'sql-joins-c3', kind: 'debug', front: 'Your LEFT JOIN returns the same rows as an INNER JOIN. Why?', back: 'Probably a WHERE condition on the right table removes the NULL (unmatched) rows. Move it into ON.' },
    ],
  },

  {
    id: 'sql-multijoins', skill: 'sql', level: 'Intermediate', title: 'Multiple joins & join traps', minutes: 15, prereqs: ['sql-joins'],
    summary: 'Chain several tables without duplicating rows, and fix broken reports.',
    lesson: `
### Chaining joins
\`\`\`sql
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
LEFT JOIN stores s ON s.store_id = o.store_id
\`\`\`
Start from the table whose **grain** (one row per…) you want to count, and join the descriptions onto it.

### Fan-out: the silent killer
\`orders\` has one row per order (with \`shipping_fee\`); \`order_items\` has several rows per order. After joining them, each order appears once **per item**:
\`\`\`sql
SELECT SUM(o.shipping_fee)          -- ✗ counted once per item
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id;
\`\`\`
**Fix:** aggregate at the right grain *before* joining, or take the header totals from the header table alone.

The same happens with \`returns\`: some lines were returned in two events, so joining returns duplicates those lines.

### Check your joins
- Count rows before and after each join. If the count grows unexpectedly, you have fan-out.
- Ask: "what is one row of my result?"

### Anti-joins
"Products never sold": \`LEFT JOIN … WHERE oi.order_item_id IS NULL\`, or \`WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id)\`.`,
    tryIt: {
      id: 'sql-multijoins-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'anti-join',
      prompt: 'Which products have **never been sold**? Return sku and product_name.',
      answer: 'SELECT p.sku, p.product_name FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id WHERE oi.order_item_id IS NULL;',
      hints: ['products LEFT JOIN order_items, then keep rows with no match.', 'WHERE oi.order_item_id IS NULL, or NOT EXISTS (…).'],
      explain: 'Three products, all launching 2026-09-01: a legitimate reason. Always check WHY before reporting "never sold".',
    },
    practice: [
      { id: 'sql-multijoins-p1', type: 'sql', db: 'cedarline', title: 'Revenue and shipping in one row', difficulty: 3, concept: 'fan-out', business: 'E-commerce', minutes: 10,
        prompt: 'Finance wants, for **completed Online orders in 2025**, two numbers in one row: **merchandise revenue** (from order lines) and **shipping fees** (from orders). Round both to 2 decimals.',
        answer: `SELECT (SELECT ROUND(SUM(${NET}), 2) FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'completed' AND o.channel = 'Online' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31') AS merchandise, (SELECT ROUND(SUM(shipping_fee), 2) FROM orders WHERE status = 'completed' AND channel = 'Online' AND order_date BETWEEN '2025-01-01' AND '2025-12-31') AS shipping;`,
        traps: [{ sql: `SELECT ROUND(SUM(${NET}), 2), ROUND(SUM(o.shipping_fee), 2) FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'completed' AND o.channel = 'Online' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31';`, feedback: 'Merchandise is right, but shipping is inflated: after joining order_items, each order\'s fee is counted once per item (fan-out). Sum shipping from orders alone.', mistake: 'Summed an order-level field after joining line items (fan-out)', concept: 'fan-out' }],
        hints: ['Revenue lives on order lines; shipping lives on orders (once per order).', 'Calculate them separately (two subqueries, or two CTEs) so shipping is not multiplied by the number of lines.'], explain: 'Never sum a header-level field (shipping, order total) after joining a line-level table. Aggregate each at its own grain.' },
      { id: 'sql-multijoins-p2', type: 'sql', db: 'cedarline', title: 'Return rate by category', difficulty: 4, concept: 'fan-out', business: 'Retail', minutes: 12,
        prompt: 'For items sold in **2025** (completed orders): return **category, units_sold, units_returned, return_rate_pct** (units returned whenever the return happened ÷ units sold × 100, 1 decimal), highest rate first.',
        ordered: true,
        answer: `WITH sold AS (SELECT oi.order_item_id, p.category, oi.quantity FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31'), ret AS (SELECT order_item_id, SUM(quantity_returned) AS units_returned FROM returns GROUP BY order_item_id) SELECT s.category, SUM(s.quantity) AS units_sold, COALESCE(SUM(r.units_returned), 0) AS units_returned, ROUND(100.0 * COALESCE(SUM(r.units_returned), 0) / SUM(s.quantity), 1) AS return_rate_pct FROM sold s LEFT JOIN ret r ON r.order_item_id = s.order_item_id GROUP BY s.category ORDER BY return_rate_pct DESC;`,
        traps: [{ sql: "SELECT p.category, SUM(oi.quantity), COALESCE(SUM(r.quantity_returned), 0), ROUND(100.0 * COALESCE(SUM(r.quantity_returned), 0) / SUM(oi.quantity), 1) AS rt FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id LEFT JOIN returns r ON r.order_item_id = oi.order_item_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.category ORDER BY rt DESC;", feedback: 'Units sold are inflated: lines returned in two separate events appear twice after the join (fan-out). Here the rates barely change, which is exactly why this bug survives in real reports. Aggregate returns per line first, then join.', mistake: 'Joined a one-to-many table before aggregating (fan-out)', concept: 'fan-out' }],
        hints: ['A line can have 2 return rows. Sum returns per order_item_id first.', 'Two CTEs: sold lines (with category), returns per line; then LEFT JOIN them and group by category.'], explain: 'Footwear (13.8%) and Apparel (11.3%) lead, mostly "Wrong size". Correct logic matters even when the numbers look similar.' },
    ],
    quiz: [
      { id: 'sql-multijoins-q1', type: 'mc', difficulty: 3, concept: 'fan-out', prompt: '`SELECT SUM(o.shipping_fee) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id;` The result is…', options: ['Correct', 'Too high: each fee is counted once per item', 'Too low', 'An error'], answer: 1, explain: 'Fan-out: the order row is repeated for each of its items.' },
      { id: 'sql-multijoins-q2', type: 'mc', difficulty: 2, concept: 'fan-out', prompt: 'What is the quickest way to detect fan-out?', options: ['Check the row count before and after each join', 'Add DISTINCT to the SELECT list and compare', 'Sort the results and look for repeated keys', 'Switch the join to a RIGHT JOIN instead'], answer: 0, explain: 'If a join multiplies rows unexpectedly, the grain changed. (DISTINCT often hides the problem instead of fixing it.)' },
      { id: 'sql-multijoins-q3', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'anti-join', prompt: 'Find **orders that have no order lines at all** (a data-quality check): order_id, status.', answer: 'SELECT o.order_id, o.status FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.order_id);', explain: '12 orders, 4 of them "completed" with a shipping fee charged. Worth raising with the systems team.' },
    ],
    challenge: {
      id: 'sql-multijoins-ch', type: 'sql', db: 'cedarline', title: 'Fix the regional revenue report', difficulty: 4, concept: 'fan-out', business: 'Retail', minutes: 20,
      context: `Regional managers say the "2025 revenue by region" report doesn't match their own figures. The report runs this query:

\`\`\`sql
SELECT c.region,
       SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)) + SUM(o.shipping_fee) AS revenue
FROM orders o
JOIN customers c    ON c.customer_id = o.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
WHERE o.order_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY c.region;
\`\`\`

Company rules: revenue = net merchandise revenue of **completed** orders (no shipping, before returns). **Region** = the store's region for In-Store orders, the customer's region for Online orders; unknown regions should be labelled 'Unknown'.`,
      prompt: 'Write the **corrected query**: region and revenue (2 decimals) for 2025.',
      answer: `SELECT COALESCE(CASE WHEN o.channel = 'In-Store' THEN s.region ELSE c.region END, 'Unknown') AS region, ROUND(SUM(${NET}), 2) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN stores s ON s.store_id = o.store_id LEFT JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY 1;`,
      traps: [
        { sql: "SELECT c.region, SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)) + SUM(o.shipping_fee) FROM orders o JOIN customers c ON c.customer_id = o.customer_id JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN returns r ON r.order_item_id = oi.order_item_id WHERE o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY c.region;", feedback: 'That is the original broken query. Problems: cancelled orders included, shipping added (and multiplied per item), the returns join duplicates lines, walk-ins dropped by the inner join to customers, and region taken from the customer for In-Store sales.', mistake: 'Did not fix the report query', concept: 'fan-out' },
        { sql: `SELECT COALESCE(c.region, 'Unknown'), ROUND(SUM(${NET}), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY 1;`, feedback: 'Much better, but In-Store sales must be credited to the STORE\'s region, not the customer\'s home region. Join stores and pick the region with CASE on channel.', mistake: 'Used the customer region for store sales', concept: 'case' },
      ],
      hints: ['List the problems first: status filter? shipping? the returns join? walk-ins (customer_id NULL)? where does region come from?', 'LEFT JOIN both stores and customers; region = CASE WHEN channel = \'In-Store\' THEN s.region ELSE c.region END, wrapped in COALESCE(…, \'Unknown\').'],
      explain: 'The broken query is wrong in BOTH directions: cancellations and shipping inflate it, while dropping walk-ins deflates it. That\'s why the total looked plausible. Correct: West 251,994.85 · South 220,545.85 · North 220,299.65 · East 160,762.30 · Unknown 8,002.15.',
    },
    cards: [
      { id: 'sql-multijoins-c1', front: 'What is fan-out?', back: 'A join to a one-to-many table repeats the "one" rows, so their fields get counted multiple times in SUM/COUNT.' },
      { id: 'sql-multijoins-c2', front: 'Two ways to find rows with no match?', back: 'LEFT JOIN … WHERE right.key IS NULL, or WHERE NOT EXISTS (SELECT 1 FROM right WHERE …).' },
    ],
  },

  {
    id: 'sql-subqueries', skill: 'sql', level: 'Intermediate', title: 'Subqueries & CTEs', minutes: 15, prereqs: ['sql-joins'],
    summary: 'Build a query in steps: calculate something, then use it.',
    lesson: `
### Subquery: a query inside a query
\`\`\`sql
SELECT product_name, list_price
FROM products
WHERE list_price > (SELECT AVG(list_price) FROM products);
\`\`\`
The inner query runs first and returns one value.

### CTE: name your steps (WITH …)
\`\`\`sql
WITH spend AS (
  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price * (1 - oi.discount_pct)) AS spend
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'completed' AND o.customer_id IS NOT NULL
  GROUP BY o.customer_id
)
SELECT customer_id, spend
FROM spend
WHERE spend > (SELECT AVG(spend) FROM spend);
\`\`\`
CTEs read top to bottom like a recipe. Use them for anything with more than one step.

### IN / EXISTS
- \`WHERE customer_id IN (SELECT … )\`: match against a list
- \`WHERE EXISTS (SELECT 1 FROM … WHERE …)\`: "is there at least one"

### ⚠ NOT IN with NULLs
If the subquery returns even one NULL, \`x NOT IN (…)\` is never true, and you get **zero rows**. Use \`NOT EXISTS\` instead, or filter out the NULLs inside the subquery.`,
    tryIt: {
      id: 'sql-subqueries-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'subquery',
      prompt: 'List products priced **above the average list price**: product_name, list_price.',
      answer: 'SELECT product_name, list_price FROM products WHERE list_price > (SELECT AVG(list_price) FROM products);',
      hints: ['Compare list_price with (SELECT AVG(list_price) FROM products).'], explain: 'The subquery returns one number; WHERE compares each row with it.',
    },
    practice: [
      { id: 'sql-subqueries-p1', type: 'sql', db: 'cedarline', title: 'Above-average customers', difficulty: 3, concept: 'cte', business: 'Retail', minutes: 10,
        prompt: 'Customers whose **2025 spend** (completed orders, net revenue) was **above the average 2025 customer spend**. Return customer_id and spend (2 decimals). Walk-ins (NULL customer_id) are not customers.',
        answer: `WITH spend AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id) SELECT customer_id, ROUND(spend, 2) FROM spend WHERE spend > (SELECT AVG(spend) FROM spend);`,
        hints: ['Step 1 (CTE): spend per customer in 2025. Step 2: keep those above the average of step 1.', 'WITH spend AS (…) SELECT … FROM spend WHERE spend > (SELECT AVG(spend) FROM spend)'], explain: 'The average is over customers, not over orders. The CTE makes that explicit.' },
      { id: 'sql-subqueries-p2', type: 'sql', db: 'restaurant', title: 'Dishes growing year on year', difficulty: 3, concept: 'cte', business: 'Restaurant', minutes: 10,
        prompt: 'Which dishes sold **more portions in July 2026 than in July 2025** (all restaurants together)? Return the dish name, July 2025 qty and July 2026 qty.',
        answer: "WITH j25 AS (SELECT menu_item_id, SUM(qty_sold) AS q FROM daily_sales WHERE sale_date BETWEEN '2025-07-01' AND '2025-07-31' GROUP BY menu_item_id), j26 AS (SELECT menu_item_id, SUM(qty_sold) AS q FROM daily_sales WHERE sale_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY menu_item_id) SELECT m.name, a.q AS jul_2025, b.q AS jul_2026 FROM menu_items m JOIN j25 a ON a.menu_item_id = m.menu_item_id JOIN j26 b ON b.menu_item_id = m.menu_item_id WHERE b.q > a.q;",
        hints: ['One CTE per July, then join them on menu_item_id.', 'WITH j25 AS (…), j26 AS (…) SELECT … WHERE j26.q > j25.q'], explain: 'Two aggregates at the same grain (dish), joined side by side. It is a standard way to compare periods.' },
    ],
    quiz: [
      { id: 'sql-subqueries-q1', type: 'mc', difficulty: 3, concept: 'not-in-null', prompt: '`SELECT * FROM products WHERE product_id NOT IN (SELECT product_id FROM discontinued);` returns 0 rows although most products are not discontinued. Why?', options: ['The subquery returns a NULL, so NOT IN is never true', 'NOT IN is not supported on a subquery result', 'The subquery must be sorted for NOT IN to work', 'The products table has no primary key to match on'], answer: 0, explain: 'x NOT IN (…, NULL) evaluates to UNKNOWN for every row. Use NOT EXISTS.' },
      { id: 'sql-subqueries-q2', type: 'mc', difficulty: 2, concept: 'cte', prompt: 'Why do analysts like CTEs (WITH …)?', options: ['They run faster than everything else', 'They split a query into named, readable steps', 'They create permanent tables', 'They are required for joins'], answer: 1, explain: 'Readability and structure. Performance is usually similar to subqueries.' },
      { id: 'sql-subqueries-q3', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'subquery', prompt: 'List the **customer_id and full_name** of customers who had **any return in 2026** (each customer once).', answer: "SELECT customer_id, full_name FROM customers WHERE customer_id IN (SELECT o.customer_id FROM returns r JOIN order_items oi ON oi.order_item_id = r.order_item_id JOIN orders o ON o.order_id = oi.order_id WHERE r.return_date >= '2026-01-01');", explain: 'IN (subquery) naturally returns each customer once.' },
    ],
    challenge: {
      id: 'sql-subqueries-ch', type: 'sql', db: 'hr', title: 'Paid above department average', difficulty: 4, concept: 'subquery', business: 'HR', minutes: 12,
      context: 'HR is reviewing pay fairness. They want current employees paid above their own department\'s average.',
      prompt: 'Return employee_id, department_id, current_salary and **dept_avg** (the average current salary of **current** employees in their department, rounded to 0 decimals), for current employees paid **above** that average.',
      answer: 'WITH d AS (SELECT department_id, AVG(current_salary) AS a FROM employees WHERE termination_date IS NULL GROUP BY department_id) SELECT e.employee_id, e.department_id, e.current_salary, ROUND(d.a, 0) AS dept_avg FROM employees e JOIN d ON d.department_id = e.department_id WHERE e.termination_date IS NULL AND e.current_salary > d.a;',
      traps: [{ sql: 'WITH d AS (SELECT department_id, AVG(current_salary) AS a FROM employees GROUP BY department_id) SELECT e.employee_id, e.department_id, e.current_salary, ROUND(d.a, 0) FROM employees e JOIN d ON d.department_id = e.department_id WHERE e.termination_date IS NULL AND e.current_salary > d.a;', feedback: 'The department average includes people who have left (with older, lower salaries), so the bar is too low. Average over current employees only.', mistake: 'Averaged over the wrong population', concept: 'where-logic' }],
      hints: ['Step 1: average current salary per department (current employees only). Step 2: join it back to employees and compare.', 'A correlated subquery also works: WHERE current_salary > (SELECT AVG(…) FROM employees e2 WHERE e2.department_id = e.department_id AND …)'],
      explain: 'Be precise about the population of every aggregate. It is a question of definition, not just of syntax.',
    },
    cards: [
      { id: 'sql-subqueries-c1', front: 'Why prefer NOT EXISTS over NOT IN?', back: 'If the NOT IN subquery returns a NULL, no rows come back at all. NOT EXISTS is NULL-safe.' },
      { id: 'sql-subqueries-c2', front: 'Shape of a CTE?', back: 'WITH step1 AS (SELECT …), step2 AS (SELECT … FROM step1) SELECT … FROM step2;' },
    ],
  },

  {
    id: 'sql-union', skill: 'sql', level: 'Intermediate', title: 'UNION & conditional aggregation', minutes: 12, prereqs: ['sql-subqueries', 'sql-case'],
    summary: 'Stack results on top of each other, and pivot rows into columns.',
    lesson: `
### UNION ALL stacks results
\`\`\`sql
SELECT 'Food' AS cost_type, SUM(line_total) AS amount FROM purchases WHERE ...
UNION ALL
SELECT 'Labour', SUM(labor_cost) FROM labor_daily WHERE ...;
\`\`\`
Both parts need the same number of columns, in the same order and of compatible types.

- **UNION ALL** keeps every row (fast).
- **UNION** removes duplicate rows (slower, and it can silently drop legitimate identical rows).

Use **UNION ALL** unless you *want* de-duplication.

### Conditional aggregation: rows → columns
\`\`\`sql
SELECT strftime('%Y-%m', order_date) AS month,
       SUM(CASE WHEN channel = 'Online'   THEN 1 ELSE 0 END) AS online_orders,
       SUM(CASE WHEN channel = 'In-Store' THEN 1 ELSE 0 END) AS store_orders
FROM orders
GROUP BY month;
\`\`\`
It's the SQL version of a PivotTable with Channel in Columns. (Some databases have PIVOT; this works everywhere.)`,
    tryIt: {
      id: 'sql-union-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'conditional-agg',
      prompt: 'For **2025 orders**, return ONE row with three columns: the number of **completed**, **cancelled** and **pending** orders.',
      answer: "SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending FROM orders WHERE order_date BETWEEN '2025-01-01' AND '2025-12-31';",
      hints: ['No GROUP BY: one row. One SUM(CASE…) per status.'], explain: 'Pending is 0 in 2025: pending orders only exist at the very end of the data.',
    },
    practice: [
      { id: 'sql-union-p1', type: 'sql', db: 'cedarline', title: 'Monthly revenue by channel (2026)', difficulty: 3, concept: 'conditional-agg', ordered: true, business: 'Retail', minutes: 10,
        prompt: 'For **completed** orders in **2026**, return **month** (YYYY-MM), **online_revenue** and **store_revenue** (net revenue, 2 decimals), oldest month first.',
        answer: `SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(SUM(CASE WHEN o.channel = 'Online' THEN ${NET} ELSE 0 END), 2) AS online_revenue, ROUND(SUM(CASE WHEN o.channel = 'In-Store' THEN ${NET} ELSE 0 END), 2) AS store_revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.order_date >= '2026-01-01' GROUP BY month ORDER BY month;`,
        hints: ["strftime('%Y-%m', order_date) gives the month.", 'SUM(CASE WHEN channel = \'Online\' THEN <net expression> ELSE 0 END)'], explain: 'Conditional sums are the fastest way to put two series side by side for a chart.' },
      { id: 'sql-union-p2', type: 'sql', db: 'restaurant', title: 'Riverside cost lines', difficulty: 3, concept: 'union', business: 'Restaurant', minutes: 10,
        prompt: 'For the **Riverside** restaurant (restaurant_id 2) in **June 2026**, return one row per cost type with columns **cost_type, amount** (2 decimals): "Food purchases" (purchases.line_total), "Labour" (labor_daily.labor_cost), and "Operating" (operating_costs.amount, month \'2026-06\').',
        answer: "SELECT 'Food purchases' AS cost_type, ROUND(SUM(line_total), 2) AS amount FROM purchases WHERE restaurant_id = 2 AND delivery_date BETWEEN '2026-06-01' AND '2026-06-30' UNION ALL SELECT 'Labour', ROUND(SUM(labor_cost), 2) FROM labor_daily WHERE restaurant_id = 2 AND work_date BETWEEN '2026-06-01' AND '2026-06-30' UNION ALL SELECT 'Operating', ROUND(SUM(amount), 2) FROM operating_costs WHERE restaurant_id = 2 AND month = '2026-06';",
        hints: ['Three separate SELECTs with the same two columns, glued with UNION ALL.'], explain: 'UNION ALL is how you combine facts that live in different tables into one list.' },
    ],
    quiz: [
      { id: 'sql-union-q1', type: 'mc', difficulty: 2, concept: 'union', prompt: 'You stack two monthly order tables. UNION or UNION ALL?', options: ['UNION ALL: it keeps every row, and UNION would drop genuinely identical orders', 'UNION: removing duplicates is always the safer default choice', 'Either one: on two separate monthly tables they give the same rows', 'Neither: join the two tables on order_id instead of stacking them'], answer: 0, explain: 'UNION removes duplicates, which you rarely want when stacking transactions.' },
      { id: 'sql-union-q2', type: 'tf', difficulty: 2, concept: 'union', prompt: 'True or false: the SELECTs in a UNION must have the same number of columns.', answer: true, explain: 'Same number of columns, in a compatible order and type.' },
      { id: 'sql-union-q3', type: 'sql', db: 'hr', difficulty: 3, concept: 'conditional-agg', prompt: 'HR: current employees per department_id, with one column per location: north_hub, south_hub, head_office.', answer: "SELECT department_id, SUM(CASE WHEN location = 'North Hub' THEN 1 ELSE 0 END) AS north_hub, SUM(CASE WHEN location = 'South Hub' THEN 1 ELSE 0 END) AS south_hub, SUM(CASE WHEN location = 'Head Office' THEN 1 ELSE 0 END) AS head_office FROM employees WHERE termination_date IS NULL GROUP BY department_id;", explain: 'One SUM(CASE …) per column you want to create.' },
    ],
    challenge: {
      id: 'sql-union-ch', type: 'sql', db: 'restaurant', title: 'Q2 profit by restaurant', difficulty: 4, concept: 'cte', business: 'Restaurant', minutes: 20,
      context: 'The owner asks for a simple Q2 2026 (April to June) profit view per restaurant: net sales minus food purchases, labour and operating costs.',
      prompt: 'Return **restaurant name, net_sales, food, labour, operating, profit** (all 2 decimals) for Q2 2026, one row per restaurant. (Use purchases as the food cost for this quick view.)',
      answer: "WITH s AS (SELECT restaurant_id, SUM(net_sales) AS v FROM daily_sales WHERE sale_date BETWEEN '2026-04-01' AND '2026-06-30' GROUP BY restaurant_id), f AS (SELECT restaurant_id, SUM(line_total) AS v FROM purchases WHERE delivery_date BETWEEN '2026-04-01' AND '2026-06-30' GROUP BY restaurant_id), l AS (SELECT restaurant_id, SUM(labor_cost) AS v FROM labor_daily WHERE work_date BETWEEN '2026-04-01' AND '2026-06-30' GROUP BY restaurant_id), op AS (SELECT restaurant_id, SUM(amount) AS v FROM operating_costs WHERE month BETWEEN '2026-04' AND '2026-06' GROUP BY restaurant_id) SELECT r.name, ROUND(s.v, 2) AS net_sales, ROUND(f.v, 2) AS food, ROUND(l.v, 2) AS labour, ROUND(op.v, 2) AS operating, ROUND(s.v - f.v - l.v - op.v, 2) AS profit FROM restaurants r JOIN s ON s.restaurant_id = r.restaurant_id JOIN f ON f.restaurant_id = r.restaurant_id JOIN l ON l.restaurant_id = r.restaurant_id JOIN op ON op.restaurant_id = r.restaurant_id;",
      // (No trap for joining sales to purchases directly: that query is so large it times out,
      //  and the time-out message already explains the missing aggregation.)
      hints: ['Each cost lives in a different table with a different grain. Aggregate each per restaurant FIRST. (Joining sales straight to purchases multiplies every row by every row and never finishes.)', 'Four CTEs (sales, food, labour, operating), each grouped by restaurant_id, then join them to restaurants.'],
      explain: 'Aggregate-then-join is the pattern for combining several fact tables. Joining raw fact tables together multiplies rows.',
    },
    cards: [
      { id: 'sql-union-c1', front: 'UNION vs UNION ALL?', back: 'UNION ALL keeps all rows. UNION removes duplicates (slower, and can drop real identical rows).' },
      { id: 'sql-union-c2', front: 'How do you pivot rows into columns without PIVOT?', back: 'Conditional aggregation: SUM(CASE WHEN category = \'X\' THEN value ELSE 0 END) AS x, …' },
    ],
  },

  {
    id: 'sql-dates', skill: 'sql', level: 'Intermediate', title: 'Dates, text & deduplication', minutes: 12, prereqs: ['sql-groupby'],
    summary: 'Months, day differences, cleaning text, and finding duplicate records.',
    lesson: `
### Dates in SQLite (this app)
Dates are text 'YYYY-MM-DD'.
| Need | SQLite | SQL Server | PostgreSQL |
|---|---|---|---|
| month label | \`strftime('%Y-%m', d)\` | \`FORMAT(d,'yyyy-MM')\` | \`TO_CHAR(d,'YYYY-MM')\` |
| year | \`strftime('%Y', d)\` | \`YEAR(d)\` | \`EXTRACT(YEAR FROM d)\` |
| days between | \`julianday(b) - julianday(a)\` | \`DATEDIFF(day,a,b)\` | \`b - a\` |
| add days | \`date(d, '+90 days')\` | \`DATEADD(day,90,d)\` | \`d + 90\` |
| first of month | \`date(d, 'start of month')\` | \`DATEFROMPARTS(...)\` | \`DATE_TRUNC('month', d)\` |

### Text functions
\`LOWER()\`, \`UPPER()\`, \`TRIM()\`, \`LENGTH()\`, \`SUBSTR(text, start, n)\`, \`INSTR(text, '@')\`, \`REPLACE()\`, and \`||\` to join text.

Email domain: \`SUBSTR(email, INSTR(email, '@') + 1)\`

### Deduplication
Real customer tables contain the same person twice ("Ana@Mail.com " vs "ana@mail.com"). To find duplicates:
1. **Normalise** the key: \`LOWER(TRIM(email))\`
2. **Group** by it and count: \`HAVING COUNT(*) > 1\`

Never deduplicate on **names**: different people share names.`,
    tryIt: {
      id: 'sql-dates-try', type: 'sql', db: 'cedarline', difficulty: 2, concept: 'sql-dates', ordered: true,
      prompt: 'Number of orders per **month** in **2026** (all statuses): month (YYYY-MM) and count, oldest first.',
      answer: "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) FROM orders WHERE order_date >= '2026-01-01' GROUP BY month ORDER BY month;",
      hints: ["strftime('%Y-%m', order_date) turns a date into its month."], explain: 'Group by the formatted month, and sort by it.',
    },
    practice: [
      { id: 'sql-dates-p1', type: 'sql', db: 'cedarline', title: 'How long until a return?', difficulty: 3, concept: 'sql-dates', business: 'Retail', minutes: 8,
        prompt: 'For returns dated in **2026**, the **average number of days between the order date and the return date**, by **reason**. Return reason and the average (1 decimal).',
        answer: "SELECT r.reason, ROUND(AVG(julianday(r.return_date) - julianday(o.order_date)), 1) AS avg_days FROM returns r JOIN order_items oi ON oi.order_item_id = r.order_item_id JOIN orders o ON o.order_id = oi.order_id WHERE r.return_date >= '2026-01-01' GROUP BY r.reason;",
        hints: ['You need the order date: returns → order_items → orders.', 'julianday(r.return_date) - julianday(o.order_date) gives days.'], explain: 'Chaining joins to reach the date you need is normal: the return knows its line; the line knows its order.' },
      { id: 'sql-dates-p2', type: 'sql', db: 'cedarline', title: 'Duplicate customer records', difficulty: 4, concept: 'dedup', business: 'Retail', minutes: 10,
        prompt: 'Treat two emails as the same person if they match after **trimming spaces and ignoring case**. Return one row with two numbers: **records_in_duplicate_groups** (customer records that belong to a person with 2+ records) and **distinct_people**.',
        answer: 'WITH g AS (SELECT LOWER(TRIM(email)) AS e, COUNT(*) AS n FROM customers GROUP BY e) SELECT (SELECT SUM(n) FROM g WHERE n > 1) AS records_in_duplicate_groups, (SELECT COUNT(*) FROM g) AS distinct_people;',
        traps: [{ sql: 'WITH g AS (SELECT LOWER(TRIM(full_name)) AS e, COUNT(*) AS n FROM customers GROUP BY e) SELECT (SELECT SUM(n) FROM g WHERE n > 1), (SELECT COUNT(*) FROM g);', feedback: 'You grouped on names. Hundreds of different people share a name, so this merges strangers. Use the email.', mistake: 'Deduplicated on names instead of a reliable key', concept: 'dedup' },
          { sql: 'WITH g AS (SELECT email AS e, COUNT(*) AS n FROM customers GROUP BY e) SELECT (SELECT SUM(n) FROM g WHERE n > 1), (SELECT COUNT(*) FROM g);', feedback: 'Without normalising, "Ana@Mail.example " and "ana@mail.example" look different. Use LOWER(TRIM(email)).', mistake: 'Did not normalise before deduplicating', concept: 'dedup' }],
        hints: ['Group by LOWER(TRIM(email)) and count records per group.', 'records in duplicate groups = SUM of counts where count > 1; distinct people = number of groups.'], explain: '139 records belong to 68 people who are registered more than once; there are 4,500 real customers, not 4,571.' },
    ],
    quiz: [
      { id: 'sql-dates-q1', type: 'mc', difficulty: 2, concept: 'sql-dates', prompt: 'In SQLite, how do you get the number of days between d1 and d2?', options: ['d2 - d1', 'DATEDIFF(d1, d2)', 'julianday(d2) - julianday(d1)', 'DAYS(d2, d1)'], answer: 2, explain: 'julianday converts a date to a day number; subtract them. (DATEDIFF is SQL Server; d2 - d1 works in PostgreSQL.)' },
      { id: 'sql-dates-q2', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'string-funcs', prompt: 'Count customers per **email domain** (the part after @, lower-cased and trimmed). Return domain and count.', answer: "SELECT SUBSTR(LOWER(TRIM(email)), INSTR(LOWER(TRIM(email)), '@') + 1) AS domain, COUNT(*) FROM customers GROUP BY domain;", explain: 'Normalise first, then cut. INSTR finds the position of the @, and SUBSTR takes everything after it; without LOWER and TRIM, " Gmail.example" and "gmail.example" would count as two domains.' },
      { id: 'sql-dates-q3', type: 'tf', difficulty: 2, concept: 'dedup', prompt: 'True or false: two customer records with the same full name are the same person.', answer: false, explain: 'Names are shared by different people. Use a reliable key (a normalised email, a loyalty ID).' },
    ],
    challenge: {
      id: 'sql-dates-ch', type: 'sql', db: 'hr', title: 'Tenure of leavers', difficulty: 3, concept: 'sql-dates', business: 'HR', minutes: 10,
      prompt: 'For people who left in **2025**, the **average tenure in years** (from hire_date to termination_date, days ÷ 365.25) by **termination_type**. Return termination_type, number of leavers, and average tenure (1 decimal).',
      answer: "SELECT termination_type, COUNT(*) AS leavers, ROUND(AVG((julianday(termination_date) - julianday(hire_date)) / 365.25), 1) AS avg_years FROM employees WHERE termination_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY termination_type;",
      hints: ['Days between hire and termination with julianday, divided by 365.25.', 'Filter the termination year, group by termination_type.'],
      explain: 'Short average tenure among voluntary leavers suggests people leave early, which points to onboarding, or to the job not matching expectations.',
    },
    cards: [
      { id: 'sql-dates-c1', front: 'Month label from a date in SQLite?', back: "strftime('%Y-%m', date_column)" },
      { id: 'sql-dates-c2', front: 'How do you find duplicate people in a customer table?', back: 'Normalise a reliable key (LOWER(TRIM(email))), GROUP BY it, HAVING COUNT(*) > 1.' },
    ],
  },

  // =========================================================================== ADVANCED
  {
    id: 'sql-window-rank', skill: 'sql', level: 'Advanced', title: 'Window functions: ranking', minutes: 15, prereqs: ['sql-subqueries', 'sql-multijoins'],
    summary: 'ROW_NUMBER, RANK and DENSE_RANK: the top N per group, first orders and more.',
    lesson: `
### A window function calculates across rows, without collapsing them
\`\`\`sql
SELECT category, product_name, list_price,
       RANK() OVER (PARTITION BY category ORDER BY list_price DESC) AS price_rank
FROM products;
\`\`\`
- \`PARTITION BY\` → restart the ranking for each group
- \`ORDER BY\` inside OVER → what "first" means

### The three ranks (scores 100, 90, 90, 80)
| | 100 | 90 | 90 | 80 |
|---|---|---|---|---|
| ROW_NUMBER | 1 | 2 | 3 | 4 |
| RANK | 1 | 2 | 2 | 4 |
| DENSE_RANK | 1 | 2 | 2 | 3 |

### Top N per group
You can't filter a window function in WHERE (WHERE runs before it). Wrap it:
\`\`\`sql
WITH ranked AS (
  SELECT ..., RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM ...
)
SELECT * FROM ranked WHERE rnk <= 3;
\`\`\`

### First / latest record per group
\`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date)\` = 1 gives each customer's first order.`,
    tryIt: {
      id: 'sql-window-rank-try', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'window-rank',
      prompt: 'For every product return category, product_name, list_price and **price_rank**: its RANK by list price **within its category** (most expensive = 1).',
      answer: 'SELECT category, product_name, list_price, RANK() OVER (PARTITION BY category ORDER BY list_price DESC) AS price_rank FROM products;',
      hints: ['RANK() OVER (PARTITION BY … ORDER BY … DESC)'], explain: 'PARTITION BY restarts the numbering for each category.',
    },
    practice: [
      { id: 'sql-window-rank-p1', type: 'sql', db: 'cedarline', title: 'Top 3 products per category', difficulty: 4, concept: 'top-n-group', business: 'Retail', minutes: 12,
        prompt: 'The **top 3 products by 2025 net revenue** (completed orders) **within each category**. Return category, rank, sku, product_name and revenue (2 decimals). If two tie, show both.',
        answer: `WITH rev AS (SELECT p.category, p.sku, p.product_name, SUM(${NET}) AS revenue FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.category, p.sku, p.product_name), ranked AS (SELECT rev.*, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk FROM rev) SELECT category, rnk, sku, product_name, ROUND(revenue, 2) FROM ranked WHERE rnk <= 3;`,
        hints: ['Step 1: revenue per product. Step 2: rank within category. Step 3: keep rank <= 3.', 'You can\'t use the rank in the same SELECT\'s WHERE; wrap it in a CTE or subquery.'], explain: 'RANK/DENSE_RANK include ties; ROW_NUMBER would cut one arbitrarily. Note a discontinued backpack in the top 3: it was clearance-priced.' },
      { id: 'sql-window-rank-p2', type: 'sql', db: 'cedarline', title: 'Each customer\'s first order', difficulty: 3, concept: 'window-rank', business: 'Retail', minutes: 8,
        prompt: 'For every customer with a completed order: their **first completed order** (customer_id, order_id, order_date). If two orders share the first date, take the lower order_id.',
        answer: "WITH r AS (SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders WHERE status = 'completed' AND customer_id IS NOT NULL) SELECT customer_id, order_id, order_date FROM r WHERE rn = 1;",
        hints: ['ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id)', 'Keep rn = 1.'], explain: 'ROW_NUMBER is the tool for "exactly one row per group".' },
      { id: 'sql-window-rank-p3', type: 'sql', db: 'restaurant', title: 'Best seller per restaurant', difficulty: 4, concept: 'top-n-group', business: 'Restaurant', minutes: 10,
        prompt: 'For **August 2026**, the **best-selling dish (by quantity) in each restaurant**. Return restaurant name, dish name and quantity.',
        answer: "WITH q AS (SELECT d.restaurant_id, d.menu_item_id, SUM(d.qty_sold) AS qty FROM daily_sales d WHERE d.sale_date BETWEEN '2026-08-01' AND '2026-08-31' GROUP BY 1, 2), r AS (SELECT q.*, RANK() OVER (PARTITION BY restaurant_id ORDER BY qty DESC) AS rk FROM q) SELECT rs.name, m.name, r.qty FROM r JOIN restaurants rs ON rs.restaurant_id = r.restaurant_id JOIN menu_items m ON m.menu_item_id = r.menu_item_id WHERE r.rk = 1;",
        hints: ['Aggregate qty per restaurant and dish, rank within each restaurant, keep rank 1.', 'Join the names at the end.'], explain: 'Drinks win on volume. A good analyst would then ask whether volume or margin is the better measure of "best".' },
    ],
    quiz: [
      { id: 'sql-window-rank-q1', type: 'mc', difficulty: 3, concept: 'window-rank', prompt: 'Scores 100, 90, 90, 80 ranked descending. Which is right?', options: ['RANK 1,2,2,4 · DENSE_RANK 1,2,2,3 · ROW_NUMBER 1,2,3,4', 'RANK 1,2,2,3 · DENSE_RANK 1,2,2,4 · ROW_NUMBER 1,2,3,4', 'RANK 1,2,3,4 · DENSE_RANK 1,2,2,3 · ROW_NUMBER 1,2,2,4', 'All three give 1,2,2,4'], answer: 0, explain: 'RANK skips after ties; DENSE_RANK doesn\'t; ROW_NUMBER never ties.' },
      { id: 'sql-window-rank-q2', type: 'mc', difficulty: 3, concept: 'window-filter', prompt: '`SELECT …, RANK() OVER (…) AS rk FROM t WHERE rk <= 3` fails. Why?', options: ['WHERE runs before window functions, so rk does not exist yet', 'RANK needs a GROUP BY clause to go with the OVER clause', 'Column aliases can never be used elsewhere in the same query', 'The condition belongs in HAVING, next to the other aggregates'], answer: 0, explain: 'Compute the rank in a CTE/subquery, then filter outside.' },
      { id: 'sql-window-rank-q3', type: 'mc', difficulty: 3, concept: 'window-rank', prompt: 'You need exactly one row per customer (their latest order). Which function?', options: ['RANK', 'DENSE_RANK', 'ROW_NUMBER', 'COUNT'], answer: 2, explain: 'ROW_NUMBER never ties, so = 1 gives exactly one row. (Add a tie-breaker in the ORDER BY.)' },
    ],
    challenge: {
      id: 'sql-window-rank-ch', type: 'sql', db: 'hr', title: 'Top earners by department', difficulty: 4, concept: 'top-n-group', business: 'HR', minutes: 10,
      prompt: 'The **top 2 earners (current employees) in each department**, ties included. Return department name, employee_id, current_salary and the rank.',
      answer: 'WITH r AS (SELECT e.department_id, e.employee_id, e.current_salary, DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.current_salary DESC) AS rk FROM employees e WHERE e.termination_date IS NULL) SELECT d.name, r.employee_id, r.current_salary, r.rk FROM r JOIN departments d ON d.department_id = r.department_id WHERE r.rk <= 2;',
      hints: ['Rank within department, filter outside.', '"Ties included" → RANK or DENSE_RANK, not ROW_NUMBER.'],
      explain: 'If two people share the 2nd-highest salary, both appear. That is the behaviour HR asked for.',
    },
    cards: [
      { id: 'sql-window-rank-c1', front: 'RANK vs DENSE_RANK vs ROW_NUMBER on 100, 90, 90, 80?', back: 'RANK 1,2,2,4 · DENSE_RANK 1,2,2,3 · ROW_NUMBER 1,2,3,4' },
      { id: 'sql-window-rank-c2', front: 'Pattern for top N per group?', back: 'CTE with RANK() OVER (PARTITION BY group ORDER BY value DESC) AS rk, then WHERE rk <= N outside.' },
    ],
  },

  {
    id: 'sql-window-lag', skill: 'sql', level: 'Advanced', title: 'LAG, LEAD, running totals & moving averages', minutes: 15, prereqs: ['sql-window-rank'],
    summary: 'Compare each row with the previous one, and build cumulative and rolling measures.',
    lesson: `
### LAG and LEAD look at neighbouring rows
\`\`\`sql
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month,
       100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / LAG(revenue) OVER (ORDER BY month) AS growth_pct
FROM monthly;
\`\`\`
- \`LAG(x)\` = the previous row's x; \`LEAD(x)\` = the next row's.
- With \`PARTITION BY region\`, each region gets its own sequence.

### Running totals and moving averages
\`\`\`sql
SUM(revenue) OVER (ORDER BY month)                                   -- running total
AVG(sales) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) -- 7-day moving average
\`\`\`

### The filter trap
If you filter to 2026 **before** LAG, January's "previous month" is missing (NULL). Compute LAG over a range that includes December, then filter **afterwards**, in an outer query.

### Division safety
\`NULLIF(prev, 0)\` avoids dividing by zero: \`(x - prev) / NULLIF(prev, 0)\`.`,
    tryIt: {
      id: 'sql-window-lag-try', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'lag-lead', ordered: true,
      prompt: 'Monthly **net revenue for 2025** (completed orders) with the **previous month\'s revenue** next to it. Return month, revenue, prev_revenue (2 decimals), oldest first.',
      answer: `WITH m AS (SELECT strftime('%Y-%m', o.order_date) AS month, SUM(${NET}) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY month) SELECT month, ROUND(revenue, 2), ROUND(LAG(revenue) OVER (ORDER BY month), 2) AS prev_revenue FROM m ORDER BY month;`,
      hints: ['First aggregate per month (a CTE), then apply LAG over the months.', 'LAG(revenue) OVER (ORDER BY month)'], explain: 'January\'s prev_revenue is NULL here because the range starts in January. The next task fixes that properly.',
    },
    practice: [
      { id: 'sql-window-lag-p1', type: 'sql', db: 'cedarline', title: 'Month-over-month growth by region', difficulty: 5, concept: 'window-filter', business: 'Retail', minutes: 20,
        prompt: 'Month-over-month **net revenue growth %** by region for **January–August 2026** (completed orders). Region: store region for In-Store, customer region for Online; **exclude unknown regions**. January must be compared with **December 2025**. Return region, month, revenue (2 dp), growth_pct (1 dp).',
        answer: `WITH monthly AS (SELECT CASE WHEN o.channel = 'In-Store' THEN s.region ELSE c.region END AS region, strftime('%Y-%m', o.order_date) AS month, SUM(${NET}) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN stores s ON s.store_id = o.store_id LEFT JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2025-12-01' AND '2026-08-31' GROUP BY 1, 2), g AS (SELECT region, month, revenue, LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev FROM monthly WHERE region IS NOT NULL) SELECT region, month, ROUND(revenue, 2), ROUND(100 * (revenue - prev) / NULLIF(prev, 0), 1) AS growth_pct FROM g WHERE month >= '2026-01';`,
        traps: [{ sql: `WITH monthly AS (SELECT CASE WHEN o.channel = 'In-Store' THEN s.region ELSE c.region END AS region, strftime('%Y-%m', o.order_date) AS month, SUM(${NET}) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN stores s ON s.store_id = o.store_id LEFT JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'completed' AND o.order_date BETWEEN '2026-01-01' AND '2026-08-31' GROUP BY 1, 2), g AS (SELECT region, month, revenue, LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev FROM monthly WHERE region IS NOT NULL) SELECT region, month, ROUND(revenue, 2), ROUND(100 * (revenue - prev) / NULLIF(prev, 0), 1) FROM g;`, feedback: 'January shows no growth because December 2025 was filtered out BEFORE LAG ran. Include December in the input, and filter to 2026 after the window function.', mistake: 'Filtered before the window function', concept: 'window-filter' }],
        hints: ['Aggregate by region and month starting from 2025-12, apply LAG partitioned by region, then filter to 2026 outside.', 'Region = CASE WHEN channel = \'In-Store\' THEN store region ELSE customer region END; drop NULL regions.'], explain: 'Every region fell sharply in January (seasonality): East −23.2%, North −41.2%, South −51.7%, West −48.6%. Month-over-month numbers are noisy; year-over-year is often the better view.' },
      { id: 'sql-window-lag-p2', type: 'sql', db: 'restaurant', title: '7-day moving average', difficulty: 4, concept: 'running-total', ordered: true, business: 'Restaurant', minutes: 10,
        prompt: 'For **Downtown** (restaurant_id 1) in **August 2026**: each day\'s net sales and the **7-day moving average** (that day and the 6 before it, within August). Return sale_date, net_sales, ma7 (2 decimals), in date order.',
        answer: "WITH d AS (SELECT sale_date, SUM(net_sales) AS net FROM daily_sales WHERE restaurant_id = 1 AND sale_date BETWEEN '2026-08-01' AND '2026-08-31' GROUP BY sale_date) SELECT sale_date, ROUND(net, 2), ROUND(AVG(net) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ma7 FROM d ORDER BY sale_date;",
        hints: ['First total net sales per day (the table has one row per dish).', 'AVG(net) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)'], explain: 'The moving average smooths out the weekday pattern (busy Fridays and Saturdays), so the trend is visible.' },
    ],
    quiz: [
      { id: 'sql-window-lag-q1', type: 'mc', difficulty: 3, concept: 'lag-lead', prompt: 'What does LAG(revenue) OVER (ORDER BY month) return for the first month?', options: ['0', 'The same month\'s revenue', 'NULL', 'An error'], answer: 2, explain: 'There is no previous row, so it returns NULL (unless you give a default: LAG(revenue, 1, 0)).' },
      { id: 'sql-window-lag-q2', type: 'fill', difficulty: 3, concept: 'running-total', prompt: 'Complete the frame for a 7-day moving average: `AVG(x) OVER (ORDER BY day ROWS BETWEEN ___ PRECEDING AND CURRENT ROW)`', answer: ['6'], explain: '6 preceding rows + the current row = 7 days.' },
      { id: 'sql-window-lag-q3', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'running-total', ordered: true, prompt: 'A **running total** of completed 2026 net revenue by month: month, revenue, running_total (2 dp), in month order.', answer: `WITH m AS (SELECT strftime('%Y-%m', o.order_date) AS month, SUM(${NET}) AS rev FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.order_date >= '2026-01-01' GROUP BY month) SELECT month, ROUND(rev, 2), ROUND(SUM(rev) OVER (ORDER BY month), 2) AS running_total FROM m ORDER BY month;`, explain: 'SUM(…) OVER (ORDER BY month) accumulates.' },
    ],
    challenge: {
      id: 'sql-window-lag-ch', type: 'sql', db: 'cedarline', title: 'Do new customers come back quickly?', difficulty: 5, concept: 'lag-lead', business: 'E-commerce', minutes: 15,
      context: 'Marketing wants to know how many new customers come back quickly.',
      prompt: 'Of the customers whose **first completed order** was in **2025**, what **percentage** placed a **second completed order within 90 days** of the first? Return: customers, repeat_within_90, pct (1 decimal). Use customer_id as it is.',
      answer: "WITH r AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders WHERE status = 'completed' AND customer_id IS NOT NULL), f AS (SELECT a.customer_id, a.order_date AS d1, b.order_date AS d2 FROM r a LEFT JOIN r b ON b.customer_id = a.customer_id AND b.rn = 2 WHERE a.rn = 1 AND a.order_date BETWEEN '2025-01-01' AND '2025-12-31') SELECT COUNT(*) AS customers, SUM(CASE WHEN julianday(d2) - julianday(d1) <= 90 THEN 1 ELSE 0 END) AS repeat_within_90, ROUND(100.0 * SUM(CASE WHEN julianday(d2) - julianday(d1) <= 90 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct FROM f;",
      traps: [{ sql: "WITH r AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders WHERE status = 'completed' AND customer_id IS NOT NULL), f AS (SELECT a.customer_id, a.order_date AS d1, b.order_date AS d2 FROM r a JOIN r b ON b.customer_id = a.customer_id AND b.rn = 2 WHERE a.rn = 1 AND a.order_date BETWEEN '2025-01-01' AND '2025-12-31') SELECT COUNT(*), SUM(CASE WHEN julianday(d2) - julianday(d1) <= 90 THEN 1 ELSE 0 END), ROUND(100.0 * SUM(CASE WHEN julianday(d2) - julianday(d1) <= 90 THEN 1 ELSE 0 END) / COUNT(*), 1) FROM f;", feedback: 'An INNER JOIN to the second order drops every customer who never came back, so the denominator only contains repeaters and the rate is far too high. Keep them with a LEFT JOIN.', mistake: 'Lost the non-returning customers from the denominator', concept: 'cohort' }],
      hints: ['Number each customer\'s completed orders with ROW_NUMBER. First order = 1, second = 2.', 'Keep customers whose order #1 is in 2025, LEFT JOIN their order #2, and count those within 90 days. The denominator must include people with no second order.'],
      explain: '1,340 customers; 431 came back within 90 days → 32.2%. The denominator is where most retention analyses go wrong.',
    },
    cards: [
      { id: 'sql-window-lag-c1', front: 'Previous row\'s value within each region?', back: 'LAG(value) OVER (PARTITION BY region ORDER BY month)' },
      { id: 'sql-window-lag-c2', kind: 'debug', front: 'January growth is NULL in your 2026 report. Why?', back: 'December was filtered out before LAG ran. Include it in the input, then filter after the window function.' },
    ],
  },

  {
    id: 'sql-cohorts', skill: 'sql', level: 'Advanced', title: 'Cohorts, retention & funnels', minutes: 15, prereqs: ['sql-window-lag'],
    summary: 'Follow groups of customers over time: do they come back?',
    lesson: `
### A cohort is a group that starts together
Usually customers grouped by the **month of their first order**. Then ask: what % of each cohort ordered again 1, 2, 3 months later?

| Cohort | Size | Month +1 | Month +2 | Month +3 |
|---|---|---|---|---|
| 2025-01 | 76 | 13% | 11% | 9% |
| 2025-02 | 67 | 9% | 12% | 10% |

### Building it
1. Cohort per customer: \`MIN(month of order)\`
2. Activity: every month each customer ordered
3. **Month offset** = (activity year × 12 + month) − (cohort year × 12 + month)
4. Count **distinct customers** per cohort and offset, and divide by the cohort size

### Funnels
A funnel counts how many make it through each step: signed up → first order → second order → third order. Each step must count people who reached **at least** that step.

### Traps
- The cohort must use the customer's **first-ever** order, not their first order in the report period.
- Count **customers**, not orders.
- Recent cohorts haven't had time to reach month +3. Don't compare them with older ones unfairly.
- Small cohorts make percentages noisy.`,
    tryIt: {
      id: 'sql-cohorts-try', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'cohort', ordered: true,
      prompt: '**Cohort sizes:** the number of customers whose **first completed order** fell in each month of **2025**. Return cohort_month (YYYY-MM) and customers, in month order.',
      answer: "WITH f AS (SELECT customer_id, MIN(order_date) AS first_order FROM orders WHERE status = 'completed' AND customer_id IS NOT NULL GROUP BY customer_id) SELECT strftime('%Y-%m', first_order) AS cohort_month, COUNT(*) FROM f WHERE first_order BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY cohort_month ORDER BY cohort_month;",
      hints: ['First, each customer\'s first completed order date (MIN), across ALL history.', 'Then keep the 2025 ones and group by month.'], explain: 'Computing MIN over all history, and only then filtering to 2025, ensures a 2024 customer isn\'t counted as "new" in 2025.',
    },
    practice: [
      { id: 'sql-cohorts-p1', type: 'sql', db: 'cedarline', title: 'Retention matrix', difficulty: 5, concept: 'cohort', ordered: true, business: 'E-commerce', minutes: 25,
        prompt: 'For cohorts **January–June 2025** (month of first completed order), return cohort_month, cohort_size and the **% of the cohort that placed a completed order in month +1, +2 and +3** (m1_pct, m2_pct, m3_pct, 1 decimal). Use customer_id as it is.',
        answer: "WITH co AS (SELECT customer_id, strftime('%Y-%m', order_date) AS m FROM orders WHERE status = 'completed' AND customer_id IS NOT NULL), cohort AS (SELECT customer_id, MIN(m) AS cm FROM co GROUP BY customer_id), act AS (SELECT DISTINCT c.customer_id, c.cm, (CAST(substr(co.m,1,4) AS INTEGER) * 12 + CAST(substr(co.m,6,2) AS INTEGER)) - (CAST(substr(c.cm,1,4) AS INTEGER) * 12 + CAST(substr(c.cm,6,2) AS INTEGER)) AS k FROM cohort c JOIN co ON co.customer_id = c.customer_id) SELECT cm AS cohort_month, SUM(k = 0) AS cohort_size, ROUND(100.0 * SUM(k = 1) / SUM(k = 0), 1) AS m1_pct, ROUND(100.0 * SUM(k = 2) / SUM(k = 0), 1) AS m2_pct, ROUND(100.0 * SUM(k = 3) / SUM(k = 0), 1) AS m3_pct FROM act WHERE cm BETWEEN '2025-01' AND '2025-06' GROUP BY cm ORDER BY cm;",
        hints: ['Three steps: every customer-month with an order; each customer\'s cohort month; the month offset between them.', 'Offset = (year*12 + month) − (cohort year*12 + cohort month). Count DISTINCT customers per offset, divided by the cohort size (offset 0).'], explain: 'Retention in months +1 to +3 sits around 8–18% here. Cohorts of 70–150 customers move a few points by chance, so look for patterns, not single cells.' },
      { id: 'sql-cohorts-p2', type: 'sql', db: 'hr', title: 'Hire cohort survival', difficulty: 4, concept: 'cohort', ordered: true, business: 'HR', minutes: 12,
        prompt: 'For people **hired in 2022, 2023 and 2024**: hire_year, hires, and the **% still employed 12 months after their hire date** (not terminated within 365 days). 1 decimal, oldest year first.',
        answer: "SELECT substr(hire_date, 1, 4) AS hire_year, COUNT(*) AS hires, ROUND(100.0 * SUM(CASE WHEN termination_date IS NULL OR julianday(termination_date) - julianday(hire_date) > 365 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_after_12m FROM employees WHERE hire_date BETWEEN '2022-01-01' AND '2024-12-31' GROUP BY hire_year ORDER BY hire_year;",
        hints: ['Group by hire year. "Survived" = never terminated, or terminated more than 365 days after hire.'], explain: 'First-year survival falls sharply for later hire years, a warning sign HR will want to explain.' },
    ],
    quiz: [
      { id: 'sql-cohorts-q1', type: 'mc', difficulty: 3, concept: 'cohort', prompt: 'A customer\'s cohort should be based on…', options: ['Their first order in the report period', 'Their first-ever order', 'Their most recent order', 'Their signup region'], answer: 1, explain: 'Otherwise returning customers look "new" in each period.' },
      { id: 'sql-cohorts-q2', type: 'mc', difficulty: 3, concept: 'cohort', prompt: 'Your newest cohort (last month) shows 0% at month +3. What is the right reading?', options: ['Retention collapsed', 'Not enough time has passed to observe month +3', 'A bug in COUNT', 'Customers stopped liking us'], answer: 1, explain: 'Recent cohorts are censored: they haven\'t had time to reach later months.' },
      { id: 'sql-cohorts-q3', type: 'tf', difficulty: 3, concept: 'funnel', prompt: 'True or false: in a funnel, each step should count only people who also completed the previous steps.', answer: true, explain: 'A funnel is a sequence: second order ⊆ first order ⊆ signed up.' },
    ],
    challenge: {
      id: 'sql-cohorts-ch', type: 'sql', db: 'cedarline', title: 'Signup-to-loyal funnel', difficulty: 4, concept: 'funnel', business: 'E-commerce', minutes: 12,
      prompt: 'Of customers who **signed up in 2025**: how many placed **at least 1**, **at least 2** and **at least 3** completed orders (any time)? Return one row: signed_up, one_plus, two_plus, three_plus.',
      answer: "WITH c AS (SELECT cu.customer_id, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = cu.customer_id AND o.status = 'completed') AS n FROM customers cu WHERE cu.signup_date BETWEEN '2025-01-01' AND '2025-12-31') SELECT COUNT(*) AS signed_up, SUM(n >= 1) AS one_plus, SUM(n >= 2) AS two_plus, SUM(n >= 3) AS three_plus FROM c;",
      hints: ['Count completed orders per 2025 signup (keep people with 0).', 'Then SUM(n >= 1), SUM(n >= 2), SUM(n >= 3).'],
      explain: 'The biggest drop is usually from first to second order. That is where retention efforts pay off.',
    },
    cards: [
      { id: 'sql-cohorts-c1', front: 'What is a cohort analysis?', back: 'Grouping customers by when they started (e.g. first-order month) and tracking what share is still active N months later.' },
      { id: 'sql-cohorts-c2', front: 'Month offset formula?', back: '(activity_year*12 + activity_month) − (cohort_year*12 + cohort_month)' },
    ],
  },

  {
    id: 'sql-business', skill: 'sql', level: 'Advanced', title: 'Segmentation, anomalies & efficient queries', minutes: 15, prereqs: ['sql-window-rank'],
    summary: 'Answer real business questions end to end, and write queries that stay fast.',
    lesson: `
### Segmentation
Group customers by behaviour, e.g. spend bands (High / Medium / Low), recency, or frequency. Build a per-customer table in a CTE, then apply CASE.

### Anomalies in SQL
Compare each value with its own history:
\`\`\`sql
WITH m AS (SELECT supplier_id, ingredient_id, strftime('%Y-%m', delivery_date) AS month,
                  SUM(line_total) / SUM(qty) AS unit_cost
           FROM purchases GROUP BY 1, 2, 3)
SELECT *, unit_cost / LAG(unit_cost) OVER (PARTITION BY supplier_id, ingredient_id ORDER BY month) - 1 AS change
FROM m;
\`\`\`
Flag big jumps, then investigate. A price rise, a supplier switch, or a unit mix-up?

### Writing efficient queries
- Filter early (WHERE before joining big tables, or inside the CTE).
- Select only the columns you need; avoid \`SELECT *\` in production.
- Join on indexed keys (IDs); avoid functions on the join/filter column (\`WHERE strftime(...) = '2026'\` can't use an index, but \`WHERE date >= '2026-01-01'\` can).
- Aggregate before joining big fact tables together.
- Use \`EXPLAIN QUERY PLAN\` to see whether an index is used.

### Business definitions first
"Turnover rate", "food cost %" and "active customer" all need a written definition before you write SQL. Write it at the top of your query as a comment.`,
    tryIt: {
      id: 'sql-business-try', type: 'sql', db: 'cedarline', difficulty: 3, concept: 'segmentation',
      prompt: 'Segment customers by **2025 completed net spend**: "High" (1000+), "Medium" (300 to 999.99), "Low" (below 300). Only customers who bought in 2025. Return segment and the number of customers.',
      answer: `WITH s AS (SELECT o.customer_id, SUM(${NET}) AS spend FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'completed' AND o.customer_id IS NOT NULL AND o.order_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY o.customer_id) SELECT CASE WHEN spend >= 1000 THEN 'High' WHEN spend >= 300 THEN 'Medium' ELSE 'Low' END AS segment, COUNT(*) FROM s GROUP BY segment;`,
      hints: ['CTE: spend per customer in 2025. Then CASE on spend and count.'], explain: 'A per-customer table first, then segments: that pattern underlies RFM, CLV and most customer analytics.',
    },
    practice: [
      { id: 'sql-business-p1', type: 'sql', db: 'restaurant', title: 'Supplier price jumps', difficulty: 4, concept: 'anomaly', business: 'Restaurant', minutes: 15,
        prompt: 'Find **ingredients whose average unit cost from the same supplier rose more than 10% from May 2026 to June 2026** (all restaurants together; average = total spend ÷ total qty). Return ingredient name, supplier name, may_cost, june_cost (2 dp) and pct_change (1 dp).',
        answer: "WITH m AS (SELECT supplier_id, ingredient_id, strftime('%Y-%m', delivery_date) AS month, SUM(line_total) / SUM(qty) AS c FROM purchases WHERE delivery_date BETWEEN '2026-05-01' AND '2026-06-30' GROUP BY 1, 2, 3), p AS (SELECT a.supplier_id, a.ingredient_id, a.c AS may_cost, b.c AS june_cost FROM m a JOIN m b ON b.supplier_id = a.supplier_id AND b.ingredient_id = a.ingredient_id AND b.month = '2026-06' WHERE a.month = '2026-05') SELECT i.name, s.name, ROUND(may_cost, 2), ROUND(june_cost, 2), ROUND(100 * (june_cost / may_cost - 1), 1) AS pct_change FROM p JOIN ingredients i ON i.ingredient_id = p.ingredient_id JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE june_cost > may_cost * 1.10;",
        hints: ['Average cost per supplier, ingredient and month = SUM(line_total) / SUM(qty). Use a weighted average, not AVG(unit_cost).', 'Put May and June side by side (a self-join or conditional aggregation), then keep rises above 10%.'], explain: 'Beef mince and ribeye jumped ~22% at Prime Meats in June: a key clue for the restaurant food-cost investigation.' },
      { id: 'sql-business-p2', type: 'sql', db: 'restaurant', title: 'Actual food cost % by restaurant', difficulty: 5, concept: 'kpi', business: 'Restaurant', minutes: 20,
        prompt: 'Food cost % for **June–August 2026** per restaurant = (stock on 2026-05-31 + purchases Jun–Aug − stock on 2026-08-31) ÷ net sales Jun–Aug × 100. Use inventory_counts.value_at_cost for stock. Return restaurant name and food_cost_pct (2 dp).',
        answer: "WITH open AS (SELECT restaurant_id, SUM(value_at_cost) AS v FROM inventory_counts WHERE count_date = '2026-05-31' GROUP BY 1), close AS (SELECT restaurant_id, SUM(value_at_cost) AS v FROM inventory_counts WHERE count_date = '2026-08-31' GROUP BY 1), buy AS (SELECT restaurant_id, SUM(line_total) AS v FROM purchases WHERE delivery_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1), sales AS (SELECT restaurant_id, SUM(net_sales) AS v FROM daily_sales WHERE sale_date BETWEEN '2026-06-01' AND '2026-08-31' GROUP BY 1) SELECT r.name, ROUND(100 * (open.v + buy.v - close.v) / sales.v, 2) AS food_cost_pct FROM restaurants r JOIN open ON open.restaurant_id = r.restaurant_id JOIN close ON close.restaurant_id = r.restaurant_id JOIN buy ON buy.restaurant_id = r.restaurant_id JOIN sales ON sales.restaurant_id = r.restaurant_id;",
        hints: ['Four totals per restaurant (opening stock, closing stock, purchases, sales), each in its own CTE.', 'Cost of food used = opening + purchases − closing. Divide by net sales.'], explain: 'Downtown ~27%, Riverside ~28%, Airport ~29%, all up from ~25.7% in January–May. Purchases alone would mislead: stock changes matter.' },
    ],
    quiz: [
      { id: 'sql-business-q1', type: 'mc', difficulty: 3, concept: 'optimization', prompt: "Which filter can use an index on order_date?", options: ["WHERE strftime('%Y', order_date) = '2026'", "WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'", "WHERE substr(order_date,1,4) = '2026'", 'All three equally'], answer: 1, explain: 'Wrapping the column in a function hides it from the index. Compare the raw column with a range.' },
      { id: 'sql-business-q2', type: 'mc', difficulty: 3, concept: 'optimization', prompt: 'Two big fact tables (sales and purchases) need to appear in one result per restaurant. Best approach?', options: ['Join them directly on restaurant_id, then sum', 'Aggregate each per restaurant first, then join the totals', 'UNION them and GROUP BY', 'Use DISTINCT'], answer: 1, explain: 'Joining raw fact tables multiplies rows. Aggregate first, then join.' },
      { id: 'sql-business-q3', type: 'tf', difficulty: 3, concept: 'kpi', prompt: 'True or false: "turnover rate" has one universal definition, so you can skip writing it down.', answer: false, explain: 'Voluntary only or all leavers? Average headcount or start-of-year headcount? Write the definition before the SQL.' },
    ],
    challenge: {
      id: 'sql-business-ch', type: 'sql', db: 'hr', title: 'Turnover by department (2025)', difficulty: 5, concept: 'kpi', business: 'HR', minutes: 20,
      context: 'The HR director wants voluntary turnover by department for 2025. The definition: voluntary leavers in 2025 ÷ average headcount, where average headcount = (headcount on 2025-01-01 + headcount on 2025-12-31) ÷ 2. Someone counts in headcount on a date if hired on or before it and not terminated on or before it.',
      prompt: 'Return department name, voluntary_leavers, avg_headcount (1 dp) and turnover_pct (1 dp), highest turnover first.',
      ordered: true,
      answer: "WITH hc AS (SELECT department_id, (SUM(CASE WHEN hire_date <= '2025-01-01' AND (termination_date IS NULL OR termination_date > '2025-01-01') THEN 1 ELSE 0 END) + SUM(CASE WHEN hire_date <= '2025-12-31' AND (termination_date IS NULL OR termination_date > '2025-12-31') THEN 1 ELSE 0 END)) / 2.0 AS avg_hc, SUM(CASE WHEN termination_type = 'Voluntary' AND termination_date BETWEEN '2025-01-01' AND '2025-12-31' THEN 1 ELSE 0 END) AS leavers FROM employees GROUP BY department_id) SELECT d.name, hc.leavers AS voluntary_leavers, ROUND(hc.avg_hc, 1) AS avg_headcount, ROUND(100.0 * hc.leavers / hc.avg_hc, 1) AS turnover_pct FROM hc JOIN departments d ON d.department_id = hc.department_id ORDER BY turnover_pct DESC;",
      hints: ['Everything can be done in one pass over employees with conditional sums: headcount at each date, and 2025 voluntary leavers.', 'Divide by 2.0 (not 2) to avoid integer division.'],
      explain: 'Customer Service and Transport lead with ~40% voluntary turnover. Transport was ~13% in 2023, so something changed. The HR project digs into why.',
    },
    cards: [
      { id: 'sql-business-c1', front: 'Why is WHERE strftime(\'%Y\', d) = \'2026\' slow on big tables?', back: 'The function on the column prevents index use. Filter with a range: d >= \'2026-01-01\' AND d < \'2027-01-01\'.' },
      { id: 'sql-business-c2', kind: 'interview', front: 'Interview: how do you validate a complex query\'s result?', back: 'Check row counts at each step, reconcile totals to a known source, test edge cases (NULLs, ties, empty groups), spot-check a few records by hand, and make sure the business definition is written down.' },
    ],
  },
];
