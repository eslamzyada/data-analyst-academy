// Extra practice tasks, spread across business areas: restaurant, NGO, HR, finance,
// inventory, e-commerce, logistics, marketing and sales. Every task has a business reason
// for existing, hints that lead rather than give, and a worked explanation.
export const PRACTICE = [
  // ================================================================ Excel: formulas
  {
    id: 'bp-xl-basics-p3', topic: 'xl-basics', type: 'formula', title: 'Cost per portion in a kitchen',
    difficulty: 2, concept: 'cell-refs', business: 'Restaurant', minutes: 5,
    context: 'The head chef buys ingredients in bulk but needs to know what one portion costs, so menu prices can be set with a known margin.',
    prompt: 'In **E2**, calculate the **cost per portion**: pack cost ÷ portions per pack. It must still be right when copied down to E7.',
    grid: {
      rows: [
        ['Ingredient', 'Pack size', 'Pack cost', 'Portions per pack', 'Cost per portion'],
        ['Chicken thigh', '5 kg', 32.50, 25, null],
        ['Arborio rice', '10 kg', 18.00, 80, null],
        ['Parmesan', '1 kg', 21.40, 40, null],
        ['Olive oil', '5 l', 27.00, 100, null],
        ['Basil', '500 g', 9.20, 50, null],
        ['Butter', '2 kg', 14.60, 60, null],
      ],
    },
    target: 'E2', fillTo: 'E7', answer: '=C2/D2',
    hints: [
      'One portion costs the whole pack divided by how many portions it makes.',
      'Both numbers are on the same row, so no $ locks are needed here: plain C2/D2 moves down correctly.',
    ],
    explain: '`=C2/D2` divides each row\'s pack cost by that row\'s portion count. Because both references are relative, row 3 becomes `=C3/D3` and so on. Chicken works out at £1.30 a portion, which is the number that belongs on a costing sheet.',
  },
  {
    id: 'bp-xl-basics-p4', topic: 'xl-basics', type: 'formula', title: 'Donation total per campaign',
    difficulty: 2, concept: 'cell-refs', business: 'NGO', minutes: 5,
    context: 'A small charity runs several appeals. Gift Aid adds 25% to every eligible donation, and the rate is held in one cell so it can be updated when the rules change.',
    prompt: 'In **D2**, calculate the **total value including Gift Aid** for each campaign: donations × (1 + the rate in G1). Copy it down to D6.',
    grid: {
      rows: [
        ['Campaign', 'Donors', 'Donations', 'With Gift Aid', null, 'Gift Aid rate', 0.25],
        ['Winter Appeal', 412, 18600, null],
        ['School Meals', 138, 7240, null],
        ['Water Project', 96, 12300, null],
        ['Emergency Fund', 271, 9950, null],
        ['Legacy Giving', 12, 41000, null],
      ],
    },
    target: 'D2', fillTo: 'D6', answer: '=C2*(1+$G$1)',
    hints: [
      'Gift Aid adds a percentage on top, so the total is the donation multiplied by (1 + rate).',
      'The rate sits in one cell for every row. What has to happen to that reference when you copy down?',
    ],
    explain: '`=C2*(1+$G$1)`. The `$` signs keep every row pointing at G1; without them row 3 would read G2, which is empty, and the totals would collapse to the plain donation amount.',
  },
  {
    id: 'bp-xl-countif-p3', topic: 'xl-countif', type: 'formula', title: 'Absence days by department',
    difficulty: 2, concept: 'countif-sumif', business: 'HR', minutes: 6,
    context: 'HR is checking whether absence is concentrated in particular departments before raising it with managers.',
    prompt: 'In **F2**, total the **absence days** for the department named in E2. Copy it down to F5 so each department gets its own total.',
    grid: {
      rows: [
        ['Employee', 'Department', 'Absence days', null, 'Department', 'Total days'],
        ['A. Silva', 'Warehouse', 11, null, 'Warehouse', null],
        ['B. Okafor', 'Drivers', 4, null, 'Drivers', null],
        ['C. Nowak', 'Warehouse', 7, null, 'Office', null],
        ['D. Ahmed', 'Office', 2, null, 'Workshop', null],
        ['E. Brennan', 'Drivers', 9, null],
        ['F. Costa', 'Warehouse', 3, null],
        ['G. Lindqvist', 'Workshop', 6, null],
        ['H. Ibrahim', 'Drivers', 1, null],
      ],
    },
    target: 'F2', fillTo: 'F5', answer: '=SUMIF($B$2:$B$9,E2,$C$2:$C$9)',
    hints: [
      'You are adding up numbers, but only on rows where the department matches. Which function does "add if"?',
      'The data ranges must not move as you copy down, but the department you are looking for must. Which references need $?',
    ],
    explain: '`=SUMIF($B$2:$B$9, E2, $C$2:$C$9)`: look in the department column, match whatever is in E2 on this row, and add the matching absence days. The two data ranges are locked so they stay put; E2 is relative so row 3 looks up Drivers. Warehouse totals 21 days, the highest of the four.',
  },
  {
    id: 'bp-xl-sumifs-p3', topic: 'xl-sumifs', type: 'formula', title: 'Returns value by reason and channel',
    difficulty: 3, concept: 'sumifs', business: 'E-commerce', minutes: 7,
    context: 'Returns are eating into margin. Before deciding what to fix, the team wants to know how much value is coming back for each reason, split by sales channel.',
    prompt: 'In **G2**, total the **refund value** for rows matching both the reason in F2 **and** the channel "Online". Copy it down to G5.',
    grid: {
      rows: [
        ['Order', 'Reason', 'Channel', 'Refund', null, 'Reason', 'Online refunds'],
        ['SO-1001', 'Wrong size', 'Online', 48.00, null, 'Wrong size', null],
        ['SO-1002', 'Damaged', 'In-Store', 120.00, null, 'Damaged', null],
        ['SO-1003', 'Wrong size', 'Online', 62.50, null, 'Changed mind', null],
        ['SO-1004', 'Changed mind', 'Online', 35.00, null, 'Faulty', null],
        ['SO-1005', 'Damaged', 'Online', 88.00, null],
        ['SO-1006', 'Faulty', 'In-Store', 210.00, null],
        ['SO-1007', 'Wrong size', 'In-Store', 40.00, null],
        ['SO-1008', 'Changed mind', 'Online', 19.90, null],
        ['SO-1009', 'Faulty', 'Online', 145.00, null],
      ],
    },
    target: 'G2', fillTo: 'G5', answer: '=SUMIFS($D$2:$D$10,$B$2:$B$10,F2,$C$2:$C$10,"Online")',
    hints: [
      'Two conditions have to hold at once. SUMIF only takes one, so which function do you need?',
      'SUMIFS puts the range you are adding up first, then pairs of (where to look, what to look for).',
    ],
    explain: '`=SUMIFS($D$2:$D$10, $B$2:$B$10, F2, $C$2:$C$10, "Online")`. The refund column comes first, then the reason pair and the channel pair. Conditions in SUMIFS are combined with AND, so only online rows with that reason are added. Wrong size online totals £110.50.',
  },
  {
    id: 'bp-xl-xlookup-p3', topic: 'xl-xlookup', type: 'formula', title: 'Supplier lead times',
    difficulty: 2, concept: 'xlookup', business: 'Logistics', minutes: 6,
    context: 'The buyer is planning re-order dates and needs each product\'s supplier lead time next to it.',
    prompt: 'In **C2**, bring back the **lead time in days** for the supplier named in B2, using the reference table in columns F and G. Copy it down to C6.',
    grid: {
      rows: [
        ['Product', 'Supplier', 'Lead days', null, null, 'Supplier', 'Lead days'],
        ['Tent', 'Northwind', null, null, null, 'Ridgeline', 5],
        ['Boots', 'Ridgeline', null, null, null, 'Northwind', 12],
        ['Stove', 'Cascade', null, null, null, 'Cascade', 21],
        ['Lamp', 'Ridgeline', null, null, null, 'Fjord Supply', 9],
        ['Jacket', 'Fjord Supply', null],
      ],
    },
    target: 'C2', fillTo: 'C6', answer: '=XLOOKUP(B2,$F$2:$F$5,$G$2:$G$5,"Not found")',
    hints: [
      'You need the row where the supplier name matches, then the number beside it.',
      'The lookup table must not drift as you copy down. Which references need locking, and which must stay relative?',
    ],
    explain: '`=XLOOKUP(B2, $F$2:$F$5, $G$2:$G$5, "Not found")`: look for this row\'s supplier in the list of suppliers, and return the matching lead time. The fourth argument matters: a missing supplier says so rather than returning an error or, worse, a zero that would look like same-day delivery. INDEX+MATCH is equally correct here.',
  },
  {
    id: 'bp-xl-logic-p3', topic: 'xl-logic', type: 'formula', title: 'Flag stock that needs re-ordering',
    difficulty: 2, concept: 'if-logic', business: 'Inventory', minutes: 6,
    context: 'The stockroom wants a simple flag: anything at or below its re-order level, and still active, has to go on this week\'s order.',
    prompt: 'In **E2**, show `Order` when the stock on hand is **at or below** the re-order level **and** the product is active (column D says Yes), otherwise show an empty text `""`. Copy it down to E7.',
    grid: {
      rows: [
        ['SKU', 'On hand', 'Re-order level', 'Active', 'Action'],
        ['TNT-01', 4, 10, 'Yes', null],
        ['BOO-02', 26, 12, 'Yes', null],
        ['STV-03', 8, 8, 'Yes', null],
        ['LMP-04', 2, 6, 'No', null],
        ['JKT-05', 15, 20, 'Yes', null],
        ['SCK-06', 40, 15, 'No', null],
      ],
    },
    target: 'E2', fillTo: 'E7', answer: '=IF(AND(B2<=C2,D2="Yes"),"Order","")',
    hints: [
      'Two things must both be true before you flag a row. Which function combines conditions that way?',
      '"At or below" includes the level itself. Is that `<` or `<=`?',
    ],
    explain: '`=IF(AND(B2<=C2, D2="Yes"), "Order", "")`. The boundary matters: STV-03 sits exactly on its re-order level, so `<=` flags it and `<` would not. LMP-04 is low but discontinued, and the Active check keeps it off the order.',
  },

  // ================================================================ SQL
  {
    id: 'bp-sql-where-p3', topic: 'sql-where', type: 'sql', title: 'Large orders in one quarter',
    difficulty: 2, concept: 'where-logic', business: 'Retail', minutes: 7, db: 'cedarline',
    context: 'The commercial team wants to see which completed orders in the second quarter of 2024 carried a shipping fee, so they can review the free-delivery threshold.',
    prompt: 'List the `order_id`, `order_date` and `shipping_fee` of **completed** orders placed between 1 April 2024 and 30 June 2024 (inclusive) that have a shipping fee above 0. Sort by shipping fee, largest first.',
    starter: 'SELECT order_id, order_date, shipping_fee\nFROM orders\nWHERE ',
    answer: `SELECT order_id, order_date, shipping_fee
FROM orders
WHERE status = 'completed'
  AND order_date >= '2024-04-01' AND order_date < '2024-07-01'
  AND shipping_fee > 0
ORDER BY shipping_fee DESC`,
    ordered: true,
    hints: [
      'Three conditions have to hold at once: the status, the date range and the fee.',
      'Dates are stored as YYYY-MM-DD text, so they compare correctly with >= and <. A half-open range (>= April 1, < July 1) is safer than BETWEEN.',
    ],
    explain: 'Three ANDed conditions, then ORDER BY on the fee. Using `< \'2024-07-01\'` rather than `<= \'2024-06-30\'` is a habit worth forming: it still works if the column ever gains a time component.',
  },
  {
    id: 'bp-sql-groupby-p3', topic: 'sql-groupby', type: 'sql', title: 'Which regions are worth the shipping?',
    difficulty: 3, concept: 'group-by', business: 'Logistics', minutes: 9, db: 'cedarline',
    context: 'Finance is reviewing delivery costs. They want to know, per region, how many completed online orders there were and how much shipping was charged.',
    prompt: 'For **completed** orders on the **Online** channel, show each customer `region` with the number of orders and the total `shipping_fee`. Ignore orders whose customer has no region recorded. Sort by total shipping, highest first.',
    starter: 'SELECT c.region\nFROM orders o\nJOIN customers c ON ',
    answer: `SELECT c.region, COUNT(*) AS orders, SUM(o.shipping_fee) AS total_shipping
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed' AND o.channel = 'Online' AND c.region IS NOT NULL
GROUP BY c.region
ORDER BY total_shipping DESC`,
    ordered: true,
    hints: [
      'The region lives on the customer, not the order, so the two tables have to be joined.',
      'Row-level conditions (status, channel, region not null) go in WHERE, before the grouping happens.',
    ],
    explain: 'Join orders to customers, filter the rows you want, then group. `c.region IS NOT NULL` is the explicit way to drop unknown regions: if you left them in they would group into a NULL row, which is a legitimate thing to show but should be a decision, not an accident.',
    traps: [
      {
        sql: `SELECT c.region, COUNT(*) AS orders, SUM(o.shipping_fee) AS total_shipping
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.channel = 'Online' AND c.region IS NOT NULL
GROUP BY c.region
ORDER BY total_shipping DESC`,
        feedback: 'You included every online order, not just the completed ones. Cancelled and pending orders are in there too, which overstates both the count and the shipping charged.',
        mistake: 'Forgot the status filter',
        concept: 'where-logic',
      },
    ],
  },
  {
    id: 'bp-sql-joins-p3', topic: 'sql-joins', type: 'sql', title: 'Products that have never sold',
    difficulty: 3, concept: 'left-join', business: 'Inventory', minutes: 9, db: 'cedarline',
    context: 'Before the next catalogue is printed, the buyer wants a list of active products that have never appeared on an order line.',
    prompt: 'List the `product_id`, `product_name` and `category` of **active** products (`is_active = 1`) that appear on **no** order lines at all. Sort by product name.',
    starter: 'SELECT p.product_id, p.product_name, p.category\nFROM products p\n',
    answer: `SELECT p.product_id, p.product_name, p.category
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
WHERE p.is_active = 1 AND oi.order_item_id IS NULL
ORDER BY p.product_name`,
    ordered: true,
    hints: [
      'You need every product kept, including the ones with no matching order lines. Which join does that?',
      'After the join, the products that never sold are the ones where every column from the right-hand table is NULL.',
    ],
    explain: 'This is the anti-join pattern: LEFT JOIN to keep all products, then `WHERE oi.order_item_id IS NULL` to keep only those where nothing matched. `NOT EXISTS` is an equally good answer. An INNER JOIN could never work here: it removes exactly the rows you are looking for.',
  },
  {
    id: 'bp-sql-aggregate-p3', topic: 'sql-aggregate', type: 'sql', title: 'How much of the customer data is missing?',
    difficulty: 2, concept: 'null', business: 'Marketing', minutes: 7, db: 'cedarline',
    context: 'Before launching a regional campaign, marketing needs to know how complete the customer records are. A campaign built on incomplete data targets the wrong people.',
    prompt: 'In one row, show the total number of customers, the number with a `region` recorded, and the number with an `acquisition_channel` recorded. Name the columns `total`, `with_region` and `with_channel`.',
    starter: 'SELECT COUNT(*) AS total,\n',
    answer: `SELECT COUNT(*) AS total,
       COUNT(region) AS with_region,
       COUNT(acquisition_channel) AS with_channel
FROM customers`,
    hints: [
      'COUNT(*) and COUNT(column) do different things. What is the difference?',
      'COUNT on a column skips NULLs, so the gap between it and COUNT(*) is exactly the number missing.',
    ],
    explain: '`COUNT(*)` counts rows; `COUNT(column)` counts non-NULL values. Putting them side by side is the quickest completeness check there is, and it belongs at the start of any piece of analysis that depends on those columns.',
  },
  {
    id: 'bp-sql-case-p3', topic: 'sql-case', type: 'sql', title: 'Order size bands',
    difficulty: 3, concept: 'case', business: 'Sales', minutes: 9, db: 'cedarline',
    context: 'Sales want to know whether the business depends on a few large orders or many small ones, so they can decide where to put account-management effort.',
    prompt: 'Using **completed** orders only, band each order by its line value (sum of `quantity * unit_price` per order) into `Small` (under 100), `Medium` (100 to under 500) and `Large` (500 or more). Show each band with the number of orders, named `band` and `orders`. Sort by orders, highest first.',
    starter: 'WITH order_value AS (\n  SELECT o.order_id, SUM(oi.quantity * oi.unit_price) AS value\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  WHERE o.status = \'completed\'\n  GROUP BY o.order_id\n)\n',
    answer: `WITH order_value AS (
  SELECT o.order_id, SUM(oi.quantity * oi.unit_price) AS value
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_id
)
SELECT CASE WHEN value >= 500 THEN 'Large'
            WHEN value >= 100 THEN 'Medium'
            ELSE 'Small' END AS band,
       COUNT(*) AS orders
FROM order_value
GROUP BY band
ORDER BY orders DESC`,
    ordered: true,
    hints: [
      'You need one value per order before you can band it. That is a grouping step of its own.',
      'CASE stops at the first branch that is true, so the order of the WHEN clauses decides the answer.',
    ],
    explain: 'Two steps: a CTE that reduces the order lines to one value per order, then a CASE to band those values. Testing `>= 500` first is essential; if `>= 100` came first every large order would be labelled Medium.',
  },

  // ================================================================ Written / judgement
  {
    id: 'bp-think-metrics-p3', topic: 'think-metrics', type: 'open', title: 'The average that moved the wrong way',
    difficulty: 3, concept: 'denominator', business: 'Restaurant', minutes: 10,
    context: 'A restaurant group reports that average spend per table rose from £41 to £46 after a menu redesign. The owner is delighted. You notice that total revenue fell 7% over the same period, and that the number of covers fell 18%.',
    prompt: 'Write a short note to the owner explaining what the numbers together suggest, and what you would check next. Do not just repeat the figures: say what they mean for the decision.',
    checklist: [
      { point: 'Notes that a higher average with lower revenue means fewer customers, not a better business', keywords: ['fewer', 'covers', 'volume', 'customers', 'revenue fell', 'total'] },
      { point: 'Identifies the denominator change as the cause of the rising average', keywords: ['denominator', 'divided', 'per table', 'fewer tables', 'mix'] },
      { point: 'Suggests looking at whether the lost customers were the lower-spending ones (a mix effect)', keywords: ['mix', 'lost', 'lower spending', 'which customers', 'segment'] },
      { point: 'Proposes a concrete next check, such as revenue per available seat hour, or covers by day part', keywords: ['check', 'covers', 'per seat', 'day part', 'compare', 'before and after'] },
      { point: 'Avoids claiming the redesign caused the fall without evidence', keywords: ['cause', 'not prove', 'other factors', 'seasonal', 'correlat'] },
    ],
    model: 'Average spend per table is up 12%, but that is arithmetic, not good news on its own: revenue is down 7% while covers are down 18%. The average rose mainly because the denominator shrank. In other words, we lost roughly one customer in five, and the ones who left were spending less than the ones who stayed, which lifts the average while the till takes less money.\n\nBefore concluding anything about the redesign, I would check three things. First, covers by day part: if the fall is concentrated at lunch, that points at price or speed rather than the menu as a whole. Second, revenue per available seat hour, which does not flatter us when the restaurant is emptier. Third, whether anything else changed in the period, such as weather, a local closure or a price rise, since a before-and-after comparison on its own cannot separate those from the menu.\n\nMy working view is that the redesign has traded volume for spend, and at these numbers the trade is losing money. I would not reverse it on one period, but I would not celebrate the average either.',
    hints: [
      'A ratio can rise because the top went up or because the bottom went down. Which happened here?',
      'The owner is about to conclude the redesign worked. What evidence would actually support or refute that?',
    ],
    explain: 'The core skill is refusing to read one metric on its own. Average spend, revenue and covers are three views of the same period, and only together do they say what happened. The second skill is separating "what the data shows" from "what caused it": a before-and-after comparison cannot prove causation on its own.',
  },
  {
    id: 'bp-think-trust-p3', topic: 'think-trust', type: 'open', title: 'The report that does not reconcile',
    difficulty: 3, concept: 'data-trust', business: 'Finance', minutes: 10,
    context: 'You have built a sales report showing £2.14m for last quarter. Finance\'s ledger says £2.31m. You are due to present tomorrow morning.',
    prompt: 'Describe how you would find the difference, and what you would do if you could not resolve it before the meeting.',
    checklist: [
      { point: 'Starts by checking scope: what each figure includes and excludes', keywords: ['scope', 'include', 'exclude', 'definition', 'what counts'] },
      { point: 'Names specific likely causes, such as cancelled orders, returns, tax, shipping or date cut-off', keywords: ['cancel', 'return', 'refund', 'tax', 'vat', 'shipping', 'date', 'cut-off', 'timing'] },
      { point: 'Proposes narrowing the gap systematically, for example by comparing totals per month or per region', keywords: ['month', 'region', 'break down', 'narrow', 'split', 'compare'] },
      { point: 'Says they would not present the number as final while it is unexplained', keywords: ['not present', 'flag', 'caveat', 'say', 'unresolved', 'honest'] },
      { point: 'Would state the discrepancy openly rather than quietly using one of the numbers', keywords: ['tell', 'state', 'transparent', 'disclose', 'raise'] },
    ],
    model: 'First I would establish what each number is supposed to mean. £170k is about 7%, which is the size of a definition difference rather than a rounding problem: cancelled orders, refunds, VAT, shipping income, or a different date cut-off would each explain a gap of that order.\n\nThen I would narrow it rather than hunt at random. Comparing the two totals by month usually localises the difference to one period; if it is spread evenly, it is a definition difference, and if it sits in one month it is more likely a data load or a timing issue. Comparing by region or channel does the same job on the other axis. Once it is localised, a sample of individual orders in that slice usually makes the cause obvious.\n\nIf it is still unresolved tomorrow, I would present the report with the discrepancy stated on the first slide: what my figure is, what the ledger says, the size of the gap, and the two or three explanations I have ruled out. What I would not do is quietly present one number and hope nobody checks. A known unexplained difference is a finding; an unmentioned one is how people stop trusting the reporting.',
    hints: [
      'A 7% gap is too big to be rounding. What kinds of things cause a gap that size?',
      'Think about how to localise the difference rather than search the whole dataset at once.',
    ],
    explain: 'Reconciliation is one of the highest-value habits in analysis work, and the method matters: narrow the gap down a dimension at a time rather than guessing. The professional judgement is in the last part. Presenting a known discrepancy openly costs you five minutes; being found out later costs you the credibility of every report you produce.',
  },
];
