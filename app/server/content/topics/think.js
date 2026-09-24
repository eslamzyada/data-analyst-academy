// Analyst Thinking topics added by the content expansion. The hands-on tasks use the SQL Lab
// databases; their answers are computed in tools/data/answers-think.js.

const CEDAR = { db: 'cedarline', dataset: 'cedarline-db' };
const HR = { db: 'hr', dataset: 'hr-db' };
const OLIVE = { db: 'restaurant', dataset: 'restaurant-db' };

export const THINK_EXTRA = [
  // ================================================================ data quality
  {
    id: 'think-quality', skill: 'think', level: 'Beginner', title: 'Data quality: missing, duplicate & impossible values', minutes: 18,
    prereqs: ['think-trust'], after: 'think-trust',
    summary: 'Find the problems in a dataset before they end up in a report: blanks, duplicates, impossible values and records that contradict each other.',
    lesson: `
### Why this comes first
Every total, average and chart inherits the problems of the rows underneath it. Ten minutes of checks at the start saves a wrong board slide later.

### The five checks
| Check | What you look for | Typical cause |
|---|---|---|
| **Completeness** | blanks, "N/A", "unknown", 0 used as "missing" | optional form fields, failed imports |
| **Uniqueness** | the same customer, order or invoice twice | re-registration, a file loaded twice |
| **Validity** | values that cannot be true (negative quantities, a birth year of 1900) | typing errors, default values |
| **Consistency** | rows that contradict each other (an order before sign-up) | systems with different clocks or rules |
| **Timeliness** | the latest date in the data | an export that stopped last week |

### Missing is not zero
A blank acquisition channel does not mean "no channel"; it means *we don't know*. Count blanks separately and say how much of the result they affect ("5% of customers, $45k of revenue, have no channel recorded").

### Duplicates need a definition
"Duplicate" depends on the key you choose:
- same **customer_id** twice → a loading problem
- same **email** on two customer ids → one person registered twice
- same **employee and date** in a salary history → maybe a duplicate, maybe two real events on one day

Look at the duplicate rows before deleting anything.

### Impossible values
Some values are not just unusual, they cannot happen: an order dated before the customer existed, a return larger than the sale, an absence of 40 days in a 22-day month. Count them, show examples, and ask the data owner which system is right.

### What to do with problems
1. **Measure** them (how many rows, how much value).
2. **Decide** with the business: fix, exclude, or keep and flag.
3. **Document** the decision next to the result.
Never fix data silently.`,
    tryIt: {
      id: 'think-quality-try', type: 'mc', kind: 'scenario', difficulty: 1, concept: 'missing-data',
      prompt: 'In a customer export, 250 of 4,571 customers have no acquisition channel. A colleague suggests filling the blanks with "Organic". What is the best response?',
      options: ['Keep them as "Unknown" and report how much they affect', 'Fill them with "Organic", the largest channel', 'Delete those 250 customers from the analysis', 'Share them out across the channels by size'],
      answer: 0, hints: ['Would filling the blanks make any channel look better or worse than it is?'],
      explain: 'Filling blanks with a guess inflates one channel. Label them Unknown, report their share (about 5% of customers) and ask marketing whether the source can be recovered.',
    },
    practice: [
      {
        id: 'think-quality-p1', type: 'numbers', title: 'How many customers are really the same person?', difficulty: 2, concept: 'duplicates', business: 'Retail', minutes: 20, ...CEDAR,
        skills_tested: ['duplicates', 'data-quality'],
        context: 'Cedarline\'s CRM team says "we have 4,571 customers". You know some people registered twice with the same email address.',
        prompt: 'In **SQL Lab** (Cedarline), group customers by their email, **ignoring upper/lower case and spaces around it** (`lower(trim(email))`), and find the emails that appear more than once.',
        questions: [{ label: 'Customer rows whose email appears more than once' }, { label: 'Different email addresses involved' }, { label: 'Rows you would remove to keep one row per email' }],
        answersKey: 'think-q-dupes',
        hints: ['GROUP BY lower(trim(email)) HAVING COUNT(*) > 1 lists the duplicated emails.', 'Rows to remove = duplicate rows − number of different emails.'],
        explain: 'About 140 rows belong to fewer than 70 people, so the "customer" count is overstated by about 70. That is small overall (1.5%), but it matters for anything per customer: retention, lifetime value, and marketing lists that would email some people twice.',
      },
      {
        id: 'think-quality-p2', type: 'numbers', title: 'Orders from customers who did not exist yet', difficulty: 2, concept: 'data-quality', business: 'Retail', minutes: 20, ...CEDAR,
        skills_tested: ['data-quality', 'validation'],
        context: 'An order cannot be placed by a customer before they signed up. Checking that rule is a quick way to test whether two systems agree.',
        prompt: 'Join **orders** to **customers** and find orders whose order_date is earlier than the customer\'s signup_date.',
        questions: [{ label: 'Orders dated before the customer\'s signup date' }, { label: 'Customers involved' }, { label: 'Largest gap, in days, between such an order and the signup' }],
        answersKey: 'think-q-dates',
        hints: ['Dates are text in YYYY-MM-DD format, so a simple < comparison works.', 'julianday(a) - julianday(b) gives the number of days between two dates.'],
        explain: 'Only a handful of orders break the rule, but one is well over a year before sign-up. That usually means the signup date was overwritten (for example when a customer re-registered), not that time travel happened. Report it to the CRM owner; for analysis, use the first order date as the start of the relationship.',
      },
      {
        id: 'think-quality-p3', type: 'numbers', title: 'How big is the "unknown" channel?', difficulty: 2, concept: 'missing-data', business: 'Marketing', minutes: 20, ...CEDAR,
        skills_tested: ['missing-data', 'data-quality'],
        context: 'Marketing wants revenue by acquisition channel for 2025. Before building the chart, measure how much of it cannot be assigned to any channel.',
        prompt: 'Count the customers with no acquisition channel, and the 2025 revenue (completed orders, after discounts) from those customers.',
        questions: [{ label: 'Customers with a blank acquisition channel' }, { label: 'Their share of all customers', unit: '%', percent: true, tolerance: 0.1 }, { label: '2025 completed revenue from those customers', unit: '$' }],
        answersKey: 'think-q-missing',
        hints: ['acquisition_channel IS NULL finds the blanks (= NULL never matches).', 'Revenue = quantity × unit_price × (1 − discount_pct), completed orders only.'],
        explain: 'About one customer in twenty has no channel, carrying tens of thousands of dollars of 2025 revenue. The chart should show an "Unknown" bar rather than hide it, and marketing should know that channel comparisons have that margin of doubt.',
      },
    ],
    challenge: {
      id: 'think-quality-ch', type: 'numbers', title: 'Duplicates or two real events?', difficulty: 3, concept: 'duplicates', business: 'HR', minutes: 25, ...HR,
      skills_tested: ['duplicates', 'data-quality', 'business-questions'],
      context: 'HR\'s salary history should have one row per salary change. A data engineer wants to "remove duplicates" where an employee has two rows on the same date.',
      prompt: 'In **SQL Lab** (Brightpath), find employees with more than one salary row on the same effective date, and look at those rows before deciding anything.',
      questions: [{ label: 'Employee/date pairs with more than one row' }, { label: 'In how many of those pairs is the "Promotion" row the higher salary?' }, { label: 'Salary rows left if you keep one row per employee per date' }],
      answersKey: 'think-q-salary',
      hints: ['GROUP BY employee_id, effective_date HAVING COUNT(*) > 1.', 'Look at change_reason in those rows. Are they copies?'],
      explain: 'They are not copies: each pair is an annual raise and a promotion on the same day, and the promotion is always the higher salary. Deleting "duplicates" at random would keep the lower salary half the time and understate pay. The right rule is to keep the latest change (the promotion), and the right first step was to look at the rows.',
    },
    cards: [
      { id: 'think-quality-c1', front: 'The five data quality checks?', back: 'Completeness, uniqueness, validity, consistency, timeliness.' },
      { id: 'think-quality-c2', kind: 'decision', front: 'A column has blanks. Fill them with a guess?', back: 'No. Label them Unknown, measure their impact, and ask whether the source can be fixed.' },
      { id: 'think-quality-c3', kind: 'debug', front: 'Two rows share the same key. Delete one?', back: 'Look first: they may be two real events (a raise and a promotion on the same day).' },
    ],
  },

  // ================================================================ outliers and distributions
  {
    id: 'think-averages', skill: 'think', level: 'Beginner', title: 'Outliers, distributions & misleading averages', minutes: 16,
    prereqs: ['think-metrics'], after: 'think-metrics',
    summary: 'Look at the shape of the data before summarising it: skew, outliers, percentiles and why the mean can mislead.',
    lesson: `
### One number hides a shape
"Average refund: $109" sounds precise. But if most refunds are around $50 and a few are $700, the average describes nobody. Before choosing a summary, look at the **distribution**: a histogram, or a few percentiles.

### Mean, median and skew
- **Mean**: total ÷ count. Pulled up by a few very large values.
- **Median**: the middle value. Not affected by how extreme the extremes are.
- When the mean is well above the median, the data is **right-skewed** (salaries, order values, delivery times, house prices).

For skewed data, report the median (and maybe the mean too, labelled).

### Percentiles
- The **90th percentile** is the value 90% of cases are below. "90% of deliveries arrive within 4 days" is often more useful than an average of 2.3 days.
- The range between the 25th and 75th percentiles (the **interquartile range**, IQR) shows where the middle half sits.

### Outliers: error or real?
An outlier is a value far from the rest. It can be:
- an **error** (a price typed as 1990 instead of 19.90) → fix or exclude, and say so
- a **real, important case** (one huge corporate order) → keep it, and maybe report it separately

A common flag: more than 1.5 × IQR above the 75th percentile, or below the 25th. A flag is a reason to look, not a reason to delete.

### Averages of averages
Averaging three store averages gives each store equal weight, whatever its size. The company average is **total ÷ total**. The two can differ, and the second is usually what a manager means.

### Say what you did
"Median delivery time 2 days (mean 2.3; three shipments over 20 days excluded as data errors, listed in the appendix)." One sentence, and nobody is misled.`,
    tryIt: {
      id: 'think-averages-try', type: 'mc', kind: 'interpretation', difficulty: 2, concept: 'outliers',
      prompt: 'Refunds have a mean of $109 and a median of $75. What does that tell you?',
      options: ['A minority of large refunds pulls the mean up', 'Most refunds are above $109', 'The data must contain an error', 'Mean and median should always match'],
      answer: 0, hints: ['Which summary is affected by extreme values?'],
      explain: 'A mean well above the median means the data is right-skewed: most refunds are modest and a smaller number of large ones raise the average. For a "typical refund", the median is the better answer.',
    },
    practice: [
      {
        id: 'think-averages-p1', type: 'numbers', title: 'What is a typical refund?', difficulty: 2, concept: 'mean-median', business: 'E-commerce', minutes: 20, ...CEDAR,
        skills_tested: ['mean-median', 'outliers'],
        context: 'The finance team wants a "typical refund" figure for a customer-service budget. Someone already quoted the average.',
        prompt: 'Using the **returns** table (all rows), calculate the mean refund, the median refund, and how many refunds are above $200.',
        questions: [{ label: 'Mean refund', unit: '$' }, { label: 'Median refund', unit: '$' }, { label: 'Refunds above $200' }],
        answersKey: 'think-avg-refund',
        hints: ['SQLite has AVG but no MEDIAN in plain SQL. SQL Lab adds a MEDIAN() aggregate, or sort the values and take the middle one.', 'COUNT(*) with WHERE refund_amount > 200.'],
        explain: 'The typical refund (median) is well below the average, because a minority of expensive items (tents, sleeping bags) are refunded too. For budgeting the total, the mean × volume is right; for describing a typical case, the median is.',
      },
      {
        id: 'think-averages-p2', type: 'numbers', title: 'Average salary or median salary?', difficulty: 2, concept: 'mean-median', business: 'HR', minutes: 20, ...HR,
        skills_tested: ['mean-median', 'outliers'],
        context: 'A job advert draft says "our average salary is $46,000". HR asks whether that describes a typical employee.',
        prompt: 'For **current** employees (no termination date), find the count, the mean and median of current_salary, and how many earn more than twice the median.',
        questions: [{ label: 'Current employees' }, { label: 'Mean salary', unit: '$' }, { label: 'Median salary', unit: '$' }, { label: 'Employees earning more than twice the median' }],
        answersKey: 'think-avg-salary',
        hints: ['termination_date IS NULL means still employed.', 'Twice the median is a simple way to spot the high earners pulling the mean up.'],
        explain: 'The mean is several thousand dollars above the median because a small group of senior staff earn far more. A typical employee earns about the median. An advert quoting the mean would overstate what most people earn.',
      },
    ],
    challenge: {
      id: 'think-averages-ch', type: 'numbers', title: 'The average price per dish, two ways', difficulty: 3, concept: 'weighted-avg', crossConcept: true, business: 'Restaurant', minutes: 25, ...OLIVE,
      skills_tested: ['mean-median', 'metric-choice'],
      context: 'Olive & Ember\'s owner asks for "the average price a customer paid per item in July 2026". The area manager averaged the three sites\' averages.',
      prompt: 'For **July 2026**, calculate each site\'s average price per item sold (net_sales ÷ qty_sold), then the simple average of the three, and the group figure (total net sales ÷ total items).',
      questions: [{ label: 'Simple average of the three site averages', unit: '$', tolerance: 0.01 }, { label: 'Group average price per item (total ÷ total)', unit: '$', tolerance: 0.01 }, { label: 'Site with the highest average price per item', accept: ['Olive & Ember Riverside', 'Olive and Ember Riverside', 'Riverside'] }],
      answersKey: 'think-avg-price',
      hints: ['Group by restaurant for the site averages.', 'The group figure weights each site by how many items it sold.'],
      explain: 'The two answers are close here because the sites sell similar volumes, but they are not the same number, and with sites of very different sizes they can be far apart. The group figure is total ÷ total. Riverside charges the most per item, which is worth a look at its menu mix.',
    },
    cards: [
      { id: 'think-averages-c1', front: 'Mean well above median means...?', back: 'Right-skew: a minority of large values pulls the mean up. Report the median for "typical".' },
      { id: 'think-averages-c2', front: 'What is the 90th percentile?', back: 'The value that 90% of cases are below.' },
      { id: 'think-averages-c3', kind: 'decision', front: 'You find an outlier. Delete it?', back: 'Only if it is an error, and say so. Real extreme cases are kept, and sometimes reported separately.' },
    ],
  },

  // ================================================================ asking the right questions
  {
    id: 'think-questions', skill: 'think', level: 'Beginner', title: 'Asking the right business questions', minutes: 14,
    prereqs: ['think-trust'], after: 'think-averages',
    summary: 'Before analysing, find out what decision the work supports, how things are defined, and what information is missing.',
    lesson: `
### Most requests are incomplete
"Can you pull sales by region?" leaves out almost everything that matters. An analyst who asks three good questions first saves a day of rework.

### The five things to pin down
| Ask about | Example question |
|---|---|
| **Decision** | "What will you do differently depending on the answer?" |
| **Definition** | "Does 'sales' mean before or after discounts and returns?" |
| **Scope** | "Which period, which stores, online too?" |
| **Comparison** | "Compared with what: last year, target, other regions?" |
| **Deadline and format** | "Who reads it, and by when?" |

### Ask about the decision first
If the manager wants to decide which store gets a refit, a list of revenue by store is not enough: you also need trading space, age of the store and maybe margin. The decision tells you what data matters.

### Say what is missing
Good analysts say early: "The data has no footfall, so I can say how much each store sold, but not whether fewer people came in." That shapes expectations and sometimes gets you the missing data.

### Write it down
A short scoping note avoids surprises:
> *Question:* Why is West behind target in Q2?
> *Decision:* Whether to change the West targets or the West plan.
> *Measure:* In-store revenue after discounts, completed orders.
> *Compare with:* Q2 target and Q2 last year.
> *Not available:* Footfall, staffing levels.

### When the request is simply wrong
Sometimes the question assumes something untrue ("why did sales fall?" when they did not). Check the premise politely before explaining it.`,
    tryIt: {
      id: 'think-questions-try', type: 'mc', kind: 'scenario', difficulty: 1, concept: 'business-questions',
      prompt: 'A manager asks: "Can you send me customer numbers by month?" Which question should you ask first?',
      options: ['What decision will these numbers support?', 'Which colour should the chart use?', 'Do you want it in Excel or PDF?', 'Should I include every column?'],
      answer: 0, hints: ['Which answer changes what data you pull?'],
      explain: 'The decision decides the definition ("customers" who bought? signed up? are active?), the period and the comparison. Format questions come later.',
    },
    practice: [
      {
        id: 'think-questions-p1', type: 'open', title: 'Scope a vague request', difficulty: 2, concept: 'business-questions', business: 'Restaurant', minutes: 15,
        skills_tested: ['business-questions', 'scoping'],
        context: 'The owner of a three-site restaurant group emails you: "Food costs feel high lately. Can you look into it?"',
        prompt: 'Write the questions you would ask before starting (at least five), and a one-paragraph scoping note describing what you will analyse.',
        checklist: [
          { point: 'Asks what "high" is compared with (a target, last year, industry benchmark)', keywords: [['compared', 'target', 'last year', 'benchmark', 'normal']] },
          { point: 'Asks how food cost is defined (purchases, or usage with stock changes; % of sales)', keywords: [['defin', 'purchases', 'stock', 'usage', '% of sales', 'percentage']] },
          { point: 'Asks about the period ("lately") and which sites', keywords: [['period', 'month', 'since', 'when', 'lately'], ['site', 'restaurant', 'location', 'all three']] },
          { point: 'Asks what decision or action will follow (menu prices, suppliers, portioning)', keywords: [['decision', 'action', 'change', 'price', 'supplier', 'portion']] },
          { point: 'Mentions data that may be needed (stock counts, supplier prices, waste log, sales)', keywords: [['stock', 'inventory', 'supplier', 'waste', 'invoice']] },
          { point: 'Writes a clear scoping note: question, measure, comparison, data', keywords: [['scope', 'i will', 'will analyse', 'will analyze', 'plan']] },
        ],
        model: `**Questions**
1. When did food costs start to feel high, and compared with what: last year, a target %, or a supplier invoice total?
2. How do you measure food cost today: supplier invoices, or ingredients used (opening stock + purchases − closing stock)?
3. Is it all three sites or one in particular?
4. Has anything changed recently: menu, suppliers, portion sizes, staff?
5. What would you do with the answer: change prices, change suppliers, or change kitchen practices?
6. Do you have month-end stock counts and the waste log for the same period?

**Scoping note**
I will compare food cost as a percentage of net sales (ingredients used ÷ net sales) by site and month for this year and last year, and break any increase into supplier price changes, waste and portioning/menu mix. I will need purchases, month-end stock counts, the waste log and daily sales. I will not be able to see portion sizes directly unless recipe cards are available.`,
        hints: ['Think about definitions, comparisons, period, decision and data.', 'What exactly does "food cost" mean in a restaurant?'],
        explain: 'A good scoping step turns a feeling into a measurable question with a definition, a comparison and a list of data. It also tells the owner what cannot be answered.',
      },
      {
        id: 'think-questions-p2', type: 'open', title: 'What information is missing?', difficulty: 3, concept: 'business-questions', business: 'Logistics', minutes: 15,
        skills_tested: ['business-questions', 'data-quality'],
        context: 'A logistics manager sends a spreadsheet of 2,000 deliveries (date, driver, depot, promised date, delivered date) and asks: "Which driver is our worst performer?"',
        prompt: 'Explain why the data may not be enough to answer fairly, and list the extra information you would ask for.',
        checklist: [
          { point: 'Notes that routes differ in difficulty (distance, urban/rural, number of drops)', keywords: [['route', 'distance', 'rural', 'urban', 'drops', 'difficult']] },
          { point: 'Notes that the number of deliveries per driver affects how reliable a rate is', keywords: [['number of deliveries', 'sample', 'volume', 'how many', 'few deliveries']] },
          { point: 'Asks how "late" is defined (promised date, time window, customer-caused delays)', keywords: [['late', 'on time', 'on-time'], ['defin', 'window', 'promised']] },
          { point: 'Asks about causes outside the driver\'s control (vehicle, loading delays, customer not home)', keywords: [['vehicle', 'loading', 'warehouse', 'customer', 'traffic', 'weather', 'outside']] },
          { point: 'Suggests comparing like with like rather than ranking all drivers together', keywords: [['like with like', 'compare', 'same route', 'same depot', 'fair']] },
        ],
        model: `Ranking drivers on late deliveries alone could be unfair:
- **Routes differ.** A rural route with 60 drops is harder than a short urban one. I would need route, distance and number of drops.
- **Volume differs.** A driver with 20 deliveries and 3 late ones (15%) is not clearly worse than one with 400 and 40 late (10%). Small numbers swing a lot.
- **Definition.** Is a delivery late if it misses the promised day, or a time window? Are customer-caused failures (nobody home) counted?
- **Causes outside the driver's control.** Late loading at the depot, vehicle breakdowns, traffic incidents.

I would ask for route and drop counts, the reason code for each late delivery, and depot loading times, then compare drivers on similar routes, with a note on how many deliveries each figure is based on.`,
        hints: ['Is every driver doing the same work?', 'How many deliveries does a driver need before a percentage means something?'],
        explain: 'A "worst performer" question is often really a question about fairness. Asking for route difficulty, volumes and reason codes prevents blaming the wrong person.',
      },
    ],
    challenge: {
      id: 'think-questions-ch', type: 'open', title: 'The request that assumes too much', difficulty: 3, concept: 'business-questions', business: 'Retail', minutes: 20,
      skills_tested: ['business-questions', 'communication'],
      context: 'The retail director writes: "Online sales are falling because of the new website. Please prove it for tomorrow\'s board meeting." You have not looked at the data yet.',
      prompt: 'Write your reply to the director (5 to 8 sentences). Be helpful, but do not promise to prove something before checking it.',
      checklist: [
        { point: 'Agrees to help and gives a realistic plan for tomorrow', keywords: [['will', 'can', 'tomorrow', 'by']] },
        { point: 'Checks the premise first: whether online sales actually fell, and compared with what', keywords: [['check', 'first', 'whether', 'confirm'], ['fell', 'fall', 'decline', 'drop']] },
        { point: 'Says the analysis will test the website explanation rather than assume it', keywords: [['test', 'whether the website', 'other reasons', 'other causes', 'rule out']] },
        { point: 'Names other possible causes (season, prices, stock, marketing, tracking changes)', keywords: [['season', 'price', 'stock', 'marketing', 'campaign', 'tracking']] },
        { point: 'Asks for the website launch date or change log', keywords: [['launch', 'go-live', 'went live', 'change log', 'release']] },
      ],
      model: `Happy to help with this for tomorrow. First I will check how online sales have moved and against what (the same weeks last year, and before and after the new website went live), so the board sees the right comparison.

I will then test the website explanation rather than start from it: other things can move online sales at the same time, such as seasonality, price changes, stock availability, a paused marketing campaign, or a change in how sales are tracked.

Could you send me the exact go-live date and any list of changes that came with the new site? If the timing and the pattern point to the website, I will show that clearly; if they point elsewhere, you will have that before the meeting rather than during it.`,
      hints: ['Has anyone checked that sales fell?', 'What else could explain a fall at the same time?'],
      explain: 'Being helpful does not mean agreeing in advance. A good reply checks the premise, tests the explanation, and asks for the one fact (the launch date) that makes the analysis possible.',
    },
    cards: [
      { id: 'think-questions-c1', front: 'Five things to pin down before analysing?', back: 'The decision, the definitions, the scope, the comparison, and the deadline/format.' },
      { id: 'think-questions-c2', kind: 'decision', front: 'The request assumes something you have not checked. What do you do?', back: 'Check the premise first, then test the explanation instead of assuming it.' },
    ],
  },

  // ================================================================ interpreting results
  {
    id: 'think-interpret', skill: 'think', level: 'Intermediate', title: 'Interpreting results: noise, samples & seasonality', minutes: 18,
    prereqs: ['think-metrics'], after: 'think-causation',
    summary: 'Is a change real? Weekday patterns, seasonality, small samples and regression to the mean.',
    lesson: `
### Most changes are not news
Numbers move for boring reasons. Before explaining a change, rule these out:

| Boring reason | Example | Fair comparison |
|---|---|---|
| **Day-of-week mix** | Saturday vs Monday | same weekday, or a full week |
| **Seasonality** | January vs December | January last year |
| **Calendar** | a month with 5 weekends | same number of trading days |
| **Partial periods** | 14 days vs a full month | same days last month |
| **Small numbers** | 3 returns out of 20 | wait for more data, or show the count |

### Small samples swing
A store with 20 orders a week can move from 5% to 15% returns by chance (1 vs 3 returns). A store with 2,000 orders cannot. Always show the count next to a percentage, and be careful ranking small groups.

### Regression to the mean
The worst performer this month is often less bad next month even if nothing changes, because part of any extreme result is luck. That makes "we intervened and it improved" look convincing when it may not be. Compare with a similar group that got no intervention.

### Month on month vs year on year
- **Month on month** tells you the direction recently, but mixes in seasonality.
- **Year on year** removes the season, but is slower to show a change.
Use both, and say which one you quote.

### Say how sure you are
"Returns rose from 4% to 6%, based on 150 orders; that is within normal week-to-week variation" is more useful than "Returns up 50%!".`,
    tryIt: {
      id: 'think-interpret-try', type: 'mc', kind: 'interpretation', difficulty: 2, concept: 'seasonality',
      prompt: 'A restaurant\'s January sales were 14% below December. The owner is worried. What is the best first check?',
      options: ['Compare January with January last year', 'Compare January with the best month', 'Count the number of dishes on the menu', 'Check the colour of the chart'],
      answer: 0, hints: ['Which months are usually strong for restaurants?'],
      explain: 'December is a peak month for restaurants. January versus last January removes the season and shows whether the business is really weaker.',
    },
    practice: [
      {
        id: 'think-interpret-p1', type: 'numbers', title: 'Saturday is not growth', difficulty: 2, concept: 'interpretation', business: 'Restaurant', minutes: 20, ...OLIVE,
        skills_tested: ['interpretation', 'seasonality'],
        context: 'A new shift manager at Olive & Ember Downtown reports: "Saturday was 70% up on Monday, my changes are working!"',
        prompt: 'For **Downtown** (restaurant_id 1) in **July 2026**, calculate the average net sales per Saturday and per Monday, and the difference.',
        questions: [{ label: 'Average net sales per Saturday, July 2026', unit: '$' }, { label: 'Average net sales per Monday, July 2026', unit: '$' }, { label: 'How much higher Saturday is, in %', unit: '%', percent: true, tolerance: 0.5 }],
        answersKey: 'think-int-weekday',
        hints: ["strftime('%w', sale_date) returns 0 for Sunday and 6 for Saturday.", 'Average per day = total net sales ÷ number of distinct dates.'],
        explain: 'Saturdays are routinely much busier than Mondays, before anyone changed anything. Comparing a Saturday with a Monday says nothing about the manager\'s changes; compare Saturdays with previous Saturdays instead.',
      },
      {
        id: 'think-interpret-p2', type: 'numbers', title: 'January: bad month or normal January?', difficulty: 3, concept: 'seasonality', business: 'Restaurant', minutes: 20, ...OLIVE,
        skills_tested: ['seasonality', 'interpretation'],
        context: 'Riverside\'s manager is called in because January 2026 sales "collapsed" compared with December.',
        prompt: 'For **Riverside** (restaurant_id 2), compare January 2026 net sales with December 2025 and with January 2025.',
        questions: [{ label: 'Net sales, January 2026', unit: '$' }, { label: 'Change vs December 2025', unit: '%', percent: true, tolerance: 0.3 }, { label: 'Change vs January 2025', unit: '%', percent: true, tolerance: 0.3 }],
        answersKey: 'think-int-season',
        hints: ['Use sale_date LIKE \'2026-01%\' for a month.', 'Change = (new − old) ÷ old.'],
        explain: 'January is well below December, which is normal after the festive peak, but it is clearly above last January. The manager should be congratulated, not questioned. Month-on-month numbers need the season taken out before anyone reacts.',
      },
    ],
    challenge: {
      id: 'think-interpret-ch', type: 'open', title: 'Is the new process working?', difficulty: 4, concept: 'interpretation', business: 'Logistics', minutes: 25,
      skills_tested: ['interpretation', 'sample-size', 'causation'],
      context: 'A warehouse changed its packing process at the three depots with the most damaged parcels last quarter. This quarter their damage rate fell from 3.1% to 2.2%. The other depots went from 1.4% to 1.3%. Parcel volumes at the three depots are small (about 600 a quarter each).',
      prompt: 'The operations director wants to roll the new process out everywhere. Write a short, balanced assessment (5 to 8 sentences).',
      checklist: [
        { point: 'Mentions regression to the mean: the worst depots were likely to improve anyway', keywords: [['regression', 'worst', 'extreme', 'bad quarter', 'luck', 'chance']] },
        { point: 'Notes the small volumes and that the change is a handful of parcels', keywords: [['small', 'volume', 'few', 'parcels', 'sample']] },
        { point: 'Compares with the other depots as a baseline', keywords: [['other depots', 'comparison', 'baseline', 'control', '1.3', '1.4']] },
        { point: 'Recommends a fairer test before a full roll-out (more quarters, or a matched comparison)', keywords: [['test', 'trial', 'pilot', 'another quarter', 'more data', 'matched']] },
        { point: 'Stays constructive: the process may work, the evidence is not yet enough', keywords: [['may', 'might', 'promising', 'encouraging', 'not yet', 'not enough']] },
      ],
      model: `The fall from 3.1% to 2.2% is encouraging, but it is not yet good evidence that the new process works.

The three depots were chosen because they had the worst damage rate last quarter. Extreme results tend to move back towards normal on their own, so some improvement was likely even without any change. The volumes are also small: at about 600 parcels a quarter per depot, the improvement is roughly 15 to 20 fewer damaged parcels in total, which is within ordinary quarter-to-quarter variation.

The other depots barely moved (1.4% to 1.3%), which is a useful baseline, but they were not comparable to begin with.

I would keep the process at the three depots for another two quarters, and trial it at two more depots with similar volumes and damage history while two matched depots continue as before. If the gap holds, roll it out; the cost of waiting is small.`,
      hints: ['Why were those three depots chosen?', 'How many parcels does 0.9 percentage points represent?'],
      explain: 'Selecting the worst performers and seeing them improve is the classic regression-to-the-mean trap. A good assessment is positive about the idea but asks for a fairer test.',
    },
    cards: [
      { id: 'think-interpret-c1', front: 'What is regression to the mean?', back: 'Extreme results tend to be followed by less extreme ones, partly because luck played a part in the extreme.' },
      { id: 'think-interpret-c2', front: 'Month on month or year on year?', back: 'MoM shows recent direction but includes seasonality; YoY removes seasonality but reacts slowly. Say which one you use.' },
      { id: 'think-interpret-c3', kind: 'decision', front: 'A percentage based on 20 cases changes a lot. News?', back: 'Probably not. Show the count and wait for more data before concluding.' },
    ],
  },

  // ================================================================ conflicting definitions
  {
    id: 'think-definitions', skill: 'think', level: 'Intermediate', title: 'Conflicting numbers & definitions', minutes: 18,
    prereqs: ['think-quality'], after: 'think-interpret',
    summary: 'Why finance, sales and HR report different numbers for the "same" thing, and how to reconcile them.',
    lesson: `
### Two teams, two "revenue" figures
When two reports disagree, both are often right: they measure different things. Common differences:

| Word | Possible meanings |
|---|---|
| **Revenue** | gross or after discounts; with or without cancelled orders; before or after refunds; with or without shipping and tax |
| **Customers** | registered accounts; people (unique emails); people who bought in the period |
| **Headcount** | people on a date; average over a period; full-time equivalents |
| **Churn** | customers who cancelled; customers with no purchase in 90 days |

### Reconcile, don't choose
Build a **bridge** from one number to the other:
> Sales report revenue (all orders)  $893k
> − cancelled and pending orders     −$31k
> = completed revenue                  $862k
> − refunds on those orders          −$66k
> = net revenue after refunds          $795k

Every step has a name and an amount. Nobody has to trust anybody.

### Timing differences
- Orders by **order date** vs by **payment date** vs by **delivery date**.
- Refunds counted in the month of the **refund** or of the **original sale**.
Both are legitimate. Pick one, say which, and keep it.

### Agree definitions once
A short **data dictionary** ("Net revenue = completed orders, after discounts, excluding shipping and refunds") prevents the same argument every month.

### Turnover needs a denominator
"131 people left" means little on its own. Voluntary turnover rate = leavers in the year ÷ **average** headcount in the year. Using the headcount on one date gives a slightly different figure; say which you used.`,
    tryIt: {
      id: 'think-definitions-try', type: 'mc', kind: 'scenario', difficulty: 2, concept: 'definitions',
      prompt: 'Finance reports 2025 revenue of $795k; the sales team reports $893k. Both come from the same order system. What is the best next step?',
      options: ['Build a bridge showing what each figure includes', 'Use the sales figure because it is bigger', 'Use the finance figure because finance is always right', 'Average the two figures for the board'],
      answer: 0, hints: ['What could make the two totals differ if the data is the same?'],
      explain: 'Different definitions (cancelled orders, refunds, shipping) usually explain the gap. A bridge from one figure to the other shows exactly why, and ends the argument.',
    },
    practice: [
      {
        id: 'think-definitions-p1', type: 'numbers', title: 'Build a revenue bridge', difficulty: 3, concept: 'reconciliation', business: 'Retail', minutes: 30, ...CEDAR,
        skills_tested: ['reconciliation', 'definitions'],
        context: 'The sales team and finance quote different 2025 revenue figures for Cedarline. You are asked to explain the difference.',
        prompt: 'For orders placed in **2025**, calculate revenue after discounts (quantity × unit_price × (1 − discount_pct)) in the ways below.',
        questions: [{ label: 'Completed orders only', unit: '$' }, { label: 'All orders, whatever their status', unit: '$' }, { label: 'Refunds on 2025 completed orders (returns table)', unit: '$' }, { label: 'Completed revenue minus those refunds', unit: '$' }],
        answersKey: 'think-def-revenue',
        hints: ['status is completed, cancelled or pending.', 'Join returns → order_items → orders to link each refund to its original 2025 order.'],
        explain: 'The "all orders" figure includes cancelled and pending orders that never became sales. Completed revenue is lower, and after refunds lower again. Each figure is correct for its own definition; the bridge between them is what a board needs to see.',
      },
      {
        id: 'think-definitions-p2', type: 'numbers', title: 'How many people work here?', difficulty: 3, concept: 'definitions', business: 'HR', minutes: 30, ...HR,
        skills_tested: ['definitions', 'denominator'],
        context: 'Brightpath\'s HR director wants the 2025 voluntary turnover rate. Two managers disagree about which headcount to divide by.',
        prompt: 'Calculate the headcount on 31 December 2025, the average of the twelve month-end headcounts in 2025, the voluntary leavers in 2025, and the voluntary turnover rate using the average headcount.',
        questions: [{ label: 'Headcount on 31 Dec 2025' }, { label: 'Average of the 12 month-end headcounts in 2025', tolerance: 0.5 }, { label: 'Voluntary leavers in 2025' }, { label: 'Voluntary turnover rate (leavers ÷ average headcount)', unit: '%', percent: true, tolerance: 0.3 }],
        answersKey: 'think-def-headcount',
        hints: ['Someone is employed on a date if hire_date <= date and (termination_date IS NULL or termination_date > date).', 'Run the headcount query for each month-end, or use a list of dates in a CTE.'],
        explain: 'The two headcounts are close here, so the rates are too, but in a growing or shrinking company they can differ a lot. Average headcount is the standard denominator for turnover because leavers come from the whole year, not from one day.',
      },
    ],
    challenge: {
      id: 'think-definitions-ch', type: 'numbers', title: 'How many customers do we have?', difficulty: 3, concept: 'definitions', business: 'Retail', minutes: 25, ...CEDAR,
      skills_tested: ['definitions', 'duplicates'],
      context: 'Three people give three answers to "how many customers do we have?": the CRM count, the unique email count, and the number of people who bought something in 2025.',
      prompt: 'Calculate all three for Cedarline.',
      questions: [{ label: 'Customer records in the CRM' }, { label: 'Different email addresses (ignore case and spaces)' }, { label: 'Customers with at least one completed order in 2025' }],
      answersKey: 'think-def-customers',
      hints: ['COUNT(DISTINCT lower(trim(email))).', 'Walk-in orders have no customer_id; COUNT(DISTINCT customer_id) ignores those NULLs.'],
      explain: 'Records, people and active buyers are three different numbers, and the last one is less than half of the first. "How many customers?" needs a definition before it has an answer. For most business decisions, active customers in a period is the useful figure.',
    },
    cards: [
      { id: 'think-definitions-c1', front: 'Two reports disagree on the same metric. First step?', back: 'Compare definitions and build a bridge from one number to the other.' },
      { id: 'think-definitions-c2', front: 'Voluntary turnover rate?', back: 'Voluntary leavers in the period ÷ average headcount in the period.' },
      { id: 'think-definitions-c3', front: 'What is a data dictionary?', back: 'An agreed list of metric definitions (what is included and excluded), so everyone calculates the same way.' },
    ],
  },

  // ================================================================ choosing KPIs
  {
    id: 'think-kpis', skill: 'think', level: 'Intermediate', title: 'Choosing the right metric & KPIs', minutes: 16,
    prereqs: ['think-metrics'], after: 'think-definitions',
    summary: 'Pick measures that match the decision: rates vs totals, leading vs lagging, and KPIs that cannot be gamed.',
    lesson: `
### A KPI is a decision tool
A key performance indicator should tell someone whether to act. If nobody would do anything differently when it moves, it is not a KPI.

### Totals or rates?
- **Totals** answer "how much?" (revenue, returns in $).
- **Rates** answer "how well?" and make different-sized units comparable (return rate, labour cost as % of sales, absence days per employee).
Comparing a big store with a small one on totals mostly compares their size.

### Choose the base carefully
A return rate can be:
- returned units ÷ sold units
- returned orders ÷ orders
- refund value ÷ revenue
They answer slightly different questions (volume, customer experience, money). Pick the one that matches the decision and keep it.

### Leading and lagging
- **Lagging**: results after the fact (quarterly revenue, annual turnover).
- **Leading**: early signals you can act on (website conversion this week, open job offers, stock cover in days).
A good dashboard has both.

### A good KPI is...
| Quality | Question |
|---|---|
| **Relevant** | Does it relate to a goal? |
| **Clear** | Is the definition written down? |
| **Controllable** | Can the owner influence it? |
| **Balanced** | Is there a counter-measure so it cannot be gamed? |
| **Timely** | Is it available soon enough to act? |

### Gaming
"Average handling time" in a call centre falls fastest if agents hang up early. Pair it with first-contact resolution. "Food cost %" falls if portions shrink; pair it with customer satisfaction or complaints.

### Keep the list short
Five to seven KPIs a manager can remember beat forty numbers nobody reads.`,
    tryIt: {
      id: 'think-kpis-try', type: 'mc', kind: 'tool-selection', difficulty: 2, concept: 'metric-choice',
      prompt: 'An HR manager wants to compare absence across departments of 8 and 400 people. Which measure fits?',
      options: ['Absence days per employee', 'Total absence days', 'Number of absent employees', 'The longest single absence'],
      answer: 0, hints: ['Which one would automatically make the biggest department look worst?'],
      explain: 'A rate per employee makes departments of different sizes comparable. Totals mostly reflect department size.',
    },
    practice: [
      {
        id: 'think-kpis-p1', type: 'numbers', title: 'Which return rate?', difficulty: 3, concept: 'metric-choice', business: 'E-commerce', minutes: 25, ...CEDAR,
        skills_tested: ['metric-choice', 'kpi'],
        context: 'Cedarline wants one KPI for returns by channel. Two definitions are on the table: returned units ÷ units sold, and refund value ÷ revenue.',
        prompt: 'For **2025** completed orders, calculate the unit return rate for each channel, and the value-based return rate for Online.',
        questions: [{ label: 'Online unit return rate (units returned ÷ units sold)', unit: '%', percent: true, tolerance: 0.2 }, { label: 'In-store unit return rate', unit: '%', percent: true, tolerance: 0.2 }, { label: 'Online value return rate (refunds ÷ revenue after discounts)', unit: '%', percent: true, tolerance: 0.2 }],
        answersKey: 'think-kpi-returns',
        hints: ['Units returned: SUM(quantity_returned) from returns joined to 2025 completed order lines.', 'Units sold: SUM(quantity) over the same lines.'],
        explain: 'Online returns are more than double the in-store rate by units. The value rate for Online is almost the same as its unit rate, so returned items are neither especially cheap nor expensive. Either definition works for the channel comparison; pick one, write it down, and do not switch between them.',
      },
      {
        id: 'think-kpis-p2', type: 'numbers', title: 'Labour cost as a percentage of sales', difficulty: 3, concept: 'kpi', business: 'Restaurant', minutes: 25, ...OLIVE,
        skills_tested: ['kpi', 'metric-choice'],
        context: 'Olive & Ember\'s owner looks at total labour cost by site and says Riverside is "the most expensive to run". The operations manager suggests labour as a % of net sales instead.',
        prompt: 'For **July 2026**, calculate labour cost (labor_daily) as a percentage of net sales (daily_sales) for each site.',
        questions: [{ label: 'Downtown labour cost % of net sales', unit: '%', percent: true, tolerance: 0.2 }, { label: 'Airport labour cost % of net sales', unit: '%', percent: true, tolerance: 0.2 }, { label: 'Site with the highest labour cost %', accept: ['Olive & Ember Airport', 'Olive and Ember Airport', 'Airport'] }],
        answersKey: 'think-kpi-labour',
        hints: ['Sum labour cost and net sales by restaurant separately (two subqueries), then join them.', 'Joining the two daily tables directly would multiply rows.'],
        explain: 'Riverside spends a lot on labour because it sells the most. Relative to sales, the Airport is the most expensive site to staff. The rate turns "who spends most" into "who uses staff least efficiently", which is the question the owner meant.',
      },
    ],
    challenge: {
      id: 'think-kpis-ch', type: 'open', title: 'Five KPIs for a restaurant group', difficulty: 3, concept: 'kpi', business: 'Restaurant', minutes: 25,
      skills_tested: ['kpi', 'metric-choice', 'communication'],
      context: 'The owner of a three-site restaurant group wants a one-page monthly dashboard. She wants to know whether each site is healthy and where to act.',
      prompt: 'Propose five KPIs. For each: the definition, why it matters, and a counter-measure that stops it being gamed.',
      checklist: [
        { point: 'Includes a sales measure normalised for size (sales per cover or per seat, or growth vs last year)', keywords: [['per cover', 'per seat', 'per guest', 'vs last year', 'growth']] },
        { point: 'Includes food cost % of net sales with a clear definition', keywords: [['food cost'], ['%', 'percent', 'of sales']] },
        { point: 'Includes labour cost % of net sales', keywords: [['labour', 'labor', 'staff cost'], ['%', 'percent', 'of sales']] },
        { point: 'Includes waste as a share of purchases (or food cost)', keywords: [['waste'], ['%', 'share', 'of purchases', 'percent']] },
        { point: 'Includes a customer measure (reviews, complaints, repeat visits)', keywords: [['review', 'complaint', 'satisfaction', 'repeat', 'rating']] },
        { point: 'Pairs at least one KPI with a counter-measure against gaming', keywords: [['counter', 'balance', 'paired', 'gaming', 'game', 'offset']] },
      ],
      model: `1. **Net sales per cover** (net sales ÷ guests served). Shows spend per visit independent of site size. *Counter:* number of covers, so higher prices that drive guests away show up.
2. **Food cost %** ((opening stock + purchases − closing stock) ÷ net sales). The biggest controllable cost. *Counter:* customer rating, so shrinking portions does not look like success.
3. **Labour cost %** (labour cost ÷ net sales). Staffing efficiency. *Counter:* average wait time or complaints, so understaffing is visible.
4. **Waste % of purchases** (valued waste ÷ purchases). Early signal of ordering and prep problems. *Counter:* stock-outs of key dishes, so ordering too little does not look like good control.
5. **Average review score** (and number of reviews). The customer's view. *Counter:* sales per cover, so discounting to buy good reviews is visible.

Each KPI is shown by site against last year and against a target, with the month's figure and a three-month trend.`,
      hints: ['Think about sales, the two biggest costs, waste and the customer.', 'For each KPI, how could a manager make it look better without improving the business?'],
      explain: 'A good KPI set covers sales, the main costs and the customer, uses rates so sites can be compared, and pairs each measure with one that exposes gaming.',
    },
    cards: [
      { id: 'think-kpis-c1', front: 'Totals or rates to compare units of different size?', back: 'Rates (per employee, per cover, % of sales).' },
      { id: 'think-kpis-c2', front: 'Leading vs lagging indicator?', back: 'Leading signals change early enough to act on (conversion, open orders); lagging shows results after the fact (quarterly revenue).' },
      { id: 'think-kpis-c3', kind: 'decision', front: 'How do you stop a KPI being gamed?', back: 'Pair it with a counter-measure (e.g. food cost % with customer rating).' },
    ],
  },

  // ================================================================ validating your own analysis
  {
    id: 'think-validation', skill: 'think', level: 'Intermediate', title: 'Validating your own analysis', minutes: 16,
    prereqs: ['think-quality'], after: 'think-tools',
    summary: 'Catch your own mistakes before anyone else does: control totals, row counts, join checks and sense checks.',
    lesson: `
### Your analysis is guilty until proven innocent
Most wrong numbers in reports are not caused by bad data, but by a step the analyst took: a join that duplicated rows, a filter that removed too much, a formula copied one row too far.

### Five checks before you send anything
| Check | How |
|---|---|
| **Control total** | Does the grand total match a known figure (finance, the source system)? |
| **Row counts** | How many rows before and after each join or filter? Did the count change for a reason you can explain? |
| **Grain** | What does one row mean now? Did a join turn "one row per order" into "one row per order line"? |
| **Sense check** | Is the size plausible (average order $190, not $19,000)? Do the parts add up to the whole? |
| **Spot check** | Pick two or three individual records and check them by hand. |

### Join fan-out
Joining orders to order lines repeats each order once per line. Order-level columns (shipping fee, order discount) then get counted several times. Sum them **before** joining, or at the order level.

### Counting events vs things
A return table may have two rows for the same item returned twice. "Number of returns" (events) and "number of returned items" (things) are different questions. Decide which one you mean.

### Ask someone to break it
A colleague who did not build the analysis will spot assumptions you stopped seeing. Tell them what you checked and ask what you missed.

### Write down what you checked
"Totals reconcile to finance's figure within $12. Excludes 408 cancelled orders." One line builds more trust than a beautiful chart.`,
    tryIt: {
      id: 'think-validation-try', type: 'mc', kind: 'debugging', difficulty: 2, concept: 'validation',
      prompt: 'After joining orders to order lines, total shipping fees went from $7,447 to $8,286. What happened?',
      options: ['Each order\'s fee was repeated once per line', 'Shipping prices went up during the year', 'Some orders were cancelled and removed', 'The order lines contain extra shipping'],
      answer: 0, hints: ['What does one row mean after the join?'],
      explain: 'The join turned one row per order into one row per line, so orders with several lines had their shipping fee counted several times. Sum order-level values before joining.',
    },
    practice: [
      {
        id: 'think-validation-p1', type: 'numbers', title: 'The shipping total that grew by itself', difficulty: 3, concept: 'validation', business: 'E-commerce', minutes: 25, ...CEDAR,
        skills_tested: ['validation', 'fan-out'],
        context: 'A colleague\'s report shows 2025 shipping income higher than finance\'s figure. You suspect the query, not the data.',
        prompt: 'For **2025 completed orders**, count orders and order lines, then total the shipping fee once per order and again after joining orders to order_items.',
        questions: [{ label: 'Completed orders in 2025' }, { label: 'Order lines on those orders' }, { label: 'Shipping fees, summed once per order', unit: '$' }, { label: 'Shipping fees, summed after joining to order lines', unit: '$' }],
        answersKey: 'think-val-fanout',
        hints: ['shipping_fee is a column of orders, not of order_items.', 'After the join, an order with three lines appears three times.'],
        explain: 'The joined total is higher by the fees of every extra line. Row counts told the story before the totals did: orders and lines are different grains. Summing order-level columns at the order level is the fix.',
      },
      {
        id: 'think-validation-p2', type: 'open', title: 'Review a colleague\'s analysis', difficulty: 3, concept: 'validation', business: 'Retail', minutes: 20,
        skills_tested: ['validation', 'communication'],
        context: 'A colleague sends this summary for review: "Average order value rose from $90 to $140 this quarter after we joined the orders table to products to add categories. Online AOV is now $210. I used all orders in the system."',
        prompt: 'List the checks you would ask for before this goes to the director, and explain what might be wrong.',
        checklist: [
          { point: 'Suspects the join duplicated orders (one row per line) and inflated AOV', keywords: [['join', 'duplicat', 'per line', 'fan-out', 'fan out', 'repeated']] },
          { point: 'Asks to check order and row counts before and after the join', keywords: [['row count', 'count', 'number of rows', 'number of orders']] },
          { point: 'Notes that "all orders" may include cancelled or pending orders', keywords: [['cancel', 'pending', 'status']] },
          { point: 'Asks for a control total against a known revenue figure', keywords: [['control total', 'reconcile', 'finance', 'known figure', 'match']] },
          { point: 'Treats the size of the jump as a warning sign (sense check)', keywords: [['too big', 'plausible', 'sense check', 'unlikely', 'jump', '55%', 'suspicious']] },
        ],
        model: `A 55% jump in average order value in one quarter is a warning sign in itself, and the timing matches a change to the query.

**What might be wrong**
- Joining orders to products goes through order lines, so each order appears once per line. If order value is summed per row and divided by the original number of orders, AOV is inflated.
- "All orders in the system" probably includes cancelled and pending orders.

**Checks I would ask for**
1. Number of orders and number of rows before and after the join.
2. Revenue total compared with finance's figure for the quarter (control total).
3. AOV recalculated as revenue ÷ distinct order ids, completed orders only.
4. A spot check of three orders by hand.
5. The same calculation for last quarter with the new query, so the two quarters are comparable.`,
        hints: ['What does joining to products do to the number of rows?', 'Which orders should count as sales?'],
        explain: 'A good review suspects the method first when a number jumps at the same time as the method changed, and asks for concrete checks rather than opinions.',
      },
    ],
    challenge: {
      id: 'think-validation-ch', type: 'numbers', title: 'Returns: events or items?', difficulty: 3, concept: 'validation', business: 'E-commerce', minutes: 20, ...CEDAR,
      skills_tested: ['validation', 'definitions'],
      context: 'The customer-service lead reports "1,466 returned items". The warehouse says fewer items came back. Both used the returns table.',
      prompt: 'Using the **returns** table (all rows), count the return events, the different order lines returned, and the order lines returned more than once.',
      questions: [{ label: 'Return events (rows)' }, { label: 'Different order lines returned' }, { label: 'Order lines returned more than once' }],
      answersKey: 'think-val-returns',
      hints: ['COUNT(DISTINCT order_item_id).', 'GROUP BY order_item_id HAVING COUNT(*) > 1.'],
      explain: 'Some lines were returned in two steps (for example one unit, then another), so events outnumber returned lines. "Returns" as events suits workload planning; returned lines suit product quality analysis. The report should say which it counts.',
    },
    cards: [
      { id: 'think-validation-c1', front: 'Five checks before sending an analysis?', back: 'Control total, row counts, grain, sense check, spot check.' },
      { id: 'think-validation-c2', kind: 'debug', front: 'A total grew after a join. Likely cause?', back: 'Fan-out: the join repeated rows, so order-level values were counted more than once.' },
    ],
  },
];
