// Excel topics added by the content expansion. They slot into the existing path (see `after`).
// Formula tasks are graded by the calculator; file tasks against numbers computed from the files
// (tools/data/answers-excel.js).

const REGIONAL = { label: 'regional_sales_2026.xlsx', path: 'excel/regional_sales_2026.xlsx' };
const DAILY = { label: 'harbor_pine_daily_kpis_2026.xlsx', path: 'excel/harbor_pine_daily_kpis_2026.xlsx' };

const ORDERS12 = [412, 398, 405, 1210, 389, 401, 377, 415, 60, 408, 395, 402];

export const EXCEL_EXTRA = [
  // ================================================================ tables, sorting, filtering
  {
    id: 'xl-tables', skill: 'excel', level: 'Beginner', title: 'Tables, sorting & filtering', minutes: 14,
    prereqs: ['xl-basics'], after: 'xl-basics',
    summary: 'Turn a range into a Table, then sort and filter it without breaking anything.',
    lesson: `
### Why a Table?
Select any cell in your data and press **Ctrl+T** (Insert → Table). Excel now knows where the data starts and ends:
- New rows added at the bottom become part of the Table, so formulas, charts and PivotTables built on it grow with it.
- Formulas typed in one row fill the whole column automatically.
- The header row stays visible when you scroll, with filter buttons on every column.
- A **Total Row** (Table Design → Total Row) adds SUM, AVERAGE or COUNT that respect the current filter.

Give the Table a name (Table Design → Table Name), for example **Orders**. Then a formula can say \`=SUM(Orders[Revenue])\` instead of \`=SUM(G2:G1201)\`, and it still works when the Table grows. These are **structured references**.

### Sorting
- One column: click in it → Data → **A→Z** or **Z→A**.
- Several levels: Data → **Sort** → Add Level. Example: Region A→Z, then Revenue largest to smallest.
- Sort the **whole table**, never a single column on its own: that scrambles the rows.
- Want to get back to the original order? Add an ID or row-number column before sorting.

### Filtering
Click a header's arrow:
- **Text filters:** equals, begins with, contains ("Foot*" style wildcards also work).
- **Number filters:** greater than, top 10, above average.
- **Date filters:** this month, last quarter, between two dates.
Filters on several columns combine with AND: Region = West **and** Channel = Online.

The status bar shows "12 of 1200 records found". A filtered SUM in a normal cell still adds **all** rows; use the Total Row or \`SUBTOTAL(9, …)\` to add only the visible ones.

### Good habits
- One header row, no blank rows or columns inside the data, one type of value per column.
- Clear filters before you share the file (Data → Clear), or say clearly what is filtered.
- Freeze the top row (View → Freeze Panes) on sheets that are not Tables.`,
    tryIt: {
      id: 'xl-tables-try', type: 'number', kind: 'calculation', difficulty: 1, concept: 'sort-filter',
      prompt: 'A Table has 1,200 orders. You filter Region = West, which shows 310 rows. Then you also filter Channel = Online, which keeps 40% of those. How many rows are visible?',
      answer: 124, verify: () => Math.round(310 * 0.4),
      hints: ['Filters on two columns combine: both conditions must be true.'],
      explain: 'The second filter works on the 310 West rows: 40% of 310 = 124 rows are both West and Online.',
    },
    practice: [
      {
        id: 'xl-tables-p1', type: 'numbers', title: 'Sort and filter the order list', difficulty: 2, concept: 'sort-filter', business: 'Retail', minutes: 20,
        files: [REGIONAL], dataset: 'regional-sales',
        skills_tested: ['tables', 'sort-filter'],
        context: 'The sales manager asks five quick questions about the first half of 2026. Every answer can be found with a Table, a sort and a few filters.',
        prompt: 'Open **regional_sales_2026.xlsx**, click inside the Orders data and press **Ctrl+T**. Use sorting, filters and the Total Row (no PivotTable needed) to answer.',
        questions: [
          { label: 'Revenue of the largest single order', unit: '$' },
          { label: 'Order ID of that order', accept: ['ORD-50844', '50844'] },
          { label: 'Online Footwear orders in the West region' },
          { label: 'Total revenue of the 10 largest orders', unit: '$' },
          { label: 'Store orders in the North worth less than 50' },
        ],
        answersKey: 'xl-regional-sort',
        hints: [
          'Sort Revenue largest to smallest: the first row answers questions 1 and 2, and the first ten rows answer question 4.',
          'For question 3, filter Region = West, Channel = Online and Category = Footwear, then read "x of 1200 records found" in the status bar.',
          'Number Filters → Less Than 50 on Revenue, together with Region and Channel filters.',
        ],
        explain: 'A Table with filters answers most "how many" and "which one" questions in seconds. Read the record count in the status bar, and clear the filters before moving on so the next question starts from all the data.',
      },
    ],
    quiz: [],
    challenge: null,
    cards: [
      { id: 'xl-tables-c1', front: 'Why turn data into a Table (Ctrl+T)?', back: 'It grows with new rows, fills formulas down, keeps headers visible, and gives names like Orders[Revenue] that other formulas and pivots can rely on.' },
      { id: 'xl-tables-c2', front: 'A SUM under a filtered column adds hidden rows too. What adds only the visible rows?', back: 'The Table\'s Total Row, or SUBTOTAL(9, range).' },
    ],
  },

  // ================================================================ scenario analysis
  {
    id: 'xl-scenario', skill: 'excel', level: 'Advanced', title: 'Scenario & what-if analysis', minutes: 20,
    prereqs: ['xl-analysis'], after: 'xl-analysis',
    summary: 'Build models whose assumptions can be switched, stretched and tested before a decision is made.',
    lesson: `
### Separate assumptions from calculations
Put every assumption (price, volume, costs, growth) in one clearly labelled **input block**, and make every calculation point at it. A reader can then see what the model believes, and change it in one place.

### Scenarios in one table
Lay out the assumptions side by side:

| Assumption | Worst | Expected | Best |
|---|---|---|---|
| Price | 22 | 25 | 27 |
| Units | 7,000 | 9,000 | 10,500 |

Pick one with a selector cell and a lookup: \`=INDEX(B2:D2, MATCH(Scenario, B1:D1, 0))\` or \`=XLOOKUP(Scenario, B1:D1, B2:D2)\`. The whole model follows the selector.

### Break-even
Break-even units = fixed costs ÷ (price − variable cost per unit). Below it you lose money; above it every unit adds its margin.

### Sensitivity
Change one assumption at a time and watch the result: price −10%, −5%, 0, +5%, +10%. If a small change in one input swings profit a lot, that input deserves the most care (and the most debate).

### Excel's what-if tools
- **Goal Seek** (Data → What-If Analysis): "what price gives a profit of 50,000?" It changes one input until a formula hits a target.
- **Data Table**: a grid of results for one or two changing inputs, handy for sensitivity tables.
- **Scenario Manager**: stores named sets of inputs and builds a summary. Useful, but a scenario table like the one above is easier to see and check.

### Turning a model into a decision
- State the assumptions next to the answer.
- Show the range (worst to best), not only the expected case.
- Name the assumption that matters most, and what would have to be true for the decision to change.`,
    tryIt: {
      id: 'xl-scenario-try', type: 'formula', kind: 'formula-writing', difficulty: 3, concept: 'scenario',
      prompt: 'In **B6**, calculate the **break-even number of units**: fixed costs ÷ (price − variable cost per unit).',
      grid: { rows: [['Input', 'Value'], ['Price per unit', 25], ['Variable cost per unit', 12], ['Fixed costs', 58500], [null, null], ['Break-even units', null]] },
      target: 'B6', answer: '=B4/(B2-B3)',
      hints: ['Each unit contributes price minus variable cost towards the fixed costs.', '=B4/(B2-B3)'],
      explain: '58,500 ÷ (25 − 12) = 4,500 units. Pointing at the input cells means the answer updates when any assumption changes.',
    },
    practice: [
      {
        id: 'xl-scenario-p1', type: 'formula', title: 'One formula, three scenarios', difficulty: 3, concept: 'scenario', business: 'Retail', minutes: 15,
        context: 'Finance keeps worst, expected and best assumptions side by side. You want profit for each scenario from one formula copied down.',
        prompt: 'In **B8**, calculate profit, (price − variable cost) × units − fixed costs, for the scenario named in **A8**, looking the assumptions up by name. Copy it down to B10.',
        grid: { rows: [['Assumption', 'Worst', 'Expected', 'Best'], ['Price', 22, 25, 27], ['Units', 7000, 9000, 10500], ['Variable cost', 13, 12, 12], ['Fixed costs', 60000, 60000, 62000], [null, null, null, null], ['Scenario', 'Profit', null, null], ['Worst', null, null, null], ['Expected', null, null, null], ['Best', null, null, null]] },
        target: 'B8', fillTo: 'B10',
        answer: '=(INDEX($B$2:$D$2,MATCH(A8,$B$1:$D$1,0))-INDEX($B$4:$D$4,MATCH(A8,$B$1:$D$1,0)))*INDEX($B$3:$D$3,MATCH(A8,$B$1:$D$1,0))-INDEX($B$5:$D$5,MATCH(A8,$B$1:$D$1,0))',
        hints: [
          'MATCH(A8, $B$1:$D$1, 0) says which column the scenario is in; INDEX then picks that column from each assumption row.',
          'XLOOKUP(A8, $B$1:$D$1, $B$2:$D$2) is another way to get the price. Lock the ranges with $ so they do not move when copied.',
        ],
        explain: 'Worst gives 3,000, Expected 57,000 and Best 95,500. The range matters as much as the expected value: in the worst case the product barely covers its fixed costs.',
      },
      {
        id: 'xl-scenario-p2', type: 'formula', title: 'Price sensitivity table', difficulty: 4, concept: 'what-if', business: 'Retail', minutes: 15,
        context: 'Marketing wants to know what a price change does to the money left after variable costs (the contribution). For every 1% the price rises, volume falls by 1.5% (the elasticity in B5). Fixed costs do not change with price, so they are left out.',
        prompt: 'In **B8**, calculate the contribution for the price change in **A8**: new price = price × (1 + change), new units = units × (1 + elasticity × change), contribution = (new price − variable cost) × new units. Copy down to B12.',
        grid: { rows: [['Input', 'Value'], ['Price', 25], ['Units', 9000], ['Variable cost', 12], ['Elasticity', -1.5], [null, null], ['Price change', 'Contribution'], [-0.1, null], [-0.05, null], [0, null], [0.05, null], [0.1, null]] },
        target: 'B8', fillTo: 'B12',
        answer: '=($B$2*(1+A8)-$B$4)*$B$3*(1+$B$5*A8)',
        hints: [
          'Lock every input with $ and leave A8 relative so each row uses its own price change.',
          'New units: $B$3*(1+$B$5*A8). New price: $B$2*(1+A8).',
        ],
        explain: 'A 10% cut gives 108,675, no change 117,000, +5% about 118,631 and +10% about 118,575. The gain flattens out after about +5%: beyond that, each extra point of price costs almost as much volume as it earns. The table shows the shape at a glance, which a single "what if" cannot.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'xl-scenario-ch', type: 'numbers', title: 'Should the Airport close on Mondays?', difficulty: 4, concept: 'scenario', business: 'Restaurant', minutes: 40,
      files: [{ label: 'sales_daily.csv', path: 'restaurant/sales_daily.csv' }, { label: 'labor_daily.csv', path: 'restaurant/labor_daily.csv' }], dataset: 'olive-ember',
      skills_tested: ['scenario', 'sumifs', 'business-questions'],
      context: 'Olive & Ember\'s area manager believes the Airport restaurant is quiet on Mondays and wants to close that day. The owners ask for numbers, using these assumptions: food and drink cost 30% of net sales; 40% of Monday customers would come on another day instead; Kitchen and Front of house staff would not be paid for Mondays, but Management salaries are paid anyway.',
      prompt: 'For **January to August 2026**, add a weekday column to both files (\`=TEXT(date,"dddd")\` or \`=WEEKDAY(date,2)\`), total the Airport\'s Monday figures, and work out what closing would have changed.',
      questions: [
        { label: 'Airport net sales on Mondays, January to August 2026', unit: '$' },
        { label: 'Airport Monday labour cost, Kitchen and Front of house only', unit: '$' },
        { label: 'Change in profit from closing on Mondays (a loss is a negative number)', unit: '$' },
      ],
      answersKey: 'xl-airport-monday',
      hints: [
        'SUMIFS with three conditions: restaurant, weekday = Monday, and date in 2026 (">="&DATE(2026,1,1)). For labour, add Role <> "Management".',
        'Lost sales = Monday sales × (1 − 40%). Each lost dollar of sales also saves 30 cents of food cost, so profit falls by lost sales × (1 − 30%).',
        'Profit change = − lost sales × 70% + labour saved.',
      ],
      explain: 'Mondays are not quiet at the Airport: about $126,000 of sales in eight months. Even if 40% of those customers come back another day, closing gives up about $52,900 of margin to save about $28,500 of wages: profit falls by roughly $24,400. The idea only works if far more customers switch days, which is the assumption to test before deciding.',
    },
    cards: [
      { id: 'xl-scenario-c1', front: 'Break-even units?', back: 'Fixed costs ÷ (price − variable cost per unit).' },
      { id: 'xl-scenario-c2', kind: 'decision', front: 'Goal Seek, Data Table or a scenario table?', back: 'Goal Seek: find the input that hits a target. Data Table: results for a range of one or two inputs. Scenario table + lookup: named sets of assumptions everyone can see.' },
    ],
  },

  // ================================================================ anomaly detection
  {
    id: 'xl-anomaly', skill: 'excel', level: 'Advanced', title: 'Spotting anomalies', minutes: 20,
    prereqs: ['xl-scenario'], after: 'xl-scenario',
    summary: 'Flag unusual values with rules you can defend, then find out whether they are errors or real events.',
    lesson: `
### Unusual compared with what?
An anomaly is a value that does not fit its context. Decide the context first: the same weekday, the same month last year, the same store, the usual ratio.

### Three rules you can build in Excel
**z-score**: how many standard deviations a value is from the mean.
\`=(B2-AVERAGE($B$2:$B$100))/STDEV.S($B$2:$B$100)\` (or \`STANDARDIZE\`). Beyond ±3 is rare in well-behaved data. The mean and standard deviation are themselves pulled by the outliers, so extreme values can hide each other.

**IQR fences**: robust to extremes.
Q1 = \`QUARTILE.INC(range,1)\`, Q3 = \`QUARTILE.INC(range,3)\`, IQR = Q3 − Q1.
Flag values below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR (the box-plot rule).

**Compared with a typical value**: flag days above 1.5 × the **median**, or more than 30% away from the same weekday's median.

### Look at ratios, not only totals
Totals rise and fall with traffic. Ratios expose problems that totals hide:
- orders ÷ sessions (conversion rate) doubles on one day → an import may have loaded orders twice
- card orders ÷ all orders collapses → a payment method failed
- refunds ÷ orders jumps → fraud, a faulty batch or a policy change
- sessions triple while orders stay flat → bot traffic

### Error or real event?
Check the context before acting:
1. Is there a known event (a sale, an email, a public holiday) on that day?
2. Do the related numbers move together (sessions, orders and revenue all up)?
3. Does the raw data look right (duplicated IDs, a missing store, a changed unit)?

Real events stay in the data and get a note. Errors get fixed at the source, or excluded with a clear note. Never delete a value just because it is unusual.

### Make it visible
Conditional formatting (Home → Conditional Formatting → New Rule → use a formula) can colour flagged rows with the same formula as your flag column.`,
    tryIt: {
      id: 'xl-anomaly-try', type: 'formula', kind: 'formula-writing', difficulty: 3, concept: 'anomaly',
      prompt: 'In **C2**, calculate the **z-score** of the day\'s orders: (B2 − the average of B2:B13) ÷ the sample standard deviation of B2:B13. Copy it down to C13.',
      grid: { rows: [['Day', 'Orders', 'z-score'], ...ORDERS12.map((v, i) => [`Day ${i + 1}`, v, null])] },
      target: 'C2', fillTo: 'C13', answer: '=(B2-AVERAGE($B$2:$B$13))/STDEV.S($B$2:$B$13)',
      hints: ['Lock the range with $ so every row compares with the same 12 days.', '=(B2-AVERAGE($B$2:$B$13))/STDEV.S($B$2:$B$13), or STANDARDIZE(B2, AVERAGE(…), STDEV.S(…)).'],
      explain: 'Day 4 (1,210 orders) has a z-score near 2.9, but Day 9 (60 orders) only reaches about −1.45: the huge value inflates the standard deviation and hides the other outlier. That is why a robust rule such as IQR fences is worth having too.',
    },
    practice: [
      {
        id: 'xl-anomaly-p1', type: 'formula', title: 'IQR fences', difficulty: 3, concept: 'anomaly', business: 'E-commerce', minutes: 12,
        context: 'The summary block already holds the quartiles of the 12 days: Q1 in F1 and Q3 in F2.',
        prompt: 'In **C2**, return **"Check"** if B2 is below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR (IQR = Q3 − Q1), otherwise **"OK"**. Copy down to C13.',
        grid: { rows: [['Day', 'Orders', 'Flag', null, 'Q1', 393.5], ['Day 1', ORDERS12[0], null, null, 'Q3', 409], ...ORDERS12.slice(1).map((v, i) => [`Day ${i + 2}`, v, null])] },
        target: 'C2', fillTo: 'C13', answer: '=IF(OR(B2<$F$1-1.5*($F$2-$F$1),B2>$F$2+1.5*($F$2-$F$1)),"Check","OK")',
        hints: ['The fences are $F$1-1.5*($F$2-$F$1) and $F$2+1.5*($F$2-$F$1).', 'OR(test1, test2) is TRUE when either test is true.'],
        explain: 'The fences are 370.25 and 432.25, so both Day 4 (1,210) and Day 9 (60) are flagged, which the z-score alone missed. Quartiles are barely moved by one extreme value.',
      },
      {
        id: 'xl-anomaly-p2', type: 'numbers', title: 'Which days look wrong?', difficulty: 4, concept: 'anomaly', business: 'E-commerce', minutes: 35,
        files: [DAILY], dataset: 'hp-daily',
        skills_tested: ['anomaly', 'outliers'],
        context: 'Harbor & Pine\'s head of e-commerce wants a daily conversion check before the half-year review. Conversion rate = orders ÷ sessions.',
        prompt: 'Open the **Daily** sheet, add a Conversion column, and use QUARTILE.INC for the IQR fences (Q1 − 1.5 × IQR, Q3 + 1.5 × IQR).',
        questions: [
          { label: 'Median daily conversion rate', unit: '%', percent: true, tolerance: 0.02 },
          { label: 'Days outside the IQR fences' },
          { label: 'Date with the highest conversion rate (type it as YYYY-MM-DD)', date: true },
          { label: 'Date with the lowest conversion rate (type it as YYYY-MM-DD)', date: true },
        ],
        answersKey: 'xl-hp-daily',
        hints: [
          'Conversion in I2: =C2/B2, filled down. MEDIAN and QUARTILE.INC work on the whole column.',
          'Flag each day with the IQR rule, then COUNTIF the flags. Sorting by conversion gives the highest and lowest days.',
          'Look at the other columns on the two extreme days: which number is out of line, orders or sessions?',
        ],
        explain: 'Eleven days fall outside the fences, and they are not all problems: the Spring Sale lifted conversion for real. The two extremes are different stories. On 11 February orders doubled with normal traffic (an import loaded the day twice); on 15 June sessions tripled with normal orders (bot traffic). A flag starts an investigation; it does not end one.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'xl-anomaly-ch', type: 'numbers', title: 'Errors or events?', difficulty: 4, concept: 'anomaly', business: 'E-commerce', minutes: 45,
      files: [DAILY], dataset: 'hp-daily',
      skills_tested: ['anomaly', 'validation', 'data-quality'],
      context: 'Before the half-year revenue figure goes to the board, Harbor & Pine\'s finance lead asks you to find the days where the data cannot be trusted, and to separate them from genuine marketing events (listed on the **Calendar** sheet).',
      prompt: 'Use ratios (card orders ÷ orders, refunds, orders compared with the median day) and the Calendar sheet to answer.',
      questions: [
        { label: 'Date when card payments failed (type it as YYYY-MM-DD)', date: true },
        { label: 'Refund value on the day of the refund spike', unit: '$' },
        { label: 'Days with more than 1.5 × the median daily orders' },
        { label: 'Of those days, how many fall on a Calendar event?' },
        { label: 'Half-year revenue after removing the duplicated import (the one big day with no event)', unit: '$' },
      ],
      answersKey: 'xl-hp-context',
      hints: [
        'Add Card share = Card Orders ÷ Orders and sort it: one day stands far below the rest.',
        'For the event question, check each big day against the From and To dates on the Calendar sheet (COUNTIFS with <= and >= works).',
        'On the duplicated day every order was loaded twice, so half of that day\'s revenue is not real.',
      ],
      explain: 'Six of the seven big days are real (the Spring Sale and the Summer lookbook campaign). The seventh, 11 February, has doubled orders and revenue with normal traffic and no event: a duplicated import. Removing half of that day gives the revenue the board should see. The card outage and refund spike are real events of a different kind: they belong in the report as incidents, not as data errors.',
    },
    cards: [
      { id: 'xl-anomaly-c1', front: 'IQR fences?', back: 'Q1 − 1.5 × IQR and Q3 + 1.5 × IQR, with IQR = Q3 − Q1. Robust to extreme values, unlike the mean and standard deviation.' },
      { id: 'xl-anomaly-c2', kind: 'scenario', front: 'Orders doubled on one day but sessions were normal. First suspicion?', back: 'A data problem (a duplicated import), not a sales success: check for repeated order IDs.' },
    ],
  },
];
