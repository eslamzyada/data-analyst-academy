// ANALYST THINKING: judgement that no tool gives you. Written answers use a checklist:
// the app ticks what it recognises, you confirm against the model answer.

export const THINK = [
  {
    id: 'think-trust', skill: 'think', level: 'Beginner', title: 'Can you trust this number?', minutes: 10, prereqs: [],
    summary: 'Before reporting any number, check where it came from and what it counts.',
    lesson: `
### The question every analyst asks first
A number arrives: "Revenue is $366k", "Complaints fell to 2.6%". Before you repeat it, check:

1. **Definition**: what exactly is counted? Gross or net? Cancelled orders? Shipping? Which dates?
2. **Denominator**: a rate divided by *what*? Did that change?
3. **Completeness**: all stores, all days? Is the last period partial?
4. **Duplicates and junk rows**: TOTAL rows, blank rows, rows exported twice.
5. **Types and units**: text numbers skipped by SUM, 15 vs 0.15, kg vs g, USD vs EUR.
6. **Reconciliation**: does it match another source (finance system, last month's report)? If not, why?
7. **Plausibility**: compare with history. +300% overnight is usually a data problem.

### Errors can cancel out
A total can look "about right" and still be built on two big mistakes that hide each other, such as a +$52k price typo and a −$48k discount-format error. Matching totals don't prove the data is valid.

### Two datasets disagree?
- Same period, same definition, same filters?
- Timing (order date vs invoice date vs ship date)?
- Currency, tax, returns, cancellations?
- Reconcile step by step: total → by month → by store → by day, until the difference is isolated.`,
    tryIt: {
      id: 'think-trust-try', type: 'mc', difficulty: 2, concept: 'denominator',
      prompt: 'A dashboard says the complaint rate fell from 4.1% to 2.6% after a new returns portal launched. The footnote: "From July, rate = complaints ÷ ALL orders; before, complaints ÷ ONLINE orders." What is the right reaction?',
      options: ['Celebrate: the new portal clearly works', 'Recalculate both months on the same denominator first', 'Ignore the footnote and report the fall', 'Treat it as a normal seasonal change'], answer: 1,
      hints: ['Did the numerator change, or the denominator?'],
      explain: 'On a like-for-like basis (online orders): June 205/5,000 = 4.1%, July 208/4,900 = 4.24%. Slightly WORSE. A definition change created the "improvement".',
    },
    practice: [
      { id: 'think-trust-p1', type: 'open', title: 'Two revenue totals disagree', difficulty: 3, concept: 'data-trust', business: 'Retail', minutes: 10,
        context: 'Finance reports Q2 revenue of $339k. Your sales dashboard says $347k. Your manager asks: "Which one is right?"',
        prompt: 'Explain how you would investigate the difference, step by step.',
        checklist: [
          { point: 'Compare definitions (net vs gross, returns, shipping, tax, cancellations)', keywords: [['definition', 'return', 'shipping', 'tax', 'gross', 'net', 'cancel']] },
          { point: 'Check the date basis and period (order vs invoice/shipping date, cut-off)', keywords: [['date', 'period', 'cut-off', 'cutoff', 'timing']] },
          { point: 'Check the filters/scope (stores, channels, currencies)', keywords: [['filter', 'scope', 'store', 'channel', 'currency']] },
          { point: 'Break the difference down (by month / store / day) to isolate it', keywords: [['month', 'break', 'drill', 'store', 'day', 'isolate']] },
          { point: 'Look for data problems (duplicates, missing rows, typos)', keywords: [['duplicate', 'missing', 'typo', 'error', 'data quality']] },
        ],
        model: '"Neither is wrong until we compare definitions. First I\'d confirm both use the same period and date basis (finance often books by invoice or ship date; the dashboard uses order date), and the same scope (all stores and online, same currency). Then the definition: is finance net of returns, is shipping or tax included, are cancellations excluded? Next I\'d reconcile month by month, then by store, to find where the $8k gap sits. Once it\'s isolated, I\'d check that slice for duplicates, missing days or keying errors. Then I\'d report both numbers with one agreed definition."' },
    ],
    quiz: [
      { id: 'think-trust-q1', type: 'mc', difficulty: 2, concept: 'data-trust', prompt: 'You summed a raw export and the total is within 5% of what you expected. Is that good enough?', options: ['Yes: within 5% of the expected total is close enough', 'No: opposite errors can cancel out; check duplicates, types, units and outliers first', 'Only if the total is a suspiciously round number', 'Yes, as long as the file came from the IT team'], answer: 1, explain: 'A plausible total can hide large errors in both directions.' },
      { id: 'think-trust-q2', type: 'mc', difficulty: 2, concept: 'data-trust', prompt: 'Sales jumped 300% on one day for one store. First step?', options: ['Report the jump to the CEO straight away', 'Check the raw rows for that day: duplicates, a typo, a bulk order', 'Delete that day from the data set', 'Average it with the other days of the month'], answer: 1, explain: 'Look at the underlying records before drawing any conclusion.' },
      { id: 'think-trust-q3', type: 'tf', difficulty: 1, concept: 'denominator', prompt: 'True or false: if a rate improves, the numerator must have improved.', answer: false, explain: 'The denominator might have grown, or its definition changed.' },
      { id: 'think-trust-q4', type: 'mc', difficulty: 2, concept: 'data-trust', prompt: 'This month\'s revenue looks 40% lower than last month\'s. Today is the 14th. What is most likely?', options: ['A collapse in demand', 'The current month is incomplete', 'A database error', 'Seasonality'], answer: 1, explain: 'Partial periods must be compared with the same number of days, not a full month.' },
    ],
    challenge: {
      id: 'think-trust-ch', type: 'open', title: '"Revenue is up 20%!"', difficulty: 3, concept: 'data-trust', business: 'Retail', minutes: 10,
      context: 'A sales manager emails: "Great news, revenue is up 20% this month!"',
      prompt: 'Is a 20% increase automatically good? List what you would check before celebrating.',
      checklist: [
        { point: 'Compare with the same month last year (seasonality)', keywords: [['last year', 'season', 'same month']] },
        { point: 'Check profit/margin, not just revenue (discounts, costs)', keywords: [['profit', 'margin', 'discount', 'cost']] },
        { point: 'Check price vs volume (price rises, mix, a few big orders)', keywords: [['price', 'volume', 'mix', 'big order', 'large order', 'outlier']] },
        { point: 'Check the target / plan and market context', keywords: [['target', 'plan', 'budget', 'market']] },
        { point: 'Check data issues (duplicates, returns not yet processed, definition changes)', keywords: [['duplicate', 'return', 'definition', 'data']] },
      ],
      model: '"Maybe. First I\'d compare with the same month last year: if December is always +20% on November, this is just seasonality. Then profit, not just revenue: heavy discounting can raise revenue and cut margin. I\'d split the growth into price, volume and mix, and check it isn\'t one huge order. I\'d compare with the target, since a plan of +25% would make this a miss. And I\'d check the data: returns not yet processed, duplicate orders, or a changed definition (e.g. now including shipping)."',
    },
    cards: [
      { id: 'think-trust-c1', kind: 'scenario', front: 'Two datasets show different revenue totals. How do you investigate?', back: 'Align the definitions, period/date basis and scope; then reconcile top-down (month → store → day) until the gap is isolated; then check that slice for data problems.' },
      { id: 'think-trust-c2', front: 'Why is "the total looks about right" dangerous?', back: 'Big errors in opposite directions can cancel out; any breakdown of the number would still be wrong.' },
    ],
  },

  {
    id: 'think-metrics', skill: 'think', level: 'Beginner', title: 'Averages, percentages & mix', minutes: 12, prereqs: ['think-trust'],
    summary: 'Mean vs median, percent vs percentage points, and why totals can reverse.',
    lesson: `
### Mean vs median
Eight orders: 42, 38, 55, 47, 51, 39, 44, **2,450**. The mean is **345.75**; the median is **45.50**. One extreme value drags the mean.
- Skewed data (income, order values, delivery times) → report the **median** as "typical", and mention the outliers separately.

### Percent vs percentage points
Conversion goes from 2.0% to 2.5%:
- **+0.5 percentage points** (pp)
- **+25%** relative increase
Say which one you mean. "Up 0.5%" is ambiguous.

### Averages of averages
Region A retains 80% of 1,000 customers; Region B 50% of 10. The combined rate is (800 + 5) / 1,010 = **79.7%**, not the 65% you'd get by averaging the two rates. Build rates from totals.

### Mix effects (Simpson's paradox)
| Store | Footwear return rate | Cooking return rate | Overall |
|---|---|---|---|
| A | 15% (800 units) | 2% (200 units) | **12.4%** |
| B | 18% (200 units) | 3% (800 units) | **6.0%** |
Store A is **better in both categories** but **worse overall**, because it sells mostly footwear (a high-return category). Always compare within comparable groups.

### "The average customer spends $100"
It can mislead because of skew (a few big spenders), because of which customers are included (active only? one-time buyers?), and because of the period. Ask for the distribution.`,
    tryIt: {
      id: 'think-metrics-try', type: 'number', difficulty: 1, concept: 'pct-points',
      prompt: 'Conversion rose from 2.0% to 2.5%. By how many **percent** (relative) did it increase? (type a number)', answer: 25, tolerance: 0.5,
      hints: ['(new − old) ÷ old.'], explain: '(2.5 − 2.0) / 2.0 = 25%. In percentage points it is +0.5 pp.',
    },
    practice: [
      { id: 'think-metrics-p1', type: 'open', title: 'The return-rate performance review', difficulty: 3, concept: 'simpson', business: 'Retail', minutes: 10,
        context: 'The regional director wants to put Store A\'s manager on a performance plan because Store A\'s return rate (12.4%) is double Store B\'s (6.0%). Data: Store A Footwear 800 units / 120 returned, Cooking 200 / 4. Store B Footwear 200 / 36, Cooking 800 / 24.',
        prompt: 'Reply to the director, with numbers.',
        checklist: [
          { point: 'Shows the per-category rates (A 15% vs B 18% footwear; A 2% vs B 3% cooking)', keywords: [['15'], ['18']] },
          { point: 'States that A is better within each category', keywords: [['better', 'lower'], ['each', 'both', 'every', 'within']] },
          { point: 'Explains the mix: A sells mostly footwear, a high-return category', keywords: [['mix', 'mostly footwear', 'more footwear', '80%', 'sells more']] },
          { point: 'Recommends against the performance plan (or a like-for-like comparison)', keywords: [['not', 'no', 'unfair', 'like-for-like', 'like for like']] },
        ],
        model: '"Store A\'s overall rate is higher only because of what it sells. Within each category Store A does better: footwear 15% vs 18%, cooking 2% vs 3%. But 80% of A\'s units are footwear, which is returned far more often, while B mostly sells cooking gear. At the same mix, A would come out lower than B. I\'d not start a performance plan; if anything, look at footwear sizing guidance for both stores."' },
    ],
    quiz: [
      { id: 'think-metrics-q1', type: 'mc', difficulty: 2, concept: 'mean-median', prompt: 'Orders: 42, 38, 55, 47, 51, 39, 44, 2,450. What is the best "typical order value" to report?', options: ['The mean, 345.75, because it uses every order', 'The median, 45.50 (and flag the 2,450 order separately)', 'The largest order, 2,450, as the headline', 'The mode, the value that appears most often'], answer: 1, explain: 'The median resists outliers. Investigate the 2,450 order: bulk order? typo?' },
      { id: 'think-metrics-q2', type: 'mc', difficulty: 2, concept: 'pct-points', prompt: 'Margin moved from 30% to 27%. The correct wording is…', options: ['Margin fell 3%', 'Margin fell 3 percentage points (a 10% relative drop)', 'Margin fell 10 percentage points', 'Margin fell 27%'], answer: 1, explain: '30 → 27 is −3 pp, which is −10% of the original 30.' },
      { id: 'think-metrics-q3', type: 'mc', difficulty: 3, concept: 'denominator', prompt: 'Region A: 80% retention of 1,000 customers. Region B: 50% of 10. Combined retention?', options: ['65%', '79.7%', '50%', '80%'], answer: 1, explain: '(800 + 5) / 1,010. Rates must be built from totals.' },
      { id: 'think-metrics-q4', type: 'mc', difficulty: 2, concept: 'mean-median', prompt: 'Two stores both average 50 transactions a day. Store X has a standard deviation of 5, Store Y 20. Which is true?', options: ['X\'s daily volume is more predictable', 'Y sells more on average', 'Y must have outliers', 'They have identical distributions'], answer: 0, explain: 'A smaller standard deviation = less day-to-day variation.' },
      { id: 'think-metrics-q5', type: 'mc', difficulty: 2, concept: 'anomaly', prompt: 'Which is a standard rule for flagging outliers?', options: ['Any value above the mean of the column', 'Values below Q1 − 1.5×IQR or above Q3 + 1.5×IQR', 'The top 10% of values in the column', 'Any value that is not a whole number'], answer: 1, explain: 'The IQR rule (as in box plots) is robust to extreme values.' },
    ],
    challenge: {
      id: 'think-metrics-ch', type: 'open', title: '"The average customer spends $100"', difficulty: 3, concept: 'mean-median', business: 'E-commerce', minutes: 8,
      prompt: 'Marketing plans a campaign around "our average customer spends $100 a year". What could make this number misleading, and what would you ask for instead?',
      checklist: [
        { point: 'Skew: a few big spenders pull the mean up; ask for the median/distribution', keywords: [['median', 'distribution', 'skew', 'outlier', 'big spender', 'few']] },
        { point: 'Which customers are included (all registered vs active buyers, one-time buyers)', keywords: [['active', 'included', 'registered', 'one-time', 'who']] },
        { point: 'Period and definition (gross vs net of returns, which year)', keywords: [['period', 'year', 'return', 'net', 'definition']] },
        { point: 'Segments (new vs loyal, channel, region) behave differently', keywords: [['segment', 'new', 'loyal', 'group']] },
      ],
      model: '"An average hides the shape. If 5% of customers spend $1,000+, the typical customer may spend $40, so I\'d ask for the median and a histogram of spend. I\'d also check who is in the denominator: everyone registered, or only people who bought this year? Is it net of returns, and for which period? Finally I\'d split it by segment (new vs repeat, online vs store), because a campaign should target a segment, not an average person who doesn\'t exist."',
    },
    cards: [
      { id: 'think-metrics-c1', front: 'Percent vs percentage points: 2% → 2.5%?', back: '+0.5 percentage points = +25% relative.' },
      { id: 'think-metrics-c2', front: 'What is Simpson\'s paradox?', back: 'A trend that holds within every group reverses when the groups are combined, because the groups\' sizes (the mix) differ.' },
    ],
  },

  {
    id: 'think-causation', skill: 'think', level: 'Intermediate', title: 'Cause, correlation & bias', minutes: 12, prereqs: ['think-metrics'],
    summary: 'Did the campaign really work? Correlation, control groups and survivorship bias.',
    lesson: `
### Correlation is not causation
Ice-cream sales and sunburn rise together because of a third factor: summer. Before saying "X caused Y", look for:
- **Seasonality / timing**: would it have happened anyway?
- **Confounders**: something else changed at the same time (price, stock, a competitor closing)
- **Reverse causation**: did Y cause X?

### The fair comparison: a control group
"The email campaign raised AOV by 12%": compare customers who got the email with similar customers who didn't, over the same period. If both rose 12%, the campaign did nothing.

### Survivorship bias
"Customers with us 3+ years spend twice as much, so loyalty makes people spend more." But the low spenders **left** long ago; the survivors were always big spenders. Follow the **same customers** over time (a cohort), or run an experiment.

### Checklist before claiming impact
1. What would have happened without it (baseline / control)?
2. Same period last year?
3. Anything else change?
4. Is the effect bigger than normal week-to-week noise?
5. Is it a few large outliers?`,
    tryIt: {
      id: 'think-causation-try', type: 'mc', difficulty: 2, concept: 'causation',
      prompt: 'AOV rose from $88 to $99 in July, the month of an email campaign. Which evidence would best show the campaign caused it?',
      options: ['Average order value was higher in July than in June', 'Customers who received the email increased AOV much more than similar customers who did not', 'The campaign email had a very high open rate', 'The marketing manager is confident it worked'], answer: 1,
      hints: ['You need a comparison with a group that didn\'t get the email.'], explain: 'A control group isolates the campaign effect from seasonality and everything else that changed in July.',
    },
    practice: [
      { id: 'think-causation-p1', type: 'open', title: 'The loyalty claim', difficulty: 3, concept: 'survivorship', business: 'Retail', minutes: 10,
        prompt: 'An analyst concludes: "Customers with us 3+ years spend twice as much per year as new customers, so loyalty makes customers spend more. Let\'s invest in retention." What\'s wrong with this reasoning, and how would you test the claim properly?',
        checklist: [
          { point: 'Survivorship: low spenders left, so long-tenure customers were high spenders all along', keywords: [['surviv', 'left', 'churn', 'stayed', 'selection']] },
          { point: 'Correlation vs causation', keywords: [['correlation', 'causation', 'cause']] },
          { point: 'Test by following the same customers over time (cohort)', keywords: [['cohort', 'same customers', 'over time', 'track']] },
          { point: 'Or run an experiment / compare with a control group', keywords: [['experiment', 'control', 'test group', 'a/b', 'random']] },
        ],
        model: '"The comparison is biased: the customers who have stayed 3+ years are the ones who were always engaged, while low spenders churned years ago (survivorship). It shows correlation, not that loyalty causes spending. To test it, I\'d follow cohorts (how does the same group\'s spend change in years 1, 2, 3?) and, before investing, run a retention offer on a random half of customers and compare their spend with the other half."' },
    ],
    quiz: [
      { id: 'think-causation-q1', type: 'mc', difficulty: 2, concept: 'causation', prompt: 'Stores with more staff have higher sales. Best interpretation?', options: ['More staff causes more sales, so hire in every store', 'Busy stores get more staff, so the cause may run the other way', 'Staff numbers have no relationship with sales', 'Cut staff in one store to prove the link quickly'], answer: 1, explain: 'Reverse causation / confounding. You\'d need an experiment or careful comparison.' },
      { id: 'think-causation-q2', type: 'mc', difficulty: 2, concept: 'survivorship', prompt: 'Analysing only customers who are still active today to understand "what makes customers stay" risks…', options: ['Survivorship bias', 'Integer division', 'Seasonality', 'Nothing'], answer: 0, explain: 'You never see the ones who left, the very people who would explain churn.' },
      { id: 'think-causation-q3', type: 'tf', difficulty: 2, concept: 'causation', prompt: 'True or false: if sales rose after a campaign, the campaign caused the rise.', answer: false, explain: 'Check the seasonality and other changes, and compare with a control group.' },
    ],
    challenge: {
      id: 'think-causation-ch', type: 'open', title: 'Did the campaign work?', difficulty: 4, concept: 'causation', business: 'E-commerce', minutes: 12,
      context: 'AOV rose from $88 in June to $99 in July (+12.5%). The marketing manager says: "The July email campaign worked."',
      prompt: 'List at least four things you would check before agreeing, and which result would make you doubt the claim.',
      checklist: [
        { point: 'Order count and total revenue (not only AOV)', keywords: [['order count', 'number of orders', 'orders', 'revenue']] },
        { point: 'Outliers / a few very large orders; the median AOV', keywords: [['outlier', 'large order', 'big order', 'median', 'few']] },
        { point: 'Mix changes (categories, channels) and price changes', keywords: [['mix', 'category', 'price', 'channel']] },
        { point: 'Seasonality: July vs July last year', keywords: [['last year', 'season']] },
        { point: 'Recipients vs non-recipients (control group)', keywords: [['control', 'non-recipient', 'did not receive', "didn't receive", 'recipients']] },
        { point: 'States what would disprove it (e.g. AOV rose equally for non-recipients)', keywords: [['doubt', 'disprove', 'if', 'equally', 'same']] },
      ],
      model: 'Checks: (1) did orders and revenue rise, or only AOV (fewer small orders)? (2) Is it driven by a handful of huge orders? Look at the median. (3) Mix: July is tent season, and tents are expensive. Any price changes? (4) Same month last year: was June→July also +12%? (5) Compare email recipients with similar non-recipients. **I\'d doubt the claim if** non-recipients\' AOV rose just as much, if order count fell, or if last July showed the same jump.',
    },
    cards: [
      { id: 'think-causation-c1', front: 'Strongest way to show a campaign caused an effect?', back: 'Compare with a control group that didn\'t get it (ideally randomised), over the same period.' },
      { id: 'think-causation-c2', front: 'What is survivorship bias?', back: 'Drawing conclusions only from the ones that "survived" (stayed, succeeded), ignoring those that dropped out.' },
    ],
  },

  {
    id: 'think-charts', skill: 'think', level: 'Beginner', title: 'Choosing the right chart', minutes: 12, prereqs: [],
    summary: 'Match the chart to the question, and keep it honest.',
    lesson: `
### Start from the question
| Question | Chart |
|---|---|
| How did it change over time? | **Line** |
| Which category is biggest? | **Bar** (horizontal, sorted) |
| Parts of a whole (2–4 parts, one period) | **100% bar** (or a pie, sparingly) |
| How are values spread? | **Histogram**, box plot |
| Do two measures move together? | **Scatter** |
| What drove the change from A to B? | **Waterfall** |
| One headline number | **KPI card** (with a comparison) |
| Two dimensions × one measure | **Heatmap** / matrix with colour |
| Exact values to look up | **Table** |
| Where? | **Map** (only if geography matters) |

### Keep it honest
- **Bars start at zero.** A y-axis starting at $480k makes $500k vs $520k look like 1 vs 2.
- No 3D, no rainbow colours, no pies with 12 slices.
- Grey for context, one colour for the point you're making.
- A title that states the takeaway: "Online now drives half of growth".

### Clutter
Remove gridlines you don't need, legends you can replace with direct labels, and decimals nobody reads.`,
    tryIt: {
      id: 'think-charts-try', type: 'mc', difficulty: 1, concept: 'chart-choice',
      prompt: 'Best chart to compare revenue across 14 product subcategories?', options: ['Pie', 'Line', 'Sorted horizontal bar', 'Radar'], answer: 2,
      hints: ['Many categories, compared by size.'], explain: 'Sorted horizontal bars make ranking obvious, and the long labels fit.',
    },
    practice: [
      { id: 'think-charts-p1', type: 'open', title: 'Fix this chart', difficulty: 2, concept: 'chart-honesty', business: 'Retail', minutes: 8,
        context: 'A slide shows store revenue as a 3D bar chart with rainbow colours and no title. The y-axis starts at $480k, so Summit ($500k) looks half as tall as Canyon ($520k).',
        prompt: 'List the problems and how you would fix each one.',
        checklist: [
          { point: 'Truncated axis exaggerates a ~4% difference → start at zero', keywords: [['zero', 'axis', 'truncat', 'baseline']] },
          { point: 'Remove 3D', keywords: [['3d', '3-d']] },
          { point: 'One colour (highlight one bar) instead of rainbow', keywords: [['colour', 'color', 'rainbow', 'highlight']] },
          { point: 'Add a title stating the message (and units)', keywords: [['title']] },
          { point: 'Sort the bars / add context (target, last year)', keywords: [['sort', 'target', 'last year', 'context', 'label']] },
        ],
        model: 'Start the axis at 0: the real difference is 4%, not 2×. Remove the 3D effect (it distorts heights). Use one neutral colour and highlight only the store you\'re discussing. Add a title with the message ("Canyon edged ahead of Summit, +4%") and the units. Sort the bars and consider adding target markers or last year for context.' },
    ],
    quiz: [
      { id: 'think-charts-q1', type: 'mc', difficulty: 1, concept: 'chart-choice', prompt: 'Distribution of delivery times for 5,000 shipments?', options: ['Pie', 'Histogram', 'Line', 'KPI card'], answer: 1, explain: 'A histogram (or box plot) shows the spread and the long tail.' },
      { id: 'think-charts-q2', type: 'mc', difficulty: 2, concept: 'chart-choice', prompt: 'How profit moved from last year to this year, split by driver (volume, price, cost, returns)?', options: ['Waterfall', 'Scatter', 'Pie', 'Map'], answer: 0, explain: 'A waterfall shows each driver\'s positive or negative contribution between two totals.' },
      { id: 'think-charts-q3', type: 'mc', difficulty: 2, concept: 'chart-choice', prompt: 'Relationship between discount % and gross margin % across 60 products?', options: ['Line', 'Scatter', 'Stacked bar', 'Donut'], answer: 1, explain: 'Scatter: one dot per product, discount on x and margin on y.' },
      { id: 'think-charts-q4', type: 'mc', difficulty: 2, concept: 'chart-choice', prompt: 'Actual vs target for 5 stores this month?', options: ['A pie chart for each store', 'Bars with target markers (bullet chart)', 'A line chart of the five stores', 'A map with a dot per store'], answer: 1, explain: 'Show both values side by side or the variance; sort by gap.' },
      { id: 'think-charts-q5', type: 'tf', difficulty: 1, concept: 'chart-honesty', prompt: 'True or false: a bar chart\'s value axis should start at zero.', answer: true, explain: 'Bar length encodes value; cutting the axis distorts it. (Line charts can zoom in, with care.)' },
    ],
    challenge: null,
    cards: [
      { id: 'think-charts-c1', kind: 'decision', front: 'Trend over 24 months: which chart?', back: 'Line chart.' },
      { id: 'think-charts-c2', kind: 'decision', front: 'Explaining what moved profit between two years?', back: 'Waterfall chart.' },
    ],
  },

  {
    id: 'think-tools', skill: 'think', level: 'Intermediate', title: 'Choosing the right tool', minutes: 10, prereqs: ['think-trust'],
    summary: 'Excel, SQL, Power Query or Power BI? Choose by volume, repetition and audience.',
    lesson: `
### The quick guide
| Situation | Best fit |
|---|---|
| Quick one-off calculation on a small, clean table | **Excel** formulas / a PivotTable |
| Data already in a database; big tables; joins | **SQL** |
| Same messy files every week/month | **Power Query** (Excel or Power BI) |
| Many people exploring the data interactively, refreshed daily | **Power BI** |
| A model with assumptions and scenarios | **Excel** |

### Questions to ask
1. **Where is the data?** A database → start with SQL.
2. **How big?** Over ~1M rows → not a worksheet (use SQL, Power Query/Power Pivot, Power BI).
3. **How often?** Once → quickest tool. Repeated → automate (Power Query / Power BI).
4. **Who uses the result?** One manager → Excel may be fine. Many people, self-service → Power BI.
5. **Does it need to be auditable?** Steps in Power Query or SQL are easier to audit than manual edits.

### Tools combine
A typical pipeline: SQL pulls the data → Power Query shapes it → Power BI (or an Excel pivot) presents it.`,
    tryIt: {
      id: 'think-tools-try', type: 'mc', difficulty: 2, concept: 'tool-choice',
      prompt: 'Every Monday six branches email CSV exports, and you produce the same weekly summary. Best approach?',
      options: ['Copy-paste into Excel each week', 'Power Query folder import + a PivotTable (or Power BI)', 'Retype the numbers', 'Ask branches to stop sending files'], answer: 1,
      hints: ['It\'s repeated, and it\'s files.'], explain: 'Build it once, then drop the files in the folder and click Refresh.',
    },
    practice: [
      { id: 'think-tools-p1', type: 'open', title: 'Three requests, three tools', difficulty: 3, concept: 'tool-choice', business: 'General', minutes: 10,
        prompt: 'For each, name the tool(s) and say why: (a) The CFO asks once: what share of last year\'s revenue came from the top 10% of customers? The data is in the SQL database. (b) Regional managers want to explore sales by product, store and week themselves, refreshed daily. (c) The finance team wants a pricing model where they can change a few assumptions and see profit change.',
        checklist: [
          { point: '(a) SQL, because the data is in the database and it\'s a one-off (window functions / NTILE)', keywords: [['sql']] },
          { point: '(b) Power BI: self-service, interactive, scheduled refresh', keywords: [['power bi']] },
          { point: '(c) Excel: inputs, formulas, scenarios / what-if', keywords: [['excel'], ['scenario', 'assumption', 'what-if', 'what if', 'input', 'model']] },
          { point: 'Reasons mention data location, repetition or audience', keywords: [['database', 'repeat', 'refresh', 'audience', 'self-service', 'self service', 'interactive']] },
        ],
        model: '(a) **SQL**: the data lives in the database and it\'s a one-off question; rank customers with NTILE(10) or a window function, then send the answer (maybe in Excel). (b) **Power BI**: many users, interactive slicing, daily scheduled refresh, row-level security for regions. (c) **Excel**: a transparent model with labelled input cells, formulas and scenario/what-if tools that finance can edit themselves.' },
    ],
    quiz: [
      { id: 'think-tools-q1', type: 'mc', difficulty: 2, concept: 'tool-choice', prompt: '3 million rows of transactions in a database; you need monthly totals by region. Start with…', options: ['Copy-paste into Excel', 'SQL (aggregate in the database)', 'A pie chart', 'Power Point'], answer: 1, explain: 'Aggregate where the data lives; bring back only the summary.' },
      { id: 'think-tools-q2', type: 'mc', difficulty: 2, concept: 'tool-choice', prompt: 'A manager wants to test "what if prices rise 5% and volume falls 3%" on a small P&L.', options: ['Power BI', 'SQL', 'Excel with input cells', 'Power Query'], answer: 2, explain: 'Scenario models with editable assumptions are Excel\'s home ground.' },
      { id: 'think-tools-q3', type: 'tf', difficulty: 2, concept: 'tool-choice', prompt: 'True or false: a good analyst uses one favourite tool for everything.', answer: false, explain: 'Pick by data location, volume, repetition and audience, and combine tools.' },
    ],
    challenge: null,
    cards: [
      { id: 'think-tools-c1', kind: 'decision', front: 'Excel, SQL, Power Query or Power BI: a weekly clean-up of 6 CSV files?', back: 'Power Query (folder import), feeding a PivotTable or Power BI.' },
      { id: 'think-tools-c2', kind: 'decision', front: 'One-off question on data in the company database?', back: 'SQL: aggregate in the database and bring back only the answer.' },
    ],
  },

  {
    id: 'think-communication', skill: 'think', level: 'Intermediate', title: 'From question to recommendation', minutes: 12, prereqs: ['think-causation', 'think-charts'],
    summary: 'Scope vague requests, then explain results so managers can act.',
    lesson: `
### Scoping a vague request
"West is underperforming. Figure out why." Before touching data, ask:
1. **Underperforming vs what?** Target, last year, other regions?
2. **Which metric?** Revenue, margin, growth, customers?
3. **Which period?**
4. **What decision** will this inform (staffing, a store closure, targets)?
Then write a short plan: the data you need, your first 3 analyses, and how you could be wrong.

### The answer-first structure
Managers read the first line. Lead with the conclusion:
1. **One-sentence insight**: what happened and why, with a number
2. **Three supporting facts**: each with a number
3. **Recommendation**: what to do next
4. **Caveats**: how far the numbers can be trusted, what's unknown

> "West reached only 87% of its Q2 target (−$14k). It isn't a demand problem: West in-store sales grew 37% year on year, in line with other regions. The target assumed the new Canyon store would add sales on top of Summit, but Canyon mostly took Summit's customers (Summit −30%). Recommend resetting West's target, and reviewing Canyon's local marketing."

### Plain language
No jargon ("LEFT JOIN", "p-value") in the headline. A number in every bullet. One idea per sentence.`,
    tryIt: {
      id: 'think-communication-try', type: 'mc', difficulty: 2, concept: 'scoping',
      prompt: 'The COO says "West is underperforming, find out why." What is the best FIRST question to ask?',
      options: ['Which type of chart would you like to see in the report?', 'Underperforming compared with what: target, last year, or other regions?', 'Can I have admin access to every database first?', 'Should I do this analysis in SQL or in Excel?'], answer: 1,
      hints: ['You can\'t measure "underperforming" without a comparison.'], explain: 'The comparison defines the analysis. Here, West beat last year but missed a target that assumed the new store would add sales on top of Summit.',
    },
    practice: [
      { id: 'think-communication-p1', type: 'open', title: 'Scope the West question', difficulty: 3, concept: 'scoping', business: 'Retail', minutes: 12,
        prompt: 'The COO says: "The West region is underperforming. Figure out why." (a) Three questions you\'d ask first. (b) The data you need. (c) Your first three analyses. (d) One way your conclusion could turn out to be wrong.',
        checklist: [
          { point: 'Asks "compared with what" (target / last year / other regions)', keywords: [['target', 'last year', 'compared', 'versus', 'vs']] },
          { point: 'Asks which metric and period', keywords: [['metric', 'revenue', 'margin', 'period', 'month', 'quarter']] },
          { point: 'Needs store-level data (Summit vs Canyon, opening dates)', keywords: [['store', 'summit', 'canyon', 'opening']] },
          { point: 'Plans to split into orders × average order value / channel', keywords: [['order', 'aov', 'average order', 'channel', 'online']] },
          { point: 'Considers cannibalisation by the new store or an unrealistic target', keywords: [['cannibal', 'new store', 'target']] },
        ],
        model: '(a) Underperforming vs what: target, last year or the other regions? On which metric (revenue, margin)? Over which period, and what decision rides on it? (b) Orders and lines by store and channel, targets and how they were set, store opening dates, customer counts, returns, marketing spend. (c) 1) Actual vs target vs last year by store (Summit vs Canyon); 2) split revenue into orders × AOV and online vs in-store; 3) check cannibalisation: did Summit fall as Canyon ramped up? (d) The "problem" may be the target (it assumed Canyon was fully additional), or attribution rules (online sales credited by home region), not store performance.' },
    ],
    quiz: [
      { id: 'think-communication-q1', type: 'mc', difficulty: 2, concept: 'communication', prompt: 'Which opening line is best for a manager?', options: ['I joined four tables with LEFT JOINs, then ran window functions on the result…', 'West hit 87% of its Q2 target (−$14k), mainly because the new Canyon store took customers from Summit instead of adding new ones.', 'There is some interesting data about the West region this quarter.', 'Please see the attached 20 charts for all the details on West.'], answer: 1, explain: 'Lead with the conclusion and a number; the method comes later, if asked.' },
      { id: 'think-communication-q2', type: 'tf', difficulty: 2, concept: 'communication', prompt: 'True or false: a good briefing mentions how far the numbers can be trusted.', answer: true, explain: 'Caveats (data quality, partial periods) protect decisions and your credibility.' },
    ],
    challenge: {
      id: 'think-communication-ch', type: 'open', title: 'Three-bullet briefing', difficulty: 3, concept: 'communication', business: 'Retail', minutes: 10,
      context: 'Facts: Q2 net revenue $347k = 98% of target. North 103%, South 98%, East 107%, West 87% (−$14k). West in-store +37% year on year; Summit −30%, new Canyon store $55k. The raw sales file had price typos (+$52k) and discount-format errors (−$48k) that almost cancelled out; the figures here are after correction.',
      prompt: 'Write (a) a one-sentence insight and (b) a briefing for the Head of Retail: three bullets, 60 words at most.',
      checklist: [
        { point: 'Headline with the total vs target (98% / $347k)', keywords: [['98', '347']] },
        { point: 'West gap with a number (87% or −$14k)', keywords: [['87', '14k', '14,', '13,9', '13.9']] },
        { point: 'Cause: Canyon taking sales from Summit (not a demand problem)', keywords: [['canyon', 'summit', 'cannibal']] },
        { point: 'Data trust note (the raw file was corrected)', keywords: [['correct', 'error', 'typo', 'clean', 'trust']] },
        { point: 'A recommendation or next step', keywords: [['recommend', 'reset', 'review', 'next', 'should']] },
      ],
      model: '(a) "Q2 revenue reached 98% of target; only West missed, because the new Canyon store is taking Summit\'s customers rather than adding new ones."\n(b)\n- Q2 net revenue $347k (98% of target); North, South and East at 98–107%.\n- West 87% (−$14k): West in-store +37% YoY, but Summit −30% as Canyon ramps up. Recommend resetting West\'s target and reviewing Canyon\'s local marketing.\n- Figures corrected for price typos and discount errors in the raw export.',
    },
    cards: [
      { id: 'think-communication-c1', front: 'The answer-first structure?', back: 'One-sentence insight → 3 supporting facts with numbers → recommendation → caveats.' },
      { id: 'think-communication-c2', kind: 'interview', front: 'Interview: "How do you communicate findings to non-technical people?"', back: 'Lead with the conclusion and its impact, one number per point, a clear chart titled with the message, no jargon, a recommendation and the caveats. Offer the method only if asked.' },
    ],
  },
];
