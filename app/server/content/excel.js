// EXCEL: Beginner -> Intermediate -> Advanced
// Formula items are graded by evaluating the learner's formula on the grid (HyperFormula),
// so any correct method passes. File items are graded from the Answers sheet or typed answers.

const ORDERS = [
  ['Order', 'Region', 'Channel', 'Amount'],
  ['A-101', 'West', 'Online', 420],
  ['A-102', 'East', 'Store', 180],
  ['A-103', 'West', 'Store', 950],
  ['A-104', 'North', 'Online', 75],
  ['A-105', 'West', 'Online', 610],
  ['A-106', 'South', 'Store', 300],
  ['A-107', 'East', 'Online', 1200],
  ['A-108', 'North', 'Store', 520],
  ['A-109', 'West', 'Online', 88],
  ['A-110', 'South', 'Online', 450],
];

export const EXCEL = [
  // =========================================================================== BEGINNER
  {
    id: 'xl-basics', skill: 'excel', level: 'Beginner', title: 'Formulas & cell references', minutes: 10, prereqs: [],
    summary: 'Write formulas that keep working when you copy them. The $ sign is the secret.',
    lesson: `
### What is it?
A **formula** always starts with \`=\`. Instead of typing numbers into it, you point at **cells**: \`=B2*C2\` means "multiply whatever is in B2 by whatever is in C2". Change B2 and the answer updates. That's the whole point of Excel.

### Copying formulas: relative references
When you copy \`=B2*C2\` from row 2 down to row 3, Excel moves the references with it: row 3 gets \`=B3*C3\`. This is called a **relative** reference, and it's why you can write one formula and fill it down a thousand rows.

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Product | Units | Price | Revenue |
| 2 | Tent | 3 | 120 | \`=B2*C2\` → 360 |
| 3 | Boots | 5 | 80 | \`=B3*C3\` → 400 |

### Locking a cell: absolute references
Sometimes one cell must **not** move, like a tax rate in F1. Write it as \`$F$1\`. Copy \`=D2*$F$1\` down and you get \`=D3*$F$1\`, \`=D4*$F$1\`… The \`$\` locks it.

- \`$F$1\`: column and row locked
- \`$F1\`: column locked, row moves
- \`F$1\`: row locked, column moves

**Shortcut:** click a reference in the formula bar and press **F4** to cycle through these.

### The basic functions
| Function | What it does |
|---|---|
| \`=SUM(D2:D100)\` | adds the numbers |
| \`=AVERAGE(D2:D100)\` | the mean |
| \`=MIN(...)\` / \`=MAX(...)\` | smallest / largest |
| \`=COUNT(...)\` | how many cells hold **numbers** |
| \`=COUNTA(...)\` | how many cells are **not empty** (text counts too) |
| \`=COUNTBLANK(...)\` | how many are empty |

### Common mistakes
- Typing a number into the formula (\`=B2*0.2\`) instead of pointing at the cell with the rate. When the rate changes, your sheet is silently wrong.
- Forgetting the \`$\` and getting nonsense (or zeros) further down the column.
- Using COUNT on a text column: it returns 0, because COUNT only counts numbers.

### Where analysts use it
Every day. Revenue columns, margins, conversions, anything you calculate once and copy down.`,
    tryIt: {
      id: 'xl-basics-try', type: 'formula', difficulty: 1, concept: 'cell-refs',
      prompt: 'Write a formula in **D2** that calculates revenue (Units x Price). It must still work when copied down to D6.',
      grid: { rows: [['Product', 'Units', 'Price', 'Revenue'], ['Tent', 3, 120, null], ['Boots', 5, 80, null], ['Stove', 2, 45, null], ['Lamp', 7, 22, null], ['Jacket', 4, 150, null]] },
      target: 'D2', fillTo: 'D6', answer: '=B2*C2',
      hints: ['Revenue for the Tent row = the Units cell times the Price cell in the same row.', 'Point at B2 and C2 (no $ signs needed, because both should move down with the row).'],
      explain: 'Relative references (B2, C2) move with the row when copied, which is exactly what you want here: row 3 becomes =B3*C3.',
    },
    practice: [
      {
        id: 'xl-basics-p1', type: 'formula', title: 'Add VAT to a price list', difficulty: 2, concept: 'cell-refs', business: 'Retail', minutes: 5,
        context: 'You keep the price list for a small outdoor shop. The VAT rate lives in one cell (G1), so it can be changed in one place.',
        prompt: 'In **D2**, calculate the price **including VAT** (Price x (1 + VAT rate)). It must work when copied down to D7, and use the rate in **G1**.',
        grid: { rows: [['Product', 'Category', 'Price', 'Price incl. VAT', null, 'VAT rate', 0.2], ['Tent', 'Camping', 120, null], ['Boots', 'Footwear', 80, null], ['Stove', 'Cooking', 45, null], ['Lamp', 'Camping', 22, null], ['Jacket', 'Apparel', 150, null], ['Socks', 'Apparel', 12, null]] },
        target: 'D2', fillTo: 'D7', answer: '=C2*(1+$G$1)',
        hints: ['The formula for row 2 is Price x (1 + rate). Which cell has the rate?', 'The rate cell must not move when you copy down, so lock it: $G$1.'],
        explain: '`=C2*(1+$G$1)`: C2 is relative (moves with each row); $G$1 is absolute (always the rate). Without the $, row 3 would look at G2, which is empty, and you would get the price with no VAT.',
      },
      {
        id: 'xl-basics-p2', type: 'formula', title: 'Share of total sales', difficulty: 2, concept: 'cell-refs', business: 'Retail', minutes: 5,
        prompt: 'Column C should show each store\'s **share of total sales** (its sales / the total in B7). Write it in **C2** so it can be copied down to C6.',
        grid: { rows: [['Store', 'Sales', 'Share'], ['Harbour St', 12500, null], ['Mill Lane', 8300, null], ['Station Rd', 15100, null], ['Old Town', 6400, null], ['Riverside', 9700, null], ['Total', 52000, null]] },
        target: 'C2', fillTo: 'C6', answer: '=B2/$B$7',
        hints: ['Share = this store\'s sales divided by the total.', 'The total is always in B7. Lock it with $B$7 before copying down.'],
        explain: 'Each row divides its own sales (relative B2) by the fixed total ($B$7). Format the column as % to read it easily.',
      },
    ],
    quiz: [
      { id: 'xl-basics-q1', type: 'mc', difficulty: 2, concept: 'cell-refs', prompt: 'Cell D2 contains `=B2*$F$1`. You copy D2 to E5. What formula is in E5?', options: ['=B5*$F$1', '=C5*$F$1', '=C5*$G$4', '=B2*$F$1'], answer: 1,
        explain: 'Moving from D2 to E5 is one column right and three rows down. B2 moves the same way to C5; $F$1 is locked and stays.' },
      { id: 'xl-basics-q2', type: 'mc', difficulty: 3, concept: 'cell-refs', prompt: 'B2 contains `=$A2*B$1` (top-left of a multiplication grid). You copy it to D6. What is in D6?', options: ['=$C6*D$5', '=A6*D1', '=$A6*D$1', '=$A2*D$1'], answer: 2,
        explain: '$A2 keeps column A but the row moves (→ $A6). B$1 keeps row 1 but the column moves (→ D$1). Mixed references are how one formula fills a whole grid.' },
      { id: 'xl-basics-q3', type: 'mc', difficulty: 3, concept: 'count-types', prompt: 'A1:A6 contains: 10, "abc", an empty cell, 0, the formula ="" and TRUE. What do COUNT, COUNTA and COUNTBLANK return?', options: ['3, 5, 1', '2, 4, 1', '3, 6, 2', '2, 5, 2'], answer: 3,
        explain: 'COUNT counts numbers only (10 and 0 → 2). COUNTA counts anything not empty, including ="" and TRUE (→ 5). COUNTBLANK counts the empty cell and the ="" cell (→ 2).' },
      { id: 'xl-basics-q4', type: 'fill', difficulty: 1, concept: 'cell-refs', prompt: 'Which key cycles a reference through $A$1, A$1, $A1 and A1 while you edit a formula?', answer: ['F4', 'f4'],
        explain: 'Click on the reference in the formula bar and press F4. (On some laptops, Fn+F4.)' },
      { id: 'xl-basics-q5', type: 'formula', difficulty: 1, concept: 'basic-agg', prompt: 'In **B8**, write a formula for the **average** order amount.',
        grid: { rows: [['Order', 'Amount'], ['A-1', 420], ['A-2', 180], ['A-3', 950], ['A-4', 75], ['A-5', 610], ['A-6', 300], [null, null], ['Average', null]] },
        target: 'B8', answer: '=AVERAGE(B2:B7)', explain: '`=AVERAGE(B2:B7)`. Using SUM(B2:B7)/6 works too, but breaks as soon as a row is added.' },
      { id: 'xl-basics-q6', type: 'tf', difficulty: 1, concept: 'basic-agg', prompt: 'True or false: `=SUM(B2:B10)` returns an error if one of the cells contains text.', answer: false,
        explain: 'False. SUM simply ignores text. That is dangerous: a number stored as text ("120") is silently left out of the total.' },
      { id: 'xl-basics-q7', type: 'mc', difficulty: 2, concept: 'cell-refs', prompt: 'Your VAT formula works in row 2 but shows the price without VAT in every row below. What is the most likely cause?', options: ['The VAT cell is formatted as text', 'The reference to the VAT rate is not locked with $', 'You used * instead of x', 'The sheet is in manual calculation'], answer: 1,
        explain: 'Without $, the reference to the rate slides down to empty cells, so rate = 0 and the price is unchanged.' },
    ],
    challenge: {
      id: 'xl-basics-ch', type: 'file', title: 'The café owner\'s questions', difficulty: 2, business: 'Retail', minutes: 20, concept: 'basic-agg',
      context: 'You help the owner of Summit Coffee, a small chain of three cafés. She exported one busy morning of sales and wants some quick answers before a meeting.',
      prompt: 'Download the workbook, add a Revenue column (Qty x Unit Price), and answer the questions on the **Answers** sheet using formulas. Then upload the file, or type the answers below.',
      files: [{ label: 'summit_coffee_sales.xlsx', path: 'excel/summit_coffee_sales.xlsx' }], dataset: 'summit-coffee', answersKey: 'xl-file-summit',
      questions: [{ label: 'Total revenue' }, { label: 'Number of transactions' }, { label: 'Average revenue per transaction' }, { label: 'Largest single transaction' }, { label: 'Transactions in the Beans category' }, { label: 'Mill Lane store revenue' }],
      hints: ['Start with a Revenue column: in G2, =E2*F2, then fill down.', 'SUM, COUNT(A) or ROWS, AVERAGE and MAX on the Revenue column; COUNTIF on Category; SUMIF on Store.'],
      explain: 'A helper column (Revenue) makes every other question a one-function answer. That is a habit worth keeping: calculate once, reuse everywhere.',
    },
    cards: [
      { id: 'xl-basics-c1', front: 'What does the $ in $F$1 do?', back: 'It locks the reference, so it doesn\'t move when the formula is copied. $F$1 locks both column and row; F$1 only the row; $F1 only the column.' },
      { id: 'xl-basics-c2', front: 'COUNT vs COUNTA?', back: 'COUNT counts cells containing numbers. COUNTA counts every non-empty cell (text, numbers, even formulas returning "").' },
      { id: 'xl-basics-c3', kind: 'scenario', front: 'Your manager changes the tax rate in one cell, but half the sheet doesn\'t update. What went wrong?', back: 'Some formulas have the rate typed in (=B2*0.2) instead of pointing at the rate cell. Always reference assumptions; never hard-code them.' },
    ],
  },

  {
    id: 'xl-logic', skill: 'excel', level: 'Beginner', title: 'IF, AND, OR', minutes: 10, prereqs: ['xl-basics'],
    summary: 'Make Excel decide: label, flag and categorise rows with rules.',
    lesson: `
### What is it?
\`IF\` lets a cell make a decision:

\`\`\`
=IF(test, value_if_true, value_if_false)
\`\`\`

Example: flag big orders. \`=IF(D2>=500, "Big", "Small")\`

### Combining conditions
- \`AND(test1, test2)\`: TRUE only if **all** tests are true
- \`OR(test1, test2)\`: TRUE if **any** test is true
- \`NOT(test)\`: flips TRUE and FALSE

Free shipping for local orders of 100 or more:
\`\`\`
=IF(AND(D2>=100, C2="Local"), "Free", "Paid")
\`\`\`

### More than two outcomes
Nest IFs, checking the biggest threshold first:
\`\`\`
=IF(D2>=1000, "Gold", IF(D2>=500, "Silver", "Bronze"))
\`\`\`
Newer Excel also has \`IFS\`, which is easier to read:
\`=IFS(D2>=1000,"Gold", D2>=500,"Silver", TRUE,"Bronze")\`

### Common mistakes
- Text must be in quotes: \`C2="Local"\`, not \`C2=Local\`.
- Checking thresholds in the wrong order: if \`>=500\` comes before \`>=1000\`, nobody ever gets "Gold".
- Leaving out the "false" part: \`=IF(D2>500,"Yes")\` shows FALSE, which looks like a bug in a report.

### Where analysts use it
Segmenting customers, flagging exceptions ("late", "over budget"), cleaning categories, and building rules that business people can read.`,
    tryIt: {
      id: 'xl-logic-try', type: 'formula', difficulty: 1, concept: 'if-logic',
      prompt: 'In **E2**, show "Big" if the Amount is 500 or more, otherwise "Small". It must work when copied down to E11.',
      grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, 'Size'] : [...r, null])) }, target: 'E2', fillTo: 'E11', answer: '=IF(D2>=500,"Big","Small")',
      hints: ['The test is D2>=500.', '=IF(D2>=500, "Big", "Small"). Text results need quotes.'],
      explain: 'IF(test, if true, if false). The relative reference D2 moves down with each row.',
    },
    practice: [
      {
        id: 'xl-logic-p1', type: 'formula', title: 'Free shipping rule', difficulty: 2, concept: 'if-logic', business: 'E-commerce', minutes: 5,
        context: 'Marketing\'s rule: online orders of 400 or more ship free. Everything else pays shipping.',
        prompt: 'In **E2**, return "Free" when the order is **Online AND** the amount is at least 400, otherwise "Paid". Copy down to E11.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, 'Shipping'] : [...r, null])) }, target: 'E2', fillTo: 'E11', answer: '=IF(AND(C2="Online",D2>=400),"Free","Paid")',
        hints: ['Two conditions must both be true, so use AND(...) as the IF test.', '=IF(AND(C2="Online", D2>=400), "Free", "Paid")'],
        explain: 'AND returns TRUE only when every condition inside it is TRUE. Putting it inside IF turns that into a label.',
      },
      {
        id: 'xl-logic-p2', type: 'formula', title: 'Customer tiers', difficulty: 3, concept: 'if-logic', business: 'Retail', minutes: 7,
        prompt: 'In **E2**, assign a tier: **Gold** for 1000 or more, **Silver** for 400 to 999, **Bronze** below 400. Copy down to E11.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, 'Tier'] : [...r, null])) }, target: 'E2', fillTo: 'E11', answer: '=IF(D2>=1000,"Gold",IF(D2>=400,"Silver","Bronze"))',
        hints: ['Three outcomes need two tests. Check the highest threshold first.', '=IF(D2>=1000,"Gold",IF(D2>=400,"Silver","Bronze")), or use IFS.'],
        explain: 'Nested IFs are checked in order. Because Gold is tested first, a 1,200 order never reaches the Silver test.',
      },
    ],
    quiz: [
      { id: 'xl-logic-q1', type: 'mc', difficulty: 2, concept: 'if-logic', prompt: 'What does `=IF(D2>500,"Yes")` show when D2 is 200?', options: ['An empty cell', '"No"', 'FALSE', '#VALUE!'], answer: 2, explain: 'Without a value_if_false, IF returns FALSE. Always give both outcomes in reports.' },
      { id: 'xl-logic-q2', type: 'mc', difficulty: 2, concept: 'if-logic', prompt: 'Which formula returns "Check" when an order is late (C2="Late") OR over 1000?', options: ['=IF(AND(C2="Late",D2>1000),"Check","")', '=IF(OR(C2="Late",D2>1000),"Check","")', '=IF(C2="Late",D2>1000,"Check")', '=OR(IF(C2="Late"),D2>1000)'], answer: 1, explain: 'OR is TRUE if any of its conditions holds, so a late order and a big order both get "Check".' },
      { id: 'xl-logic-q3', type: 'formula', difficulty: 2, concept: 'if-logic', prompt: 'In **C2**, show "Over" if Actual (B2) is greater than Budget (A2), otherwise "OK".',
        grid: { rows: [['Budget', 'Actual', 'Status'], [5000, 5600, null]] }, target: 'C2', answer: '=IF(B2>A2,"Over","OK")', explain: '=IF(B2>A2,"Over","OK"): the test compares Actual with Budget, then IF picks one of the two labels.' },
      { id: 'xl-logic-q4', type: 'mc', difficulty: 3, concept: 'if-logic', prompt: '`=IF(D2>=500,"Silver",IF(D2>=1000,"Gold","Bronze"))`. What does an order of 1,500 get?', options: ['Gold', 'Silver', 'Bronze', 'An error'], answer: 1, explain: 'The first test (>=500) is already true, so IF stops there. Check the highest threshold first.' },
      { id: 'xl-logic-q5', type: 'tf', difficulty: 1, concept: 'if-logic', prompt: 'True or false: in `=IF(C2=Local,"Free","Paid")` the word Local works without quotes.', answer: false, explain: 'Text must be in quotes ("Local"). Without them Excel looks for a named range called Local and returns #NAME?.' },
    ],
    challenge: {
      id: 'xl-logic-ch', type: 'formula', title: 'Sales bonus rules', difficulty: 3, concept: 'if-logic', business: 'HR', minutes: 10,
      context: 'HR pays a quarterly bonus. The rules: 10% of sales if sales are 50,000 or more AND the rep\'s rating is 4 or 5; 5% if sales are 50,000 or more but the rating is lower; otherwise no bonus.',
      prompt: 'In **D2**, calculate each rep\'s **bonus amount** (a number, not a label). Copy down to D8.',
      grid: { rows: [['Rep', 'Sales', 'Rating', 'Bonus'], ['Ana', 62000, 5, null], ['Ben', 48000, 5, null], ['Chen', 51000, 3, null], ['Dina', 75000, 4, null], ['Eli', 30000, 2, null], ['Farah', 50000, 4, null], ['Gus', 52000, 1, null]] },
      target: 'D2', fillTo: 'D8', answer: '=IF(AND(B2>=50000,C2>=4),B2*0.1,IF(B2>=50000,B2*0.05,0))',
      hints: ['There are three outcomes: 10%, 5% or 0. Check the strictest one first.', '=IF(AND(B2>=50000,C2>=4), B2*10%, IF(B2>=50000, B2*5%, 0))'],
      explain: 'Test the most specific rule first (big sales AND a good rating), then the broader one (big sales), then the default. Watch the boundary: exactly 50,000 counts as "50,000 or more".',
    },
    cards: [
      { id: 'xl-logic-c1', front: 'Write the shape of an IF.', back: '=IF(test, value_if_true, value_if_false)' },
      { id: 'xl-logic-c2', kind: 'debug', front: 'Nested IF gives everyone "Silver", never "Gold". Why?', back: 'The lower threshold is tested first. Put the highest threshold (Gold) first.' },
    ],
  },

  {
    id: 'xl-countif', skill: 'excel', level: 'Beginner', title: 'COUNTIF & SUMIF', minutes: 10, prereqs: ['xl-logic'],
    summary: 'Count and add up only the rows that meet a condition.',
    lesson: `
### What is it?
Most business questions sound like "how many…" or "how much… **for this group**". That's COUNTIF and SUMIF.

\`\`\`
=COUNTIF(range_to_check, condition)
=SUMIF(range_to_check, condition, range_to_add)
=AVERAGEIF(range_to_check, condition, range_to_average)
\`\`\`

### Example
| | A | B | C |
|---|---|---|---|
| 1 | Order | Region | Amount |
| 2 | A-101 | West | 420 |
| 3 | A-102 | East | 180 |
| 4 | A-103 | West | 950 |

- How many West orders? \`=COUNTIF(B2:B4,"West")\` → 2
- West revenue? \`=SUMIF(B2:B4,"West",C2:C4)\` → 1,370
- Orders over 500? \`=COUNTIF(C2:C4,">500")\` → 1

### Conditions
- Exact text: \`"West"\`. It isn't case-sensitive.
- Numbers: \`">500"\`, \`"<=100"\`, \`"<>0"\` (not zero)
- From a cell: \`">"&F1\`. The operator goes in quotes, joined to the cell with \`&\`.
- Wildcards: \`"*tent*"\` means "contains tent"

### Better: point at a criteria cell
Put the region names in a list (F2:F5) and write \`=SUMIF($B$2:$B$100,F2,$C$2:$C$100)\`. Copy it down and you have a summary table. Notice the \`$\`: the data ranges must stay put.

### Common mistakes
- Ranges of different sizes (B2:B100 vs C2:C99) give wrong results.
- \`"West "\` with a trailing space in the data won't match \`"West"\`. Clean the data first.
- Typing \`">"F1\` instead of \`">"&F1\`.`,
    tryIt: {
      id: 'xl-countif-try', type: 'formula', difficulty: 1, concept: 'countif-sumif',
      prompt: 'In **F2**, count how many orders came from the **West** region.',
      grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'West orders'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=COUNTIF(B2:B11,"West")',
      hints: ['Which column holds the region? Count cells in it that equal "West".', '=COUNTIF(B2:B11,"West")'],
      explain: 'COUNTIF(range, condition) counts the cells in the range that meet the condition.',
    },
    practice: [
      {
        id: 'xl-countif-p1', type: 'formula', title: 'Revenue by region table', difficulty: 2, concept: 'countif-sumif', business: 'Retail', minutes: 6,
        context: 'Your manager wants a small summary table next to the data: revenue for each region.',
        prompt: 'In **F2**, write one formula that sums the Amount for the region named in **E2**. It must work when copied down to F5.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, 'Region', 'Revenue'] : i <= 4 ? [...r, ['West', 'East', 'North', 'South'][i - 1], null] : r)) },
        target: 'F2', fillTo: 'F5', answer: '=SUMIF($B$2:$B$11,E2,$D$2:$D$11)',
        hints: ['SUMIF(range with regions, the region in E2, range with amounts).', 'The data ranges must not move when copied down: $B$2:$B$11 and $D$2:$D$11. E2 should move.'],
        explain: 'Pointing at E2 instead of typing "West" turns one formula into a whole summary table. Locking the data ranges keeps them fixed.',
      },
      {
        id: 'xl-countif-p2', type: 'formula', title: 'Big orders', difficulty: 2, concept: 'countif-sumif', business: 'Retail', minutes: 4,
        prompt: 'In **F2**, count the orders whose Amount is **above the value in E2** (currently 500), so the threshold can be changed without editing the formula.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, 'Threshold', 'Orders above'] : i === 1 ? [...r, 500, null] : r)) },
        target: 'F2', answer: '=COUNTIF(D2:D11,">"&E2)',
        hints: ['The condition "greater than E2" is written as ">"&E2.', '=COUNTIF(D2:D11,">"&E2)'],
        explain: 'Operators in COUNTIF/SUMIF conditions are text, so ">" goes in quotes and is joined to the cell with &.',
      },
    ],
    quiz: [
      { id: 'xl-countif-q1', type: 'formula', difficulty: 2, concept: 'countif-sumif', prompt: 'In **F2**, return the **total Amount of Online orders**.', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Online total'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=SUMIF(C2:C11,"Online",D2:D11)', explain: '=SUMIF(C2:C11,"Online",D2:D11): the first range is checked, the last range is added.' },
      { id: 'xl-countif-q2', type: 'mc', difficulty: 2, concept: 'countif-sumif', prompt: 'Which condition counts amounts of at least the value in H1?', options: ['">=H1"', '">="&H1', '>=H1', '"&>=H1"'], answer: 1, explain: 'The operator is text in quotes, joined to the cell with &. ">=H1" would look for the text "H1".' },
      { id: 'xl-countif-q3', type: 'formula', difficulty: 2, concept: 'countif-sumif', prompt: 'In **F2**, calculate the **average Amount of Store orders**.', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Avg store order'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=AVERAGEIF(C2:C11,"Store",D2:D11)', explain: 'AVERAGEIF(range to check, condition, range to average).' },
      { id: 'xl-countif-q4', type: 'tf', difficulty: 2, concept: 'countif-sumif', prompt: 'True or false: `=COUNTIF(B2:B11,"west")` will not count cells containing "West" because the case is different.', answer: false, explain: 'COUNTIF is not case-sensitive. Extra spaces, however, DO break matches.' },
      { id: 'xl-countif-q5', type: 'mc', difficulty: 3, concept: 'countif-sumif', prompt: 'A SUMIF for "West" returns less than you expect, although the region column looks right. What is the most likely cause?', options: ['SUMIF only adds the first 100 rows', 'Some cells contain "West " with a trailing space', 'The Amount column is formatted as currency', 'SUMIF needs the data sorted'], answer: 1, explain: 'Invisible trailing spaces make "West " a different value. TRIM the column, or use "West*".' },
    ],
    challenge: {
      id: 'xl-countif-ch', type: 'formula', title: 'Rep scoreboard', difficulty: 3, concept: 'countif-sumif', business: 'Sales', minutes: 10,
      context: 'The sales director wants a scoreboard: for each rep, their total closed-won value. The deal list will grow every week.',
      prompt: 'In **G2**, sum the Value of **Won** deals for the rep named in **F2**. Copy down to G4. (Hint: one condition is the rep, the other is Stage = Won.)',
      grid: { rows: [['Deal', 'Rep', 'Stage', 'Value', null, 'Rep', 'Won value'], ['D1', 'Ana', 'Won', 12000, null, 'Ana', null], ['D2', 'Ben', 'Lost', 8000, null, 'Ben', null], ['D3', 'Ana', 'Won', 5000, null, 'Chen', null], ['D4', 'Chen', 'Won', 9000], ['D5', 'Ben', 'Won', 15000], ['D6', 'Ana', 'Lost', 7000], ['D7', 'Chen', 'Open', 11000], ['D8', 'Ben', 'Won', 4000]] },
      target: 'G2', fillTo: 'G4', answer: '=SUMIFS($D$2:$D$9,$B$2:$B$9,F2,$C$2:$C$9,"Won")',
      hints: ['Two conditions means SUMIFS (with an S): SUMIFS(sum range, range1, condition1, range2, condition2).', '=SUMIFS($D$2:$D$9, $B$2:$B$9, F2, $C$2:$C$9, "Won")'],
      explain: 'SUMIF handles one condition; SUMIFS handles many (the sum range comes FIRST in SUMIFS). You\'ll use it constantly in the Intermediate level.',
    },
    cards: [
      { id: 'xl-countif-c1', front: 'Argument order of SUMIF vs SUMIFS?', back: 'SUMIF(check range, condition, sum range). SUMIFS(sum range, check range 1, condition 1, …). In SUMIFS the sum range comes first.' },
      { id: 'xl-countif-c2', front: 'How do you write "greater than the value in F1" as a condition?', back: '">"&F1' },
    ],
  },

  {
    id: 'xl-textdates', skill: 'excel', level: 'Beginner', title: 'Text & date functions', minutes: 12, prereqs: ['xl-basics'],
    summary: 'Pull apart names, codes and emails; calculate with dates.',
    lesson: `
### Text functions you'll use constantly
| Function | Example | Result |
|---|---|---|
| \`LEFT(text, n)\` | \`=LEFT("TNT-104",3)\` | TNT |
| \`RIGHT(text, n)\` | \`=RIGHT("TNT-104",3)\` | 104 |
| \`MID(text, start, n)\` | \`=MID("2026-03-15",6,2)\` | 03 |
| \`LEN(text)\` | \`=LEN("Tent")\` | 4 |
| \`FIND(what, text)\` | \`=FIND("@","ana@x.com")\` | 4 |
| \`TRIM(text)\` | removes extra spaces | |
| \`UPPER / LOWER / PROPER\` | change the case | \`PROPER("jane doe")\` → Jane Doe |
| \`CONCAT\` or \`&\` | join text | \`=A2&" "&B2\` |

**First name from "Jane Doe":** \`=LEFT(A2, FIND(" ", A2) - 1)\`. FIND returns the position of the space; take everything before it.

### Dates are just numbers
Excel stores a date as a number of days (1 Jan 2026 = 46023). So you can subtract dates:
- Days between: \`=C2-B2\`
- Year / month / day: \`=YEAR(B2)\`, \`=MONTH(B2)\`, \`=DAY(B2)\`
- Build a date: \`=DATE(2026,3,1)\`
- Month end: \`=EOMONTH(B2,0)\`
- Label a month: \`=TEXT(B2,"yyyy-mm")\`

### Watch out: dates stored as text
If a date is **left-aligned**, it's probably text. YEAR() and date maths will fail, or ignore it. Convert it (DATEVALUE, Text to Columns or Power Query) before analysing.

### Common mistakes
- LEFT with a fixed number of characters when the lengths vary (names!). Use FIND.
- Forgetting the -1: \`LEFT(A2, FIND(" ", A2))\` includes the space.
- \`TEXT()\` returns text, not a date. Use it for labels, not for calculations.`,
    tryIt: {
      id: 'xl-textdates-try', type: 'formula', difficulty: 2, concept: 'text-funcs',
      prompt: 'In **B2**, extract the **first name** from the full name in A2. It must work for every row when copied down to B6.',
      grid: { rows: [['Full name', 'First name'], ['Jane Doe', null], ['Omar Haddad', null], ['Li Wei', null], ['Priya Raman', null], ['Christopher Lee', null]] },
      target: 'B2', fillTo: 'B6', answer: '=LEFT(A2,FIND(" ",A2)-1)',
      hints: ['The first name is everything before the space. FIND(" ", A2) tells you where the space is.', '=LEFT(A2, FIND(" ", A2) - 1)'],
      explain: 'FIND gives the position of the space (5 in "Jane Doe"). LEFT takes that many characters minus one, so the space is excluded. It works for names of any length.',
    },
    practice: [
      {
        id: 'xl-textdates-p1', type: 'formula', title: 'Days to deliver', difficulty: 1, concept: 'dates', business: 'Logistics', minutes: 4,
        prompt: 'In **D2**, calculate how many **days** each shipment took (Delivered minus Shipped). Copy down to D6.',
        grid: { rows: [['Shipment', 'Shipped', 'Delivered', 'Days'], ['S-1', '2026-03-02', '2026-03-05', null], ['S-2', '2026-03-03', '2026-03-10', null], ['S-3', '2026-03-05', '2026-03-06', null], ['S-4', '2026-03-09', '2026-03-16', null], ['S-5', '2026-03-10', '2026-03-12', null]] },
        target: 'D2', fillTo: 'D6', answer: '=C2-B2',
        hints: ['Dates are numbers, so you can subtract them.', '=C2-B2'],
        explain: 'Because a date is a count of days, Delivered − Shipped = the days in between. Format the result as a Number, not a Date.',
      },
      {
        id: 'xl-textdates-p2', type: 'formula', title: 'Clean up customer names', difficulty: 2, concept: 'text-funcs', business: 'Marketing', minutes: 5,
        context: 'Names typed at the till come in every style: "  jane DOE", "OMAR haddad  ".',
        prompt: 'In **B2**, return the name with extra spaces removed and proper capitalisation (Jane Doe). Copy down to B5.',
        grid: { rows: [['Raw name', 'Clean name'], ['  jane DOE', null], ['OMAR haddad  ', null], ['li   wei', null], ['Priya RAMAN', null]] },
        target: 'B2', fillTo: 'B5', answer: '=PROPER(TRIM(A2))',
        hints: ['Two jobs: remove spaces (TRIM) and fix capitals (PROPER).', '=PROPER(TRIM(A2)). Functions can wrap each other.'],
        explain: 'TRIM removes leading/trailing spaces and squeezes double spaces to one; PROPER capitalises each word. Nesting them does both in one cell.',
      },
      {
        id: 'xl-textdates-p3', type: 'formula', title: 'Category code from SKU', difficulty: 2, concept: 'text-funcs', business: 'Retail', minutes: 4,
        prompt: 'SKUs look like "TNT-104": the letters before the dash are the category code. In **B2**, return the code (TNT). Copy down to B5.',
        grid: { rows: [['SKU', 'Code'], ['TNT-104', null], ['FTW-2201', null], ['AC-7', null], ['SLP-39', null]] },
        target: 'B2', fillTo: 'B5', answer: '=LEFT(A2,FIND("-",A2)-1)',
        hints: ['The codes are different lengths (AC vs TNT), so use FIND to locate the dash.', '=LEFT(A2, FIND("-", A2) - 1)'],
        explain: 'Same pattern as first names: find the separator, take everything before it.',
      },
    ],
    quiz: [
      { id: 'xl-textdates-q1', type: 'formula', difficulty: 2, concept: 'text-funcs', prompt: 'In **B2**, return the **domain** of the email (everything after the @).', grid: { rows: [['Email', 'Domain'], ['maria.lopez@trailmail.example', null]] }, target: 'B2', answer: '=MID(A2,FIND("@",A2)+1,LEN(A2))', explain: '=MID(A2, FIND("@",A2)+1, LEN(A2)) starts right after the @. =RIGHT(A2, LEN(A2)-FIND("@",A2)) works too, and so does TEXTAFTER(A2,"@") in new Excel.' },
      { id: 'xl-textdates-q2', type: 'mc', difficulty: 2, concept: 'text-numbers', prompt: 'A column of dates is left-aligned and YEAR() returns #VALUE! for some rows. What is most likely?', options: ['The workbook is in manual calculation', 'Those dates are stored as text', 'YEAR only works on dates after 2000', 'The column is too narrow'], answer: 1, explain: 'Real dates are numbers and right-align by default. Left-aligned "dates" are text and must be converted.' },
      { id: 'xl-textdates-q3', type: 'formula', difficulty: 1, concept: 'dates', prompt: 'In **B2**, return the **month number** of the date in A2.', grid: { rows: [['Order date', 'Month'], ['2026-05-17', null]] }, target: 'B2', answer: '=MONTH(A2)', explain: '=MONTH(A2) returns 5. YEAR and DAY work the same way on a real date.' },
      { id: 'xl-textdates-q4', type: 'mc', difficulty: 2, concept: 'text-funcs', prompt: '`=LEFT(A2, FIND(" ", A2))` on "Jane Doe" returns…', options: ['"Jane"', '"Jane " (with a trailing space)', '"Doe"', '#VALUE!'], answer: 1, explain: 'FIND returns 5 (the space\'s position), so LEFT takes 5 characters including the space. Subtract 1.' },
      { id: 'xl-textdates-q5', type: 'tf', difficulty: 2, concept: 'dates', prompt: 'True or false: `=TEXT(A2,"yyyy-mm")` returns a date you can use in date calculations.', answer: false, explain: 'TEXT returns text. Great for labels and grouping keys, but not for date maths.' },
    ],
    challenge: {
      id: 'xl-textdates-ch', type: 'formula', title: 'Build an order key', difficulty: 3, concept: 'text-funcs', business: 'Retail', minutes: 8,
      context: 'Finance matches orders using a key made of the store code, a dash and the order month, e.g. "W02-2026-03".',
      prompt: 'In **C2**, build the key from the Store (A2) and the Order date (B2), formatted as **STORE-YYYY-MM**. Copy down to C5.',
      grid: { rows: [['Store', 'Order date', 'Key'], ['W02', '2026-03-14', null], ['N01', '2026-11-02', null], ['E01', '2026-01-30', null], ['S01', '2026-07-07', null]] },
      target: 'C2', fillTo: 'C5', answer: '=A2&"-"&TEXT(B2,"yyyy-mm")',
      hints: ['Join text with &. You need the store, a "-", then the date as text.', '=A2 & "-" & TEXT(B2, "yyyy-mm")'],
      explain: 'TEXT turns the date into the pattern you want; & glues the pieces together. Keys like this are how analysts join data from two systems.',
    },
    cards: [
      { id: 'xl-textdates-c1', front: 'First name from "Jane Doe" in A2?', back: '=LEFT(A2, FIND(" ", A2) - 1)' },
      { id: 'xl-textdates-c2', front: 'Why can you subtract two dates in Excel?', back: 'Dates are stored as numbers (days since 1900), so Delivered − Shipped gives the days in between.' },
      { id: 'xl-textdates-c3', kind: 'debug', front: 'YEAR() gives #VALUE! for a few rows. First thing to check?', back: 'Whether those "dates" are text (left-aligned, or ISTEXT() is TRUE). Convert them first.' },
    ],
  },

  {
    id: 'xl-cleaning', skill: 'excel', level: 'Beginner', title: 'Cleaning data & Excel Tables', minutes: 12, prereqs: ['xl-textdates'],
    summary: 'Real exports are messy. Learn the standard clean-up routine.',
    lesson: `
### Why this matters
Most of an analyst's time goes on cleaning data. A total built on dirty data *looks* right and is wrong.

### The routine (do it every time)
1. **Look before you calculate.** Scroll the data. Sort each column A→Z and Z→A: oddities float to the top and bottom.
2. **Make it a Table** (Ctrl+T). It gets filters, banded rows, auto-expanding ranges and structured references like \`=SUM(Sales[Amount])\`.
3. **Remove duplicates** (Data → Remove Duplicates). But first decide which columns define a duplicate.
4. **Fix spaces and case:** \`=TRIM()\`, \`=PROPER()\`, and \`=CLEAN()\` for invisible characters.
5. **Fix numbers stored as text:** \`=VALUE()\`, or remove "$" and "," first: \`=VALUE(SUBSTITUTE(A2,"$",""))\`.
6. **Standardise categories:** "Sales", "sales ", "SALES" and "Sls" are the same department. Use a mapping, or TRIM+PROPER.
7. **Check blanks:** \`=COUNTBLANK()\`. Decide whether blank means 0, unknown, or an error.

### How to spot the problems quickly
| Problem | Quick check |
|---|---|
| Numbers stored as text | green triangles, left-aligned, SUM ignores them |
| Duplicates | \`=COUNTIF(A:A,A2)>1\` or Conditional Formatting → Duplicate Values |
| Inconsistent categories | a filter drop-down, or \`=UNIQUE(C2:C500)\` |
| Hidden spaces | \`=LEN(A2)\` vs \`=LEN(TRIM(A2))\` |

### Common mistakes
- Removing "duplicates" that are really two legitimate orders: check the ID column.
- Cleaning by typing over values (not repeatable). Use formulas, or Power Query.
- Deleting rows with blanks without asking what the blank means.`,
    tryIt: {
      id: 'xl-cleaning-try', type: 'formula', difficulty: 2, concept: 'text-numbers',
      prompt: 'Salaries were exported as text like "$38,400". In **B2**, turn each into a real number. Copy down to B5.',
      grid: { rows: [['Salary (text)', 'Salary'], ['$38,400', null], ['$41,250', null], ['$52,000', null], ['$29,875', null]] },
      target: 'B2', fillTo: 'B5', answer: '=VALUE(SUBSTITUTE(SUBSTITUTE(A2,"$",""),",",""))',
      hints: ['Remove the $ and the comma first, then convert with VALUE.', '=VALUE(SUBSTITUTE(SUBSTITUTE(A2,"$",""),",",""))'],
      explain: 'SUBSTITUTE(text, old, new) removes each unwanted character; VALUE turns the remaining digits into a number that SUM and AVERAGE can use.',
    },
    practice: [
      {
        id: 'xl-cleaning-p1', type: 'file', title: 'Clean the HR roster', difficulty: 3, concept: 'cleaning', business: 'HR', minutes: 25,
        context: 'HR sent you a staff roster for Operations and Customer Service. Before anyone uses it, they want the basic numbers. The file has the usual export problems.',
        prompt: 'Download the roster, clean it (duplicates, department spellings, salaries and dates stored as text) and answer the questions on the **Answers** sheet. Upload the file, or type your answers.',
        files: [{ label: 'brightpath_roster_messy.xlsx', path: 'excel/brightpath_roster_messy.xlsx' }], dataset: 'brightpath-roster', answersKey: 'xl-file-roster',
        questions: [{ label: 'Unique employees' }, { label: 'Unique employees in Operations' }, { label: 'Average salary (2 decimals)' }, { label: 'Hired in 2024' }, { label: 'Employees with no email' }],
        hints: ['Remove duplicates using Employee ID. Then fix Department: "Ops", "operations" and "OPERATIONS " are all Operations.', 'Salaries like "$38,400" need SUBSTITUTE + VALUE before AVERAGE. Some hire dates are text, so check them with ISTEXT().'],
        explain: 'The trap is that every formula "works" on the raw file, and gives the wrong answer. Duplicates inflate counts, text salaries are ignored by AVERAGE, and department spellings split your counts.',
      },
    ],
    quiz: [
      { id: 'xl-cleaning-q1', type: 'mc', difficulty: 1, concept: 'cleaning', prompt: 'What is the keyboard shortcut to turn a range into an Excel Table?', options: ['Ctrl+T', 'Ctrl+E', 'Alt+=', 'Ctrl+Shift+L'], answer: 0, explain: 'Ctrl+T. (Ctrl+Shift+L only toggles filters.)' },
      { id: 'xl-cleaning-q2', type: 'mc', difficulty: 2, concept: 'text-numbers', prompt: 'SUM over a column returns 3,652 but you count 3,677 units by hand. A few cells have green triangles. What is going on?', options: ['SUM rounds numbers', 'Some quantities are stored as text and SUM skips them', 'Hidden rows are excluded', 'The column has too many rows'], answer: 1, explain: 'Numbers stored as text are silently ignored by SUM. Convert them with VALUE or Text to Columns.' },
      { id: 'xl-cleaning-q3', type: 'formula', difficulty: 2, concept: 'cleaning', prompt: 'In **B2**, return TRUE if the value in A2 has extra spaces (its length changes after TRIM).', grid: { rows: [['Region', 'Has extra spaces?'], ['West ', null]] }, target: 'B2', answer: '=LEN(A2)<>LEN(TRIM(A2))', explain: 'Compare LEN before and after TRIM. It is a quick way to detect invisible spaces.' },
      { id: 'xl-cleaning-q4', type: 'tf', difficulty: 2, concept: 'cleaning', prompt: 'True or false: two rows with the same customer name are always duplicates and one should be removed.', answer: false, explain: 'Different people share names, and one customer can place two real orders. Define duplicates by a key (such as an order or line ID), not by a name.' },
      { id: 'xl-cleaning-q5', type: 'mc', difficulty: 2, concept: 'cleaning', prompt: 'Structured reference: what does `=SUM(Sales[Amount])` add up?', options: ['Only cell A1 on the worksheet called Sales', 'The whole Amount column of the Table named Sales, even after new rows are added', 'Only the rows that are visible after filtering', 'The first 100 rows of the Amount column'], answer: 1, explain: 'Table references grow automatically as rows are added. That is a big reason to use Tables.' },
    ],
    challenge: {
      id: 'xl-cleaning-ch', type: 'formula', title: 'Standardise department names', difficulty: 3, concept: 'cleaning', business: 'HR', minutes: 8,
      prompt: 'Departments were typed by hand. In **B2**, return a clean name: remove extra spaces and use proper capitals ("customer  service " → "Customer Service"). Copy down to B6.',
      grid: { rows: [['Department (raw)', 'Department'], ['operations', null], ['CUSTOMER SERVICE', null], ['Customer  Service ', null], [' sales', null], ['Operations', null]] },
      target: 'B2', fillTo: 'B6', answer: '=PROPER(TRIM(A2))',
      hints: ['Two problems: spacing and capitalisation.', '=PROPER(TRIM(A2))'],
      explain: 'TRIM also squeezes the double space in "Customer  Service". Abbreviations like "Ops" still need a mapping table (or a lookup), because no formula can guess them.',
    },
    cards: [
      { id: 'xl-cleaning-c1', front: 'Quick way to find hidden spaces in A2?', back: '=LEN(A2)<>LEN(TRIM(A2)) returns TRUE when there are extra spaces.' },
      { id: 'xl-cleaning-c2', front: 'Why make data an Excel Table (Ctrl+T)?', back: 'Ranges grow automatically, formulas copy themselves, filters come built in, and structured references (Sales[Amount]) are easier to read.' },
      { id: 'xl-cleaning-c3', kind: 'scenario', front: 'Your total "looks about right". Why is that not good enough?', back: 'Errors can cancel out (a big overstatement and a big understatement). Check row counts, duplicates, types and outliers before trusting a total.' },
    ],
  },

  // =========================================================================== INTERMEDIATE
  {
    id: 'xl-xlookup', skill: 'excel', level: 'Intermediate', title: 'XLOOKUP', minutes: 12, prereqs: ['xl-countif', 'xl-cleaning'],
    summary: 'Find a value in one table and bring back related information from it.',
    lesson: `
### What is it?
XLOOKUP finds something in one list and returns the matching item from another. Think "look up the supplier for this product ID".

\`\`\`
=XLOOKUP(what_to_find, where_to_look, what_to_return, [if_not_found])
\`\`\`

### Example
You have a **price list** (Product ID, Name, Supplier, Cost) and an **order sheet** with just Product IDs. You want the supplier next to each order line.

| | A | B | | E | F | G |
|---|---|---|---|---|---|---|
| 1 | Product ID | Supplier? | | Product ID | Name | Supplier |
| 2 | P-3 | \`=XLOOKUP(A2,$E$2:$E$9,$G$2:$G$9)\` | | P-1 | Tent | Apex |
| 3 | P-1 | … | | P-3 | Stove | Northline |

In words: find A2 **in** the ID column, and **return** the matching Supplier.

### Why it's better than VLOOKUP
- Exact match by default (VLOOKUP's default is *approximate*, which is a classic silent error).
- It can return a column to the **left** of the search column.
- A built-in "not found" message: \`=XLOOKUP(A2, ids, suppliers, "Missing")\`.
- It doesn't break when someone inserts a column.

### Lookups that fail
When XLOOKUP returns \`#N/A\`, the value really isn't there *as typed*. Usual causes:
- extra spaces: "SKU-1001 " ≠ "SKU-1001" (use TRIM)
- numbers stored as text in one table and as numbers in the other
- a genuinely missing item. **Report it** rather than hiding it.

### Common mistakes
- Forgetting \`$\` on the lookup ranges before copying down.
- Wrapping everything in IFERROR(…,0). Missing products then look like free products.`,
    tryIt: {
      id: 'xl-xlookup-try', type: 'formula', difficulty: 2, concept: 'xlookup',
      prompt: 'In **G2**, find the **Supplier** for the product ID typed in **F2**.',
      grid: { rows: [['Product ID', 'Product', 'Supplier', 'Cost', null, 'Find ID', 'Supplier'], ['P-101', 'Tent 2P', 'Apex Wholesale', 118, null, 'P-104', null], ['P-102', 'Boots', 'Northline Supply', 64], ['P-103', 'Stove', 'Keystone Parts', 31], ['P-104', 'Headlamp', 'Brightway Traders', 14], ['P-105', 'Jacket', 'Apex Wholesale', 72], ['P-106', 'Mug', 'Northline Supply', 6]] },
      target: 'G2', answer: '=XLOOKUP(F2,A2:A7,C2:C7)',
      hints: ['What are you looking for (F2)? Which column do you search (IDs)? Which column do you return (Supplier)?', '=XLOOKUP(F2, A2:A7, C2:C7)'],
      explain: 'XLOOKUP(find, look in, return). It finds P-104 in A2:A7 and returns the value in the same row of C2:C7: Brightway Traders.',
    },
    practice: [
      {
        id: 'xl-xlookup-p1', type: 'formula', title: 'Price every order line', difficulty: 3, concept: 'xlookup', business: 'Procurement', minutes: 8,
        context: 'An order sheet lists product IDs and quantities. Prices live in a separate price list. One product is new and not in the price list yet.',
        prompt: 'In **C2**, return the **cost** for the product in A2 from the price list (F:H). If a product is missing, show **"Not found"**. It must work when copied down to C6.',
        grid: { rows: [['Product ID', 'Qty', 'Unit cost', null, null, 'Product ID', 'Supplier', 'Cost'], ['P-103', 10, null, null, null, 'P-101', 'Apex', 118], ['P-101', 2, null, null, null, 'P-102', 'Northline', 64], ['P-109', 5, null, null, null, 'P-103', 'Keystone', 31], ['P-105', 3, null, null, null, 'P-104', 'Brightway', 14], ['P-104', 20, null, null, null, 'P-105', 'Apex', 72]] },
        target: 'C2', fillTo: 'C6', answer: '=XLOOKUP(A2,$F$2:$F$6,$H$2:$H$6,"Not found")',
        hints: ['Look up A2 in the price-list IDs (F) and return the Cost (H). Lock the price-list ranges with $.', '=XLOOKUP(A2, $F$2:$F$6, $H$2:$H$6, "Not found")'],
        explain: 'The 4th argument handles missing items explicitly: P-109 shows "Not found" instead of #N/A, so you can report it. Don\'t replace it with 0; a missing price is not a free product.',
      },
      {
        id: 'xl-xlookup-p2', type: 'file', title: 'Find missing supplier prices', difficulty: 3, concept: 'xlookup', business: 'Procurement', minutes: 25,
        context: 'Purchasing is about to send a purchase order (40 lines). Before it goes, they need the cost of each line from the supplier price list, and to know which items have no price yet.',
        prompt: 'Download the workbook. Use lookups to bring the Unit Cost and Supplier into the PurchaseOrder sheet, then answer on the **Answers** sheet. Watch out: some IDs may not match *exactly*.',
        files: [{ label: 'supplier_price_lookup.xlsx', path: 'excel/supplier_price_lookup.xlsx' }], dataset: 'supplier-lookup', answersKey: 'xl-file-supplier',
        questions: [{ label: 'Lines with no price at all' }, { label: 'Total cost of priced lines' }, { label: 'Supplier with the highest value (name)' }, { label: 'Unit cost of the SKU named in question 4' }, { label: 'Longest lead time (days) of priced lines' }],
        hints: ['XLOOKUP each SKU against PriceList. Count the #N/A results. But are they all truly missing?', 'Two price-list SKUs have a trailing space. TRIM the price-list SKUs (a helper column), or look up with wildcards, so only the 3 truly missing items remain.'],
        explain: 'Lookups fail silently on invisible differences. Always check your #N/A rows by eye before reporting "missing": here 2 of the 5 were just stray spaces.',
      },
    ],
    quiz: [
      { id: 'xl-xlookup-q1', type: 'mc', difficulty: 2, concept: 'xlookup', prompt: 'Which statement about XLOOKUP is FALSE?', options: ['It returns every matching row when several rows match', 'It defaults to an exact match', 'It can return a column to the left of the search column', 'It can return several columns at once'], answer: 0, explain: 'XLOOKUP returns the first (or last) match only. To get all matches, use FILTER.' },
      { id: 'xl-xlookup-q2', type: 'mc', difficulty: 3, concept: 'exact-match', prompt: '`=VLOOKUP(A2, Products!A:D, 3)` returns believable but wrong prices, and never an error. Why?', options: ['VLOOKUP cannot read other sheets', 'The 4th argument is missing, so it does an approximate match', 'Column 3 is hidden', 'Products must be an Excel Table'], answer: 1, explain: 'VLOOKUP defaults to approximate match. On unsorted data it quietly returns the nearest smaller key. Use FALSE (exact) or XLOOKUP.' },
      { id: 'xl-xlookup-q3', type: 'formula', difficulty: 2, concept: 'xlookup', prompt: 'In **F2**, return the **Name** of the employee whose ID is in **E2**.', grid: { rows: [['Name', 'Employee ID', 'Dept', null, 'ID', 'Name'], ['Ana Silva', 'E-12', 'Sales', null, 'E-30', null], ['Omar Ali', 'E-30', 'Finance'], ['Li Wei', 'E-44', 'IT']] }, target: 'F2', answer: '=XLOOKUP(E2,B2:B4,A2:A4)', explain: 'The Name is to the LEFT of the ID. XLOOKUP handles that easily; VLOOKUP can\'t.' },
      { id: 'xl-xlookup-q4', type: 'mc', difficulty: 2, concept: 'xlookup', prompt: 'XLOOKUP returns #N/A for "SKU-1001" although you can see SKU-1001 in the price list. The most likely cause?', options: ['XLOOKUP is case-sensitive', 'One of the two values has an extra space, or is a number stored as text', 'The price list has more than 1,000 rows', 'You need to sort the list'], answer: 1, explain: 'Invisible spaces and text-vs-number mismatches are the usual culprits. Check with LEN() or ISTEXT().' },
      { id: 'xl-xlookup-q5', type: 'tf', difficulty: 2, concept: 'xlookup', prompt: 'True or false: wrapping every lookup in IFERROR(…, 0) is good practice for reports.', answer: false, explain: 'It hides problems. A missing price becomes 0 and the total looks fine. Show "Not found" and investigate.' },
    ],
    challenge: {
      id: 'xl-xlookup-ch', type: 'formula', title: 'Line value with missing prices', difficulty: 4, concept: 'xlookup', business: 'Procurement', minutes: 10,
      context: 'Purchasing wants each line\'s value (Qty x Cost). Lines whose product has no price must show 0 value for now, but you already flag them elsewhere.',
      prompt: 'In **C2**, calculate **Qty x Cost**, looking the cost up in E:F; if the product is not in the list, the value is 0. Copy down to C6.',
      grid: { rows: [['Product', 'Qty', 'Line value', null, 'Product', 'Cost'], ['P-1', 4, null, null, 'P-1', 12.5], ['P-7', 2, null, null, 'P-2', 40], ['P-2', 10, null, null, 'P-3', 7.25], ['P-3', 6, null, null, 'P-4', 99], ['P-9', 1, null]] },
      target: 'C2', fillTo: 'C6', answer: '=B2*XLOOKUP(A2,$E$2:$E$5,$F$2:$F$5,0)',
      hints: ['Multiply the quantity by the looked-up cost.', 'Use 0 as XLOOKUP\'s "if not found" value: =B2*XLOOKUP(A2,$E$2:$E$5,$F$2:$F$5,0)'],
      explain: 'A lookup can sit inside a bigger calculation. Using 0 is fine here only because the missing items are flagged separately. Never silently.',
    },
    cards: [
      { id: 'xl-xlookup-c1', front: 'The 4 arguments of XLOOKUP?', back: 'What to find, where to look, what to return, and (optional) what to show if not found.' },
      { id: 'xl-xlookup-c2', kind: 'decision', front: 'XLOOKUP or FILTER to list all orders of one customer?', back: 'FILTER: it returns every match. XLOOKUP returns only one.' },
      { id: 'xl-xlookup-c3', kind: 'interview', front: 'Interview: why prefer XLOOKUP over VLOOKUP?', back: 'Exact match by default, it can look left, it doesn\'t break when columns are inserted, and it has a built-in "not found" value. VLOOKUP\'s approximate default causes silent errors.' },
    ],
  },

  {
    id: 'xl-indexmatch', skill: 'excel', level: 'Intermediate', title: 'INDEX + MATCH & two-way lookups', minutes: 12, prereqs: ['xl-xlookup'],
    summary: 'The classic lookup that works in every Excel version, and can look in two directions at once.',
    lesson: `
### Two functions that work as a team
- \`MATCH(what, list, 0)\` → the **position** of a value in a list (0 = exact match). \`=MATCH("P-3", A2:A9, 0)\` → 3
- \`INDEX(range, row, [column])\` → the value at a **position**. \`=INDEX(C2:C9, 3)\` → the 3rd value in C

Together: find the position with MATCH, then fetch with INDEX:
\`\`\`
=INDEX(C2:C9, MATCH(F2, A2:A9, 0))
\`\`\`
This does the same job as \`=XLOOKUP(F2, A2:A9, C2:C9)\`, and it works in old Excel versions that your colleagues or clients may still use.

### The superpower: two-way lookups
A price grid with products down the side and sizes across the top: use one MATCH for the row and one for the column.
\`\`\`
=INDEX(B2:E6, MATCH(product, A2:A6, 0), MATCH(size, B1:E1, 0))
\`\`\`

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Product | S | M | L |
| 2 | Tee | 10 | 11 | 12 |
| 3 | Hoodie | 25 | 27 | 29 |

Hoodie, size M → row 2 of the grid, column 2 → 27.

### XMATCH
In newer Excel, \`XMATCH(what, list)\` is MATCH with an exact match by default.

### Common mistakes
- Forgetting the 0 in MATCH. The default (1) is an approximate match on sorted data: a silent error again.
- INDEX range and MATCH range of different heights.`,
    tryIt: {
      id: 'xl-indexmatch-try', type: 'formula', difficulty: 2, concept: 'index-match',
      prompt: 'Using **INDEX and MATCH**, return in **G2** the **Cost** of the product in F2. (XLOOKUP would also work, but practise the classic here.)',
      grid: { rows: [['Product ID', 'Product', 'Cost', null, null, 'Find ID', 'Cost'], ['P-101', 'Tent 2P', 118, null, null, 'P-103', null], ['P-102', 'Boots', 64], ['P-103', 'Stove', 31], ['P-104', 'Headlamp', 14]] },
      target: 'G2', answer: '=INDEX(C2:C5,MATCH(F2,A2:A5,0))',
      hints: ['MATCH(F2, A2:A5, 0) gives the row position of the ID.', '=INDEX(C2:C5, MATCH(F2, A2:A5, 0))'],
      explain: 'MATCH finds that P-103 is 3rd in the list; INDEX returns the 3rd cost: 31.',
    },
    practice: [
      {
        id: 'xl-indexmatch-p1', type: 'formula', title: 'Shipping rate grid', difficulty: 3, concept: 'index-match', business: 'Logistics', minutes: 8,
        context: 'The carrier\'s rate card has zones down the side and weight bands across the top.',
        prompt: 'In **H2**, return the rate for the zone in **F2** and the weight band in **G2** (a two-way lookup).',
        grid: { rows: [['Zone', 'Up to 1kg', 'Up to 5kg', 'Up to 20kg', null, 'Zone', 'Band', 'Rate'], ['Zone A', 4.5, 7.9, 14.0, null, 'Zone C', 'Up to 5kg', null], ['Zone B', 5.2, 9.4, 17.5], ['Zone C', 6.8, 12.1, 22.0], ['Zone D', 8.5, 15.8, 29.9]] },
        target: 'H2', answer: '=INDEX(B2:D5,MATCH(F2,A2:A5,0),MATCH(G2,B1:D1,0))',
        hints: ['You need a row number (which zone) and a column number (which band).', '=INDEX(B2:D5, MATCH(F2,A2:A5,0), MATCH(G2,B1:D1,0))'],
        explain: 'INDEX takes a row AND a column. Two MATCHes supply them: Zone C is row 3, "Up to 5kg" is column 2, giving 12.1.',
      },
    ],
    quiz: [
      { id: 'xl-indexmatch-q1', type: 'mc', difficulty: 2, concept: 'index-match', prompt: 'What does `=MATCH("Boots", B2:B6, 0)` return if Boots is in B4?', options: ['"Boots"', '4', '3', 'The value next to Boots'], answer: 2, explain: 'MATCH returns the position within the range: B4 is the 3rd cell of B2:B6.' },
      { id: 'xl-indexmatch-q2', type: 'formula', difficulty: 3, concept: 'index-match', prompt: 'In **F2**, return the **Department** of the employee in E2 using INDEX/MATCH or XLOOKUP.', grid: { rows: [['ID', 'Name', 'Department', null, 'Employee', 'Department'], ['E-1', 'Ana', 'Sales', null, 'Omar', null], ['E-2', 'Omar', 'Finance'], ['E-3', 'Li', 'IT']] }, target: 'F2', answer: '=INDEX(C2:C4,MATCH(E2,B2:B4,0))', explain: 'Look the name up in B and return C. Both INDEX/MATCH and XLOOKUP are accepted.' },
      { id: 'xl-indexmatch-q3', type: 'mc', difficulty: 3, concept: 'exact-match', prompt: 'What happens with `=MATCH(F2, A2:A50)` (no third argument) on an unsorted list?', options: ['#N/A for every value it looks up', 'An approximate match that may return a wrong position without any error', 'An exact match, exactly as with 0', 'A message asking you to sort the list first'], answer: 1, explain: 'The default match type 1 assumes sorted data and returns the nearest smaller value. Always use 0 for exact.' },
      { id: 'xl-indexmatch-q4', type: 'tf', difficulty: 2, concept: 'lookup-strategy', prompt: 'True or false: INDEX/MATCH is useful when your file will be opened in an old Excel version without XLOOKUP.', answer: true, explain: 'XLOOKUP only exists in Microsoft 365 / Excel 2021+. INDEX/MATCH works everywhere.' },
    ],
    challenge: {
      id: 'xl-indexmatch-ch', type: 'formula', title: 'Quarterly target lookup', difficulty: 4, concept: 'index-match', business: 'Sales', minutes: 10,
      prompt: 'Targets are stored by region (rows) and quarter (columns). In **G2**, return the target for the region in **E2** and the quarter in **F2**. Then copy down to G4 for the other requests.',
      grid: { rows: [['Region', 'Q1', 'Q2', 'Q3', 'Region', 'Quarter', 'Target'], ['North', 90000, 95000, 88000, 'West', 'Q3', null], ['South', 70000, 76000, 80000, 'North', 'Q1', null], ['East', 65000, 69000, 71000, 'South', 'Q2', null], ['West', 99000, 104000, 97000]] },
      target: 'G2', fillTo: 'G4', answer: '=INDEX($B$2:$D$5,MATCH(E2,$A$2:$A$5,0),MATCH(F2,$B$1:$D$1,0))',
      hints: ['Two-way lookup: row by region, column by quarter.', 'Lock the table ranges ($) so the formula can be copied down: =INDEX($B$2:$D$5, MATCH(E2,$A$2:$A$5,0), MATCH(F2,$B$1:$D$1,0))'],
      explain: 'Combining two-way lookups with absolute references gives you a reusable lookup "machine". It\'s common in budgeting and pricing models.',
    },
    cards: [
      { id: 'xl-indexmatch-c1', front: 'INDEX/MATCH pattern for a simple lookup?', back: '=INDEX(return_range, MATCH(value, lookup_range, 0))' },
      { id: 'xl-indexmatch-c2', front: 'How do you do a two-way (row AND column) lookup?', back: '=INDEX(grid, MATCH(row_value, row_headers, 0), MATCH(col_value, col_headers, 0))' },
    ],
  },

  {
    id: 'xl-sumifs', skill: 'excel', level: 'Intermediate', title: 'SUMIFS, COUNTIFS & IFERROR', minutes: 12, prereqs: ['xl-countif'],
    summary: 'Answer "how much, for this group, in this period?" in one formula.',
    lesson: `
### Many conditions at once
\`\`\`
=SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2, ...)
=COUNTIFS(criteria_range1, criteria1, ...)
=AVERAGEIFS(average_range, criteria_range1, criteria1, ...)
\`\`\`
West revenue from the Online channel:
\`=SUMIFS(Sales[Revenue], Sales[Region], "West", Sales[Channel], "Online")\`

### Date ranges: the pattern everyone needs
Revenue for **March 2026**: two conditions on the same date column.
\`\`\`
=SUMIFS(Revenue, OrderDate, ">="&DATE(2026,3,1), OrderDate, "<"&DATE(2026,4,1))
\`\`\`
Why \`<\` the 1st of April and not \`<=\` 31 March? Because timestamps like 31/03 14:30 would be missed, and you don't have to know how many days each month has.

### IFERROR: handle errors on purpose
\`=IFERROR(B2/C2, 0)\` shows 0 instead of #DIV/0!. Use it for **expected** errors, like a division where the denominator can legitimately be zero. Don't use it to hide surprises.

### Common mistakes
- In SUMIFS the sum range comes **first** (it's last in SUMIF).
- Writing \`">=DATE(2026,3,1)"\` as a single text string. The function must be outside the quotes: \`">="&DATE(2026,3,1)\`.
- Criteria ranges of different sizes → #VALUE!.
- Dates stored as text are silently excluded from date criteria.`,
    tryIt: {
      id: 'xl-sumifs-try', type: 'formula', difficulty: 2, concept: 'sumifs',
      prompt: 'In **F2**, return the total Amount of **West** orders from the **Online** channel.',
      grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'West online'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=SUMIFS(D2:D11,B2:B11,"West",C2:C11,"Online")',
      hints: ['SUMIFS(what to add, range1, condition1, range2, condition2).', '=SUMIFS(D2:D11, B2:B11, "West", C2:C11, "Online")'],
      explain: 'Only rows where BOTH conditions hold are added: 420 + 610 + 88 = 1,118.',
    },
    practice: [
      {
        id: 'xl-sumifs-p1', type: 'formula', title: 'March revenue', difficulty: 3, concept: 'date-criteria', business: 'Retail', minutes: 8,
        prompt: 'In **F2**, return total Revenue for **March 2026**, using the dates in column A. Build the date limits with DATE().',
        grid: { rows: [['Order date', 'Region', 'Revenue', null, null, 'March revenue'], ['2026-02-27', 'West', 300, null, null, null], ['2026-03-01', 'East', 520], ['2026-03-09', 'West', 180], ['2026-03-18', 'North', 760], ['2026-03-31', 'West', 240], ['2026-04-01', 'East', 610], ['2026-04-12', 'South', 90]] },
        target: 'F2', answer: '=SUMIFS(C2:C8,A2:A8,">="&DATE(2026,3,1),A2:A8,"<"&DATE(2026,4,1))',
        hints: ['Two conditions on the date column: on or after 1 March, and before 1 April.', '=SUMIFS(C2:C8, A2:A8, ">="&DATE(2026,3,1), A2:A8, "<"&DATE(2026,4,1))'],
        explain: 'Using ">=" the 1st of the month and "<" the 1st of the next month catches every March date (including 31 March) and never needs to know month lengths.',
      },
      {
        id: 'xl-sumifs-p2', type: 'formula', title: 'Average margin, safely', difficulty: 3, concept: 'iferror', business: 'Retail', minutes: 6,
        prompt: 'In **D2**, calculate the margin % as Profit / Revenue. Some stores had no revenue yet, so return **0** instead of an error. Copy down to D5.',
        grid: { rows: [['Store', 'Revenue', 'Profit', 'Margin %'], ['N01', 50000, 12000, null], ['W02', 0, -1500, null], ['E01', 42000, 9800, null], ['S01', 38000, 7100, null]] },
        target: 'D2', fillTo: 'D5', answer: '=IFERROR(C2/B2,0)',
        hints: ['Profit / Revenue gives #DIV/0! when Revenue is 0.', '=IFERROR(C2/B2, 0)'],
        explain: 'IFERROR(calculation, fallback). This is an expected error (a new store with no sales yet), so handling it is correct. In a report, also note WHY that store shows 0.',
      },
      {
        id: 'xl-sumifs-p3', type: 'file', title: 'Regional sales questions', difficulty: 3, concept: 'sumifs', business: 'Retail', minutes: 25,
        context: 'The regional managers each want a number from the first half of 2026. The data is clean; this is about getting multi-condition formulas right.',
        prompt: 'Download the file and answer on the **Answers** sheet with SUMIFS / COUNTIFS / AVERAGEIFS (a PivotTable is fine for checking). Upload, or type your answers.',
        files: [{ label: 'regional_sales_2026.xlsx', path: 'excel/regional_sales_2026.xlsx' }], dataset: 'regional-sales', answersKey: 'xl-file-regional',
        questions: [{ label: 'West revenue in March 2026' }, { label: 'East orders worth more than 500' }, { label: 'Average Online order revenue, Q1 2026' }, { label: 'South Footwear revenue, Q2 2026' }, { label: 'Distinct customers' }, { label: 'Best month (YYYY-MM)', month: true }],
        hints: ['For date ranges use ">="&DATE(...) and "<"&DATE(...).', 'Distinct customers: =COUNTA(UNIQUE(range)) in new Excel, or a PivotTable with Distinct Count. Best month: a pivot grouped by month, or SUMIFS per month.'],
        explain: 'Every question is "sum/count/average WHERE conditions". Once you see that pattern, SUMIFS-family formulas answer most ad-hoc questions in seconds.',
      },
    ],
    quiz: [
      { id: 'xl-sumifs-q1', type: 'mc', difficulty: 2, concept: 'sumifs', prompt: 'In SUMIFS, which argument comes first?', options: ['The first criteria range', 'The range to add up', 'The first condition', 'It does not matter'], answer: 1, explain: 'SUMIFS(sum_range, criteria_range1, criteria1, …). It is the opposite of SUMIF.' },
      { id: 'xl-sumifs-q2', type: 'mc', difficulty: 3, concept: 'date-criteria', prompt: 'Which condition correctly means "on or after 1 March 2026"?', options: ['">=DATE(2026,3,1)"', '">="&DATE(2026,3,1)', '>=DATE(2026,3,1)', '"&>=DATE(2026,3,1)"'], answer: 1, explain: 'The operator is text; the date must be calculated outside the quotes and joined with &.' },
      { id: 'xl-sumifs-q3', type: 'formula', difficulty: 3, concept: 'sumifs', prompt: 'In **F2**, count the **Store** orders of **500 or more**.', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Count'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=COUNTIFS(C2:C11,"Store",D2:D11,">=500")', explain: 'COUNTIFS with two conditions: Store orders A-103 (950) and A-108 (520).' },
      { id: 'xl-sumifs-q4', type: 'tf', difficulty: 2, concept: 'iferror', prompt: 'True or false: wrapping a lookup in IFERROR(…,"") is a safe way to make a report look clean.', answer: false, explain: 'It hides missing data. Handle errors you expect (like dividing by zero), and investigate the ones you don\'t.' },
      { id: 'xl-sumifs-q5', type: 'formula', difficulty: 3, concept: 'sumifs', prompt: 'In **F2**, return the **average** Online order Amount in the **West**.', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Avg'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=AVERAGEIFS(D2:D11,B2:B11,"West",C2:C11,"Online")', explain: 'AVERAGEIFS(average range, range1, cond1, range2, cond2). (420+610+88)/3 = 372.67.' },
    ],
    challenge: {
      id: 'xl-sumifs-ch', type: 'formula', title: 'Monthly revenue grid', difficulty: 4, concept: 'date-criteria', business: 'Retail', minutes: 12,
      context: 'The finance team wants revenue per month in a small table. The month start dates are in column E.',
      prompt: 'In **F2**, return the revenue for the month that **starts** on the date in E2. It must work when copied down to F4 (for April and May). Hint: the month ends where the next month starts.',
      grid: { rows: [['Order date', 'Revenue', null, null, 'Month start', 'Revenue'], ['2026-03-04', 250, null, null, '2026-03-01', null], ['2026-03-28', 400, null, null, '2026-04-01', null], ['2026-04-02', 120, null, null, '2026-05-01', null], ['2026-04-30', 330], ['2026-05-15', 510], ['2026-05-31', 90], ['2026-06-01', 700]] },
      target: 'F2', fillTo: 'F4', answer: '=SUMIFS($B$2:$B$8,$A$2:$A$8,">="&E2,$A$2:$A$8,"<"&EDATE(E2,1))',
      hints: ['Conditions: date >= E2 and date < the start of the next month.', 'EDATE(E2,1) is one month after E2 (or EOMONTH(E2,0)+1). Lock the data ranges.'],
      explain: 'Driving SUMIFS from a cell (E2) and computing the next month with EDATE makes a monthly report that extends itself: add a row, copy down, done.',
    },
    cards: [
      { id: 'xl-sumifs-c1', front: 'The date-range pattern for March 2026 in SUMIFS?', back: 'dates, ">="&DATE(2026,3,1), dates, "<"&DATE(2026,4,1)' },
      { id: 'xl-sumifs-c2', kind: 'decision', front: 'One-off question with 3 conditions on clean data: SUMIFS or a PivotTable?', back: 'Either works. SUMIFS if it must sit in a report and update; a PivotTable for exploring and slicing quickly.' },
    ],
  },

  {
    id: 'xl-dynamic', skill: 'excel', level: 'Intermediate', title: 'Dynamic arrays: FILTER, SORT, UNIQUE', minutes: 12, prereqs: ['xl-xlookup', 'xl-sumifs'],
    summary: 'Formulas that return whole lists, and update themselves when data changes.',
    lesson: `
### What is it?
In Microsoft 365 / Excel 2021, one formula can return **many cells**. The result "spills" down (and across).

| Formula | Returns |
|---|---|
| \`=UNIQUE(B2:B500)\` | the distinct regions |
| \`=SORT(A2:C500, 3, -1)\` | the table sorted by column 3, descending |
| \`=FILTER(A2:C500, C2:C500>1000)\` | only the rows where the amount is over 1,000 |
| \`=SORTBY(A2:A500, C2:C500, -1)\` | column A sorted by column C |
| \`=COUNTA(UNIQUE(B2:B500))\` | how many distinct values |

### Combining them
Top customers, biggest first:
\`\`\`
=SORT(FILTER(A2:B200, B2:B200>=1000), 2, -1)
\`\`\`
All West orders: \`=FILTER(Orders, Orders[Region]="West", "None")\`. The last argument is what to show if nothing matches.

### #SPILL!
The answer needs empty cells below/right of the formula. If something is in the way you get **#SPILL!**. Clear those cells. (Spilling formulas also can't live inside an Excel Table.)

### Why analysts love them
- No copying formulas down, and no helper columns.
- The list grows and shrinks with the data.
- FILTER returns **all** matches, which XLOOKUP can't.

### Common mistakes
- FILTER conditions on ranges of different sizes → #VALUE!.
- Several conditions: multiply them for AND \`(B2:B99="West")*(C2:C99>500)\`, add them for OR.`,
    tryIt: {
      id: 'xl-dynamic-try', type: 'formula', difficulty: 2, concept: 'dynamic-arrays',
      prompt: 'In **F2**, return the **list of distinct regions** (it will spill down).',
      grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Regions'] : r)) }, target: 'F2', answer: '=UNIQUE(B2:B11)',
      hints: ['One function returns distinct values.', '=UNIQUE(B2:B11)'],
      explain: 'UNIQUE returns each value once, in order of first appearance: West, East, North, South.',
    },
    practice: [
      {
        id: 'xl-dynamic-p1', type: 'formula', title: 'List the big orders', difficulty: 3, concept: 'dynamic-arrays', business: 'Retail', minutes: 6,
        prompt: 'In **F2**, return the **Order IDs** of all orders with an Amount of **500 or more**.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Big orders'] : r)) }, target: 'F2', answer: '=FILTER(A2:A11,D2:D11>=500)',
        hints: ['FILTER(what to return, condition).', '=FILTER(A2:A11, D2:D11>=500)'],
        explain: 'FILTER returns every matching row: A-103, A-105, A-107, A-108. Add a row to the data and the list updates.',
      },
      {
        id: 'xl-dynamic-p2', type: 'formula', title: 'West orders, biggest first', difficulty: 3, concept: 'dynamic-arrays', business: 'Retail', minutes: 8,
        prompt: 'In **F2**, return the **Amounts** of the **West** orders, sorted from **largest to smallest**.',
        grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'West amounts'] : r)) }, target: 'F2', answer: '=SORT(FILTER(D2:D11,B2:B11="West"),1,-1)',
        hints: ['FILTER the West amounts first, then SORT the result.', '=SORT(FILTER(D2:D11, B2:B11="West"), 1, -1): -1 means descending.'],
        explain: 'Nesting lets FILTER pick the rows and SORT order them: 950, 610, 420, 88.',
      },
    ],
    quiz: [
      { id: 'xl-dynamic-q1', type: 'mc', difficulty: 2, concept: 'dynamic-arrays', prompt: '`=FILTER(A2:A50, B2:B50="West")` shows #SPILL!. The most likely cause?', options: ['There are no West rows', 'Cells below the formula are not empty', 'FILTER needs sorted data', 'The ranges are too big'], answer: 1, explain: 'A spilled result needs empty space. Clear the cells in the way (or the formula is inside a Table).' },
      { id: 'xl-dynamic-q2', type: 'formula', difficulty: 2, concept: 'dynamic-arrays', prompt: 'In **F2**, count how many **distinct regions** appear in the data (one formula).', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Distinct'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=COUNTA(UNIQUE(B2:B11))', explain: 'UNIQUE lists each region once and COUNTA counts that list: =COUNTA(UNIQUE(B2:B11)) returns 4.' },
      { id: 'xl-dynamic-q3', type: 'mc', difficulty: 3, concept: 'dynamic-arrays', prompt: 'How do you FILTER rows that are West AND over 500?', options: ['FILTER(A2:D11, B2:B11="West", D2:D11>500)', 'FILTER(A2:D11, (B2:B11="West")*(D2:D11>500))', 'FILTER(A2:D11, AND(B2:B11="West", D2:D11>500))', 'FILTER(A2:D11, B2:B11="West"&D2:D11>500)'], answer: 1, explain: 'Multiply the conditions for AND (add them for OR). AND() collapses the arrays to one TRUE/FALSE, so it doesn\'t work here.' },
      { id: 'xl-dynamic-q4', type: 'tf', difficulty: 2, concept: 'dynamic-arrays', prompt: 'True or false: a FILTER result updates automatically when new matching rows are added to the source range.', answer: true, explain: 'Yes, as long as the new rows are inside the referenced range (use a Table so the range grows).' },
    ],
    challenge: {
      id: 'xl-dynamic-ch', type: 'formula', title: 'Above-average customers', difficulty: 4, concept: 'dynamic-arrays', business: 'E-commerce', minutes: 8,
      context: 'Marketing wants the customers whose total spend is above the average spend, to invite them to a loyalty pilot.',
      prompt: 'In **D2**, return the **names** of customers whose Spend is **above the average** spend, sorted A to Z.',
      grid: { rows: [['Customer', 'Spend', null, 'Above average'], ['Rania', 820], ['Ben', 240], ['Carla', 1310], ['Dev', 560], ['Eva', 90], ['Farid', 1045], ['Gina', 300]] },
      target: 'D2', answer: '=SORT(FILTER(A2:A8,B2:B8>AVERAGE(B2:B8)))',
      hints: ['The condition compares each spend with AVERAGE(B2:B8).', '=SORT(FILTER(A2:A8, B2:B8 > AVERAGE(B2:B8)))'],
      explain: 'A condition can compare against a calculated value. The list stays correct as the data changes: that is a small, living segment.',
    },
    cards: [
      { id: 'xl-dynamic-c1', front: 'FILTER with two conditions (AND)?', back: '=FILTER(data, (cond1)*(cond2)): multiply for AND, add for OR.' },
      { id: 'xl-dynamic-c2', front: 'What causes #SPILL!?', back: 'The spilled result is blocked by non-empty cells (or the formula is inside a Table).' },
    ],
  },

  {
    id: 'xl-pivots', skill: 'excel', level: 'Intermediate', title: 'PivotTables, PivotCharts & slicers', minutes: 15, prereqs: ['xl-sumifs'],
    summary: 'Summarise thousands of rows in seconds, and slice them any way you like.',
    lesson: `
### What is it?
A PivotTable summarises a table by dragging fields into four boxes:

| Box | Use it for | Example |
|---|---|---|
| **Rows** | the groups down the side | Region |
| **Columns** | groups across the top | Channel |
| **Values** | the numbers to summarise | Sum of Revenue |
| **Filters** | a filter for the whole pivot | Year |

Insert → PivotTable, choosing a **Table** as the source (so new rows are included after **Refresh**).

### Things you'll use weekly
- **Value Field Settings:** Sum, Count, Average, **Distinct Count** (tick *Add this data to the Data Model*).
- **Show Values As → % of Grand Total** for shares.
- **Group** dates by Months/Quarters/Years (right-click a date).
- **Slicers** (PivotTable Analyze → Insert Slicer): clickable filter buttons; connect one slicer to several pivots.
- **PivotChart**: a chart that follows the pivot and its slicers.
- **Refresh** (Alt+F5) after the data changes. Pivots do NOT update by themselves.

### A classic trap: averages of averages
"Average of UnitPrice" in a pivot is a *simple* average of the lines. It ignores how many units each line sold. The real average selling price is **total revenue ÷ total units**. Build it from two sums, not from an average.

### When NOT to use a pivot
When the output must sit in a fixed report layout with other formulas around it, SUMIFS is often better. For exploring, pivots win.`,
    tryIt: {
      id: 'xl-pivots-try', type: 'mc', difficulty: 2, concept: 'pivot',
      prompt: 'You want total revenue per region, with one column per channel (Online / Store). Where does **Channel** go?',
      options: ['Rows', 'Columns', 'Values', 'Filters'], answer: 1,
      hints: ['Regions go down the side. What goes across the top?'],
      explain: 'Region → Rows, Channel → Columns, Revenue → Values (Sum). Filters would apply one channel to the whole pivot instead of showing both side by side.',
    },
    practice: [
      {
        id: 'xl-pivots-p1', type: 'file', title: 'NGO donations report', difficulty: 3, concept: 'pivot', business: 'NGO', minutes: 25,
        context: 'An NGO\'s fundraising director is preparing the annual report and wants the headline numbers about 2025 giving.',
        prompt: 'Download the donations file. Use PivotTables (and formulas where easier) to answer on the **Answers** sheet. Upload, or type your answers.',
        files: [{ label: 'ngo_donations_2025.xlsx', path: 'excel/ngo_donations_2025.xlsx' }], dataset: 'ngo-donations', answersKey: 'xl-file-ngo',
        questions: [{ label: 'Total donated in 2025' }, { label: 'Program with the most money' }, { label: 'Unique donors' }, { label: 'Donors who gave more than once' }, { label: '% of total from recurring gifts', percent: true }, { label: 'Top donor by total (name)' }],
        hints: ['A pivot with Program in Rows and Sum of Amount answers Q2. Donor ID in Rows with Count of Gift ID answers Q3 and Q4.', 'For Q4, count the donors whose gift count is above 1 (filter the pivot, or COUNTIF on the pivot values). For Q5, put Recurring in Rows and show values as % of Grand Total.'],
        explain: 'Counting "donors who gave more than once" is a two-step summary: first count gifts per donor, then count donors with more than one. That pattern (summarise, then summarise again) is everywhere in analysis.',
      },
    ],
    quiz: [
      { id: 'xl-pivots-q1', type: 'mc', difficulty: 2, concept: 'pivot', prompt: 'You added 200 new rows to the source Table, but the pivot still shows the old totals. What do you do?', options: ['Rebuild the pivot', 'Refresh the pivot (Alt+F5)', 'Sort the source', 'Nothing: it updates itself'], answer: 1, explain: 'Pivots are snapshots until refreshed. With a Table as the source, a refresh includes the new rows.' },
      { id: 'xl-pivots-q2', type: 'mc', difficulty: 3, concept: 'weighted-avg', prompt: 'A pivot shows "Average of UnitPrice" by category. The manager wants the average selling price per unit. What is wrong?', options: ['Nothing', 'It is an unweighted average of lines; use Sum of Revenue ÷ Sum of Units', 'Pivots cannot average a price column', 'You must use Median instead of Average'], answer: 1, explain: 'A line with 1 unit counts as much as a line with 50. The real average price = total revenue ÷ total units.' },
      { id: 'xl-pivots-q3', type: 'mc', difficulty: 2, concept: 'pivot', prompt: 'How do you show each region\'s revenue as a share of the total in a pivot?', options: ['Add a % column manually', 'Show Values As → % of Grand Total', 'Use a Filter', 'Change the number format to %'], answer: 1, explain: 'Show Values As → % of Grand Total (or % of Column Total).' },
      { id: 'xl-pivots-q4', type: 'tf', difficulty: 2, concept: 'pivot', prompt: 'True or false: one slicer can control several PivotTables built on the same data.', answer: true, explain: 'Slicer → Report Connections, then tick every pivot to connect. That is how simple Excel dashboards are made interactive.' },
      { id: 'xl-pivots-q5', type: 'mc', difficulty: 3, concept: 'pivot', prompt: 'Which setting gives you a count of UNIQUE customers in a pivot?', options: ['Count', 'Count Numbers, for numeric IDs', 'Distinct Count (after adding the data to the Data Model)', 'Max'], answer: 2, explain: 'Distinct Count appears only when the pivot uses the Data Model (tick the box when inserting it).' },
    ],
    challenge: {
      id: 'xl-pivots-ch', type: 'open', title: 'Plan a regional sales pivot report', difficulty: 3, concept: 'pivot', business: 'Retail', minutes: 15,
      context: 'The Head of Sales asks: "Every Monday I want to see revenue by region and month, which channel is growing, and our top categories, and I want to click to filter." The data is the Regional sales file (1,200 orders).',
      prompt: 'Describe how you would build it in Excel: which PivotTables (rows/columns/values), which slicers, any PivotCharts, and how you keep it updated each week. Then build it in Excel if you like.',
      checklist: [
        { point: 'Source is an Excel Table so new rows are included', keywords: [['table']] },
        { point: 'A pivot with Region and Month (grouped dates) and Sum of Revenue', keywords: [['region'], ['month', 'group']] },
        { point: 'Channel shown to compare Online vs Store over time', keywords: [['channel', 'online']] },
        { point: 'Top categories (sorted, or a Top-10 filter)', keywords: [['categor'], ['top', 'sort', 'largest']] },
        { point: 'Slicers connected to all pivots', keywords: [['slicer']] },
        { point: 'Refresh step each week (Refresh All)', keywords: [['refresh']] },
      ],
      model: '**A good plan**\n1. Convert the data to a Table (Ctrl+T) called Orders, so new weeks are just pasted or appended.\n2. Pivot 1: Rows = Order Date grouped by Month, Columns = Region, Values = Sum of Revenue, with a line PivotChart for the trend.\n3. Pivot 2: Rows = Month, Columns = Channel, Values = Sum of Revenue → shows whether Online is growing.\n4. Pivot 3: Rows = Category, Values = Sum of Revenue, sorted descending (or a Top 5 filter), with a bar chart.\n5. Slicers for Region and Channel, connected to all three pivots (Report Connections).\n6. Each Monday: paste the new rows into the Table → Data → Refresh All.',
      explain: 'Structure (Table), views (one pivot per question), interactivity (connected slicers) and a refresh routine: that is the anatomy of every Excel report.',
    },
    cards: [
      { id: 'xl-pivots-c1', front: 'The 4 areas of a PivotTable?', back: 'Rows, Columns, Values, Filters.' },
      { id: 'xl-pivots-c2', kind: 'debug', front: 'The pivot total is lower than SUM of the source column. Why might that be?', back: 'The pivot hasn\'t been refreshed, its source range doesn\'t include the new rows (use a Table), or a filter is applied.' },
    ],
  },

  // =========================================================================== ADVANCED
  {
    id: 'xl-advformulas', skill: 'excel', level: 'Advanced', title: 'Advanced formulas & multi-condition logic', minutes: 15, prereqs: ['xl-dynamic', 'xl-indexmatch'],
    summary: 'Multi-condition lookups, weighted averages, LET, and formulas a colleague can still read.',
    lesson: `
### Multi-condition lookups
Find the price for a product **and** a size. Two options:
\`\`\`
=INDEX(Price, MATCH(1, (Product=G2)*(Size=H2), 0))
=XLOOKUP(G2&"|"&H2, Product&"|"&Size, Price)
\`\`\`
The first multiplies two TRUE/FALSE lists (TRUE×TRUE = 1) and finds the first 1. The second joins the keys together.

### SUMPRODUCT: weighted maths in one cell
Weighted average price = Σ(units × price) ÷ Σ units:
\`\`\`
=SUMPRODUCT(Units, Price) / SUM(Units)
\`\`\`
It also counts with several conditions: \`=SUMPRODUCT((Region="West")*(Amount>500))\`.

### LET: name the pieces
\`\`\`
=LET(rev, SUM(Sales[Revenue]),
     cost, SUM(Sales[Cost]),
     (rev - cost) / rev)
\`\`\`
LET names intermediate results. The formula becomes readable, and each piece is calculated once.

### IFS / SWITCH for many outcomes
\`=SWITCH(C2, "N", "North", "S", "South", "Unknown")\` maps codes to names.

### Writing formulas others can audit
- Break long logic into helper columns, or use LET.
- Never hard-code assumptions: put them in labelled input cells.
- Use Tables and structured references.
- Formulas → Evaluate Formula steps through a formula to find where it goes wrong.`,
    tryIt: {
      id: 'xl-advformulas-try', type: 'formula', difficulty: 3, concept: 'lookup-strategy',
      prompt: 'Find the price in **H2** for the product in **F2** AND the size in **G2** (both must match).',
      grid: { rows: [['Product', 'Size', 'Price', null, null, 'Product', 'Size', 'Price'], ['Tee', 'S', 10, null, null, 'Hoodie', 'M', null], ['Tee', 'M', 11], ['Tee', 'L', 12], ['Hoodie', 'S', 25], ['Hoodie', 'M', 27], ['Hoodie', 'L', 29]] },
      target: 'H2', answer: '=INDEX(C2:C7,MATCH(1,(A2:A7=F2)*(B2:B7=G2),0))',
      hints: ['You need the row where Product=F2 AND Size=G2. Multiplying two TRUE/FALSE lists gives 1 only where both are TRUE.', '=INDEX(C2:C7, MATCH(1, (A2:A7=F2)*(B2:B7=G2), 0)). SUMIFS also works here, because each combination is unique.'],
      explain: 'Hoodie/M → 27. The (A=F2)*(B=G2) trick builds a list of 1s and 0s; MATCH finds the first 1. Any method that returns 27 from the data is accepted.',
    },
    practice: [
      {
        id: 'xl-advformulas-p1', type: 'formula', title: 'Weighted average selling price', difficulty: 3, concept: 'weighted-avg', business: 'Retail', minutes: 6,
        context: 'The category manager says "our average price is 44". That\'s the simple average of the price column. You suspect the real average selling price is different.',
        prompt: 'In **E2**, calculate the **weighted average selling price** (total revenue ÷ total units).',
        grid: { rows: [['Product', 'Units', 'Price', null, 'Weighted avg price'], ['Mug', 400, 8, null, null], ['Lantern', 60, 49], ['Tent', 12, 229], ['Socks', 300, 12]] },
        target: 'E2', answer: '=SUMPRODUCT(B2:B5,C2:C5)/SUM(B2:B5)',
        hints: ['Revenue of each line is Units x Price. Add those up, then divide by total units.', '=SUMPRODUCT(B2:B5, C2:C5) / SUM(B2:B5)'],
        explain: 'The simple average (74.5) treats a 12-unit tent line like a 400-unit mug line. Weighted by units, the real average price is about 16.18. The difference changes business decisions.',
      },
      {
        id: 'xl-advformulas-p2', type: 'formula', title: 'Commission tiers with SWITCH/IFS', difficulty: 3, concept: 'if-logic', business: 'Sales', minutes: 6,
        prompt: 'Tier codes are A, B or C. In **C2**, return the commission rate: A → 0.1, B → 0.07, C → 0.04, anything else → 0. Copy down to C6.',
        grid: { rows: [['Rep', 'Tier', 'Rate'], ['Ana', 'A', null], ['Ben', 'C', null], ['Chen', 'B', null], ['Dina', 'X', null], ['Eli', 'A', null]] },
        target: 'C2', fillTo: 'C6', answer: '=IF(B2="A",0.1,IF(B2="B",0.07,IF(B2="C",0.04,0)))',
        hints: ['SWITCH(B2, "A", 0.1, "B", 0.07, "C", 0.04, 0) is the cleanest way.', 'Nested IFs or IFS also work; make sure unknown codes return 0.'],
        explain: 'SWITCH maps codes to values with a default at the end. For long lists, a small lookup table + XLOOKUP is easier to maintain than any formula.',
      },
    ],
    quiz: [
      { id: 'xl-advformulas-q1', type: 'mc', difficulty: 3, concept: 'lookup-strategy', prompt: 'What does LET mainly give you?', options: ['Faster file saving', 'Named steps inside one formula: easier to read, calculated once', 'Links to other workbooks', 'Automatic handling of every error type'], answer: 1, explain: 'LET(name, value, …, result). It improves readability and can improve performance.' },
      { id: 'xl-advformulas-q2', type: 'formula', difficulty: 3, concept: 'sumifs', prompt: 'In **F2**, count orders that are **West AND over 500** using SUMPRODUCT (or COUNTIFS).', grid: { rows: ORDERS.map((r, i) => (i === 0 ? [...r, null, 'Count'] : i === 1 ? [...r, null, null] : r)) }, target: 'F2', answer: '=SUMPRODUCT((B2:B11="West")*(D2:D11>500))', explain: 'Multiplying TRUE/FALSE lists gives 1 where both are true; SUMPRODUCT adds them. A-103 (950) and A-105 (610) → 2.' },
      { id: 'xl-advformulas-q3', type: 'mc', difficulty: 3, concept: 'weighted-avg', prompt: 'Region A: 80% of 1,000 customers retained. Region B: 50% of 10 customers. What is the combined retention rate?', options: ['65%', 'About 79.7%', '80%', '50%'], answer: 1, explain: '(800 + 5) / 1,010 = 79.7%. Averaging the two percentages (65%) ignores the group sizes.' },
      { id: 'xl-advformulas-q4', type: 'tf', difficulty: 3, concept: 'lookup-strategy', prompt: 'True or false: hard-coding an assumption like 0.2 inside 300 formulas is fine if you document it once.', answer: false, explain: 'Put assumptions in labelled input cells and reference them. Otherwise one change means editing 300 formulas, and someone will miss one.' },
    ],
    challenge: {
      id: 'xl-advformulas-ch', type: 'formula', title: 'Margin after returns', difficulty: 4, concept: 'weighted-avg', business: 'Retail', minutes: 10,
      context: 'Finance defines net margin % = (revenue − returns − cost) ÷ (revenue − returns), over all products together.',
      prompt: 'In **G2**, calculate the **overall net margin %** for the whole table in one formula.',
      grid: { rows: [['Product', 'Revenue', 'Returns', 'Cost', null, null, 'Net margin %'], ['Tent', 42000, 2100, 24500, null, null, null], ['Boots', 31000, 4300, 16900], ['Jacket', 28000, 3100, 12200], ['Stove', 9500, 150, 5100]] },
      target: 'G2', answer: '=(SUM(B2:B5)-SUM(C2:C5)-SUM(D2:D5))/(SUM(B2:B5)-SUM(C2:C5))',
      hints: ['Overall = based on totals, not the average of each row\'s margin.', '=(SUM(B2:B5)-SUM(C2:C5)-SUM(D2:D5)) / (SUM(B2:B5)-SUM(C2:C5)). LET can make it readable.'],
      explain: 'Always compute ratios from totals (sum of numerators ÷ sum of denominators). An average of row percentages weights a small product like a big one.',
    },
    cards: [
      { id: 'xl-advformulas-c1', front: 'Weighted average price in one formula?', back: '=SUMPRODUCT(Units, Price) / SUM(Units)' },
      { id: 'xl-advformulas-c2', front: 'Multi-condition lookup with INDEX/MATCH?', back: '=INDEX(return, MATCH(1, (col1=v1)*(col2=v2), 0))' },
    ],
  },

  {
    id: 'xl-analysis', skill: 'excel', level: 'Advanced', title: 'Trends, anomalies & scenarios', minutes: 15, prereqs: ['xl-advformulas', 'xl-pivots'],
    summary: 'Find what changed, flag what looks wrong, and model "what if".',
    lesson: `
### Comparing periods fairly
- **Growth %** = (this period − last period) ÷ last period.
- Compare **like with like**: June 2026 vs June 2025 (year over year) removes seasonality; June vs May doesn't.
- Use several months (e.g. Jun–Aug vs the same months last year) so one odd month doesn't decide.

### Flagging anomalies
An anomaly is a value that doesn't fit the pattern. Simple, robust rules:
- More than **3× the median** of its group: \`=IF(B2>3*MEDIAN($B$2:$B$100),"Check","")\`
- Outside **Q1 − 1.5×IQR … Q3 + 1.5×IQR** (use QUARTILE.INC)
- A **z-score** above 3: \`=(B2-AVERAGE(B:B))/STDEV.S(B:B)\`

Use the median rather than the average for "typical" values: one crazy value drags the average but barely moves the median.

**An anomaly is a question, not a conclusion.** It could be a data error (a typo, a duplicate) or a real event (a bulk order). Check before you delete or report.

### Scenario and sensitivity
Put assumptions in input cells (price change %, volume change %), and have the model reference them:
\`New revenue = Units × (1 + volume%) × Price × (1 + price%)\`

- **Data → What-If Analysis → Scenario Manager** stores named sets of inputs.
- **Data Table** shows results across many input values (sensitivity).
- **Goal Seek** answers "what price do I need to hit 1M?"

### Common mistakes
- Growth % on tiny bases: from 2 to 6 units is "+200%" and means nothing. Show the counts too.
- Deleting outliers to make a chart look nicer, without saying so.`,
    tryIt: {
      id: 'xl-analysis-try', type: 'formula', difficulty: 3, concept: 'anomaly',
      prompt: 'In **C2**, show "Check" if a day\'s sales are more than **3 times the median** of all days, otherwise leave it empty (""). Copy down to C11.',
      grid: { rows: [['Day', 'Sales', 'Flag'], ['Mon', 410, null], ['Tue', 385, null], ['Wed', 402, null], ['Thu', 4120, null], ['Fri', 455, null], ['Sat', 520, null], ['Sun', 390, null], ['Mon', 398, null], ['Tue', 60, null], ['Wed', 415, null]] },
      target: 'C2', fillTo: 'C11', answer: '=IF(B2>3*MEDIAN($B$2:$B$11),"Check","")',
      hints: ['Compare each day with 3*MEDIAN(all days). Lock the range.', '=IF(B2>3*MEDIAN($B$2:$B$11),"Check","")'],
      explain: 'Thursday (4,120) is about 10× the median (~408), probably a typing error (412?) or a bulk order. Note that the rule doesn\'t catch the suspiciously LOW Tuesday (60). Real checks look at both directions.',
    },
    practice: [
      {
        id: 'xl-analysis-p1', type: 'formula', title: 'Year-over-year growth', difficulty: 3, concept: 'scenario', business: 'Retail', minutes: 5,
        prompt: 'In **D2**, calculate the **YoY growth %** from 2025 to 2026 for each product ((2026 − 2025) ÷ 2025). Copy down to D5.',
        grid: { rows: [['Product', '2025 units', '2026 units', 'YoY %'], ['Yoga Mat', 1200, 1380, null], ['Kettlebell', 800, 560, null], ['Foam Roller', 450, 471, null], ['Jump Rope', 300, 150, null]] },
        target: 'D2', fillTo: 'D5', answer: '=(C2-B2)/B2',
        hints: ['Growth = change ÷ the starting value.', '=(C2-B2)/B2, formatted as %. =C2/B2-1 is the same.'],
        explain: 'Yoga Mat +15%, Kettlebell −30%, Foam Roller +4.7%, Jump Rope −50%. Always show the units next to the % so a big % on a small base isn\'t over-read.',
      },
      {
        id: 'xl-analysis-p2', type: 'formula', title: 'Price/volume scenario', difficulty: 3, concept: 'scenario', business: 'E-commerce', minutes: 8,
        context: 'Finance asks: if we raise prices (B8) and lose some volume (B9), what happens to revenue?',
        prompt: 'In **E2**, calculate the **new revenue** for each product using the price change in **B8** and the volume change in **B9**. Copy down to E5.',
        grid: { rows: [['Product', 'Units', 'Price', 'Revenue', 'New revenue'], ['Mat', 1200, 30, 36000, null], ['Bell', 800, 45, 36000, null], ['Roller', 450, 25, 11250, null], ['Rope', 300, 12, 3600, null], [null], [null], ['Price change', 0.05], ['Volume change', -0.03]] },
        target: 'E2', fillTo: 'E5', answer: '=B2*(1+$B$9)*C2*(1+$B$8)',
        hints: ['New units = Units x (1 + volume change). New price = Price x (1 + price change).', '=B2*(1+$B$9)*C2*(1+$B$8). Lock the two input cells.'],
        explain: 'Revenue multiplies by 1.05 × 0.97 = 1.0185 (+1.85%). Because the assumptions live in B8:B9, you can test any scenario by changing two cells.',
      },
      {
        id: 'xl-analysis-p3', type: 'file', title: 'Which products are declining?', difficulty: 4, concept: 'anomaly', business: 'E-commerce', minutes: 35,
        context: 'An online homeware shop has 32 months of unit sales for 30 products. The buyer wants to know which products are losing steam before re-ordering, and says one product "had an amazing November".',
        prompt: 'Download the file, analyse it, and answer on the **Answers** sheet. Upload, or type your answers.',
        files: [{ label: 'ecommerce_product_trends.xlsx', path: 'excel/ecommerce_product_trends.xlsx' }], dataset: 'product-trends', answersKey: 'xl-file-trends',
        questions: [{ label: 'Products down 20%+ (Jun–Aug 2026 vs Jun–Aug 2025)' }, { label: 'Product with the largest % drop' }, { label: 'Product ID with the impossible spike' }, { label: 'Total revenue 2025' }, { label: 'August 2026 revenue in the scenario' }],
        hints: ['Build a pivot: Product in Rows, Month in Columns (or SUMIFS per product for the two 3-month windows), then % change.', 'For the spike, compare each month with the product\'s median month: one value is about 6x its normal level. Revenue = Units x Avg Price: add a helper column.'],
        explain: 'Comparing the same months year over year removes seasonality (sales jump every November–December). "An amazing November" for one product turned out to be a data error, the kind of thing you must question before celebrating.',
      },
      {
        id: 'xl-analysis-p4', type: 'numbers', title: 'Expert: can you trust this sales file?', difficulty: 5, concept: 'cleaning', business: 'Retail', minutes: 60,
        context: 'Sales Ops exported every order line for Q2 2026 from Cedarline\'s systems, then a coordinator "tidied it up by hand". Tomorrow the Head of Retail presents Q2 against target. The file has almost every problem a real export can have.',
        prompt: 'Download the workbook, clean it (in Excel or Power Query) and answer. Read the **Data_Dictionary** sheet first: it defines net revenue.',
        files: [{ label: 'cedarline_q2_2026_order_lines.xlsx', path: 'retail/cedarline_q2_2026_order_lines.xlsx' }], dataset: 'cedarline-q2', answersKey: 'xl-file-cedarline-q2',
        questions: [{ label: 'Genuine order lines (after removing non-data rows, duplicates and manual return rows)' }, { label: 'OrderDate values stored as text' }, { label: 'Lines whose SKU still has no product-master match after TRIM' }, { label: 'Net revenue of completed orders (2 decimals)' }, { label: 'Lines with an obviously wrong unit price' }, { label: 'West Q2 attainment vs target (%)', percent: true, tolerance: 0.3 }],
        hints: ['Look at the structure first: title rows, blank rows, a TOTAL row, duplicate rows, and LineIDs ending in "-R" (manual returns).', 'Then look at the values: text dates, "Canceled" vs "Cancelled", discounts typed as 15 instead of 0.15, SKUs with trailing spaces, and a few prices 100x too high. Compare UnitPrice with ListPrice.'],
        explain: 'Summing the raw file gives ~$366k, only 5% above the true ~$347k. That looks "roughly right", but it is two huge opposite errors (price typos +$52k, discount format −$48k) cancelling out. Matching totals ≠ valid data.',
      },
    ],
    quiz: [
      { id: 'xl-analysis-q1', type: 'mc', difficulty: 3, concept: 'scenario', prompt: 'Why compare June 2026 with June 2025 rather than with May 2026?', options: ['June has more days', 'It removes seasonal effects (the same time of year)', 'May data is always incomplete', 'It is required by accounting rules'], answer: 1, explain: 'Year-over-year compares the same season, so the change reflects performance, not the calendar.' },
      { id: 'xl-analysis-q2', type: 'mc', difficulty: 3, concept: 'anomaly', prompt: 'Why use the MEDIAN rather than the AVERAGE as "normal" when flagging outliers?', options: ['It is faster to calculate', 'Outliers pull the average up and hide themselves; the median barely moves', 'Excel has no AVERAGE function for ranges', 'The median is always higher'], answer: 1, explain: 'One extreme value can move the average a lot. The median is robust.' },
      { id: 'xl-analysis-q3', type: 'number', difficulty: 3, concept: 'scenario', prompt: 'Prices rise 5% and units fall 3%. By what % does revenue change? (type a number, e.g. 1.9)', answer: 1.85, tolerance: 0.06, explain: '1.05 × 0.97 = 1.0185 → +1.85%. Changes multiply; they don\'t add (5 − 3 = 2 is close, but not exact).' },
      { id: 'xl-analysis-q4', type: 'tf', difficulty: 3, concept: 'anomaly', prompt: 'True or false: once you flag an outlier you should delete it so it doesn\'t distort the analysis.', answer: false, explain: 'Investigate first. It could be a typo (fix it), a duplicate (remove it) or a real event (keep it, and report it separately).' },
      { id: 'xl-analysis-q5', type: 'mc', difficulty: 3, concept: 'scenario', prompt: 'Which Excel tool answers "what price do we need to reach revenue of 1,000,000?"', options: ['Goal Seek', 'Remove Duplicates', 'Flash Fill', 'Conditional Formatting'], answer: 0, explain: 'Data → What-If Analysis → Goal Seek changes one input until a formula reaches your target.' },
    ],
    challenge: {
      id: 'xl-analysis-ch', type: 'open', title: 'The "amazing November"', difficulty: 4, concept: 'anomaly', business: 'E-commerce', minutes: 15,
      context: 'The buyer points at a product that sold ~6x its normal volume in November 2025 and wants to triple the order for this November.',
      prompt: 'Write your reply to the buyer: what you would check before agreeing, what the spike could be, and what you recommend.',
      checklist: [
        { point: 'Compares the spike with the product\'s normal level (median / other months)', keywords: [['normal', 'median', 'usual', 'average', 'other months']] },
        { point: 'Checks whether other products also rose in November (seasonality)', keywords: [['other products', 'season', 'all products', 'every product']] },
        { point: 'Considers a data error (typo, duplicate, wrong unit)', keywords: [['error', 'typo', 'duplicate', 'mistake', 'wrong']] },
        { point: 'Considers a real one-off (bulk order, promotion, stock-out elsewhere)', keywords: [['bulk', 'promotion', 'promo', 'one-off', 'one off', 'campaign']] },
        { point: 'Recommends verifying at source (orders / system) before ordering', keywords: [['check', 'verify', 'confirm', 'source', 'system']] },
        { point: 'Does not recommend tripling the order on this evidence', keywords: [['not', 'wait', 'before', 'hold']] },
      ],
      model: '"Before we triple the order, I\'d like to check the November figure. That product normally sells about X a month; November shows ~6x that, while its other months and similar products only rose by the usual ~25% seasonal lift. That pattern looks like a data problem (e.g. a units field keyed with an extra digit, or duplicated lines), or a one-off such as a bulk order or promotion. I\'ll pull the November order lines from the system today. If it was a one-off or an error, ordering based on it would leave us with a lot of stock. I\'d plan this November on the normal level plus the seasonal uplift."',
      explain: 'Good analysts treat surprises as questions. The best answer checks the data, offers explanations, and protects the business decision.',
    },
    cards: [
      { id: 'xl-analysis-c1', front: 'Growth % formula?', back: '(new − old) ÷ old, or =new/old − 1' },
      { id: 'xl-analysis-c2', kind: 'scenario', front: 'A product is "+300%" this month. First question?', back: 'From what base? 2 → 8 units is +300% and means little. Show counts next to percentages.' },
    ],
  },

  {
    id: 'xl-dashboards', skill: 'excel', level: 'Advanced', title: 'Excel dashboards & reporting', minutes: 12, prereqs: ['xl-pivots', 'xl-analysis'],
    summary: 'One page that answers the manager\'s real questions, and refreshes in one click.',
    lesson: `
### Start from the questions, not the charts
Ask: *who* reads it, *how often*, and *which decisions* it supports. Write the 3–5 questions it must answer. Every element on the page must answer one of them.

### A layout that works
1. **Top row: KPI cards.** Revenue, vs target, vs last year, margin. Big number, small label, a comparison.
2. **Middle: the trend.** A line chart by month, with the target line.
3. **Bottom: the breakdown.** Sorted bar charts by region/category.
4. **Slicers** on the side (Region, Channel, Month), connected to every pivot.

### Design rules
- One message per chart, with a title that *says* the message: "West is 13% behind target", not "Revenue by region".
- Sort bars from largest to smallest; start value axes at zero.
- Use colour to **highlight**, not to decorate: grey for everything, one colour for what matters.
- No 3D, no pie charts with 9 slices, no rainbow palettes.
- Consistent number formats: $1.2M, 12.4%.

### Make it refreshable
- Raw data in a **Table** on its own sheet (or loaded by Power Query).
- Calculations on a hidden "Calc" sheet or in pivots.
- The dashboard sheet only *displays*.
- Refresh = Data → Refresh All.

### Common mistakes
- Twenty charts "just in case": clutter hides the message.
- KPIs without context: "Revenue 347k" tells nothing. vs what? target? last year?`,
    tryIt: {
      id: 'xl-dashboards-try', type: 'mc', difficulty: 3, concept: 'dashboard',
      prompt: 'Which KPI card is most useful for a Head of Retail?',
      options: ['Revenue: $347,418', 'Revenue: $347k · 98% of target · +12% vs last year', 'Revenue (3D pie by region)', 'A table of all 2,954 order lines'], answer: 1,
      hints: ['A number means something only next to a comparison.'],
      explain: 'A KPI needs context: against target and against last year. The raw number alone can\'t tell you whether to celebrate or worry.',
    },
    practice: [
      {
        id: 'xl-dashboards-p1', type: 'open', title: 'Design the Q2 dashboard', difficulty: 4, concept: 'dashboard', business: 'Retail', minutes: 20,
        context: 'Cedarline\'s Head of Retail wants a one-page Q2 dashboard for the leadership meeting: performance vs target by region, the monthly trend, and which categories drive it. The audience has 2 minutes per page.',
        prompt: 'Describe your dashboard: the KPI cards, each chart (type + title), the slicers, and how it refreshes. Keep it to what matters.',
        checklist: [
          { point: 'KPI cards with comparisons (vs target and/or vs last year)', keywords: [['kpi', 'card'], ['target', 'last year', 'vs']] },
          { point: 'A monthly trend (line chart), ideally with a target line', keywords: [['line'], ['month', 'trend']] },
          { point: 'Region vs target shown as sorted bars / variance', keywords: [['region'], ['bar', 'variance']] },
          { point: 'Category breakdown', keywords: [['categor']] },
          { point: 'Chart titles that state the message', keywords: [['title']] },
          { point: 'Slicers and a refresh routine', keywords: [['slicer', 'filter'], ['refresh']] },
        ],
        model: '**Top row (KPI cards):** Q2 net revenue $347k (98% of target, +x% vs Q2 2025) · gross margin % · orders · average order value.\n**Middle:** a line chart of monthly revenue vs target, titled "Revenue ahead of target in April, behind in June".\n**Bottom left:** sorted bars of attainment by region, titled "West is the only region well behind target (87%)".\n**Bottom right:** a bar chart of revenue by category, with margin % as labels.\n**Side:** slicers for Channel and Month, connected to all pivots.\n**Refresh:** the data comes from a Power Query/Table → Refresh All; nothing is typed by hand.',
      },
    ],
    quiz: [
      { id: 'xl-dashboards-q1', type: 'mc', difficulty: 3, concept: 'chart-honesty', prompt: 'Which chart title is best?', options: ['Revenue by region', 'Chart 3', 'West is 13% behind target; all other regions are on track', 'REGIONAL REVENUE Q2 2026 (USD) DATA'], answer: 2, explain: 'A title that states the insight tells a busy reader what to take away.' },
      { id: 'xl-dashboards-q2', type: 'mc', difficulty: 3, concept: 'dashboard', prompt: 'Where should raw data live in a well-built Excel dashboard?', options: ['On the dashboard sheet under the charts', 'In a Table on its own sheet (or loaded by Power Query), feeding pivots', 'In the chart\'s data labels', 'In a separate email'], answer: 1, explain: 'Separate data, calculations and presentation. It makes refreshes and fixes safe.' },
      { id: 'xl-dashboards-q3', type: 'tf', difficulty: 3, concept: 'chart-honesty', prompt: 'True or false: a colourful chart with a different colour per bar is easier to read.', answer: false, explain: 'Colour should highlight what matters. Rainbow bars make every bar look equally important.' },
    ],
    challenge: null,
    cards: [
      { id: 'xl-dashboards-c1', front: 'The 3 layers of a solid Excel report?', back: 'Data (a Table / Power Query) → Calculations (pivots / a calc sheet) → Presentation (dashboard sheet).' },
      { id: 'xl-dashboards-c2', front: 'What makes a KPI card useful?', back: 'The number plus context: vs target, vs last year, and the direction of change.' },
    ],
  },
];
