// Power BI topics added by the content expansion. They slot into the existing path (see `after`).
// Practice tasks are checked against numbers computed from the same files (tools/data/answers-pbi.js).

const PACK = { label: 'cedarline_powerbi_pack.zip (fact_sales + 3 dimensions)', path: 'cedarline_powerbi_pack.zip' };
const TARGETS = { label: 'store_targets_summer_2026.csv', path: 'powerquery/store_targets_summer_2026.csv' };

export const PBI_EXTRA = [
  // ================================================================ Date tables
  {
    id: 'pbi-datetable', skill: 'pbi', level: 'Beginner', title: 'Building a date table', minutes: 16,
    prereqs: ['pbi-star'], after: 'pbi-star',
    summary: 'Create, mark and use a proper calendar: months in order, quarters, weekdays and fiscal years.',
    lesson: `
### Why a separate date table?
Sales rows only exist on days something was sold. A report needs every day, month and quarter, sorted properly, plus extras like weekday names and fiscal years. Time-intelligence functions (YTD, last year) also need one continuous calendar.

### Create it in DAX
**Modeling → New table**:
\`\`\`
Date =
ADDCOLUMNS (
    CALENDAR ( DATE ( 2024, 1, 1 ), DATE ( 2026, 12, 31 ) ),
    "Year", YEAR ( [Date] ),
    "Month number", MONTH ( [Date] ),
    "Month", FORMAT ( [Date], "MMMM" ),
    "Quarter", "Q" & QUARTER ( [Date] ),
    "Weekday number", WEEKDAY ( [Date], 2 ),
    "Weekday", FORMAT ( [Date], "dddd" )
)
\`\`\`
- \`CALENDAR(start, end)\` gives one row per day, no gaps.
- Cover **whole years** from the first to the last year in your data.
- \`WEEKDAY(date, 2)\` numbers Monday as 1 and Sunday as 7.

### Three steps that make it work
1. **Mark as date table** (Table tools → Mark as date table → choose the *Date* column).
2. **Relate** *Date[Date]* to *fact_sales[order_date]* (one-to-many, single direction).
3. **Sort by column**: select *Month* → Column tools → Sort by column → *Month number* (same for *Weekday*).

From now on, put **Date** columns on axes and slicers, not the fact table's order_date.

### Fiscal years
If the business year starts in April:
\`\`\`
Fiscal year = YEAR ( [Date] ) + IF ( MONTH ( [Date] ) >= 4, 1, 0 )
\`\`\`
April 2025 to March 2026 is then fiscal year 2026 (say which convention you use).

### Turn off Auto date/time
File → Options → Current file → Data load → untick **Auto date/time**. Otherwise Power BI creates hidden date tables for every date column, which bloats the model and confuses measures.`,
    tryIt: {
      id: 'pbi-datetable-try', type: 'order', kind: 'sequence', difficulty: 2, concept: 'date-table',
      prompt: 'Put the steps for adding a working date table in order.',
      options: ['Create the table with CALENDAR covering whole years', 'Mark it as a date table', 'Relate Date[Date] to the fact table\'s date', 'Sort Month by Month number and use Date columns in visuals'],
      answer: [0, 1, 2, 3], hints: ['You cannot mark or relate a table that does not exist yet.'],
      explain: 'Create, mark, relate, then tidy the sorting and use it. Skipping the relationship is the most common reason time filters "do nothing".',
    },
    practice: [
      {
        id: 'pbi-datetable-p1', type: 'numbers', title: 'Build the calendar', difficulty: 2, concept: 'date-table', business: 'Retail', minutes: 20,
        skills_tested: ['date-table', 'dax-basics'],
        context: 'Cedarline\'s weekend trading question: are Saturdays and Sundays as important as the store managers claim?',
        prompt: 'Add the DAX date table from the lesson (2024 to 2026), mark it, relate it to fact_sales[order_date] and add a Revenue measure (`SUM(fact_sales[net_revenue])`). Use the Weekday column in a table visual, filtered to 2025.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-date-build',
        questions: [{ label: 'Rows in your date table' }, { label: 'Revenue on Saturdays in 2025', unit: '$' }, { label: 'Weekend (Saturday + Sunday) share of 2025 revenue', unit: '%', percent: true, tolerance: 0.3 }],
        hints: ['2024 is a leap year.', 'The weekend share is (Saturday + Sunday revenue) ÷ total 2025 revenue.'],
        explain: 'Three whole years give 1,096 days because 2024 has 366. The weekend share is close to 2 days out of 7 (28.6%), so weekends are no busier per day than weekdays here. A useful answer to a manager\'s hunch, and only possible because the date table supplies weekday names.',
      },
      {
        id: 'pbi-datetable-p2', type: 'numbers', title: 'Quarters, months and a fiscal year', difficulty: 2, concept: 'date-table', business: 'Retail', minutes: 20,
        skills_tested: ['date-table'],
        context: 'Finance reports in fiscal years that start on 1 April. The commercial team reports in calendar quarters.',
        prompt: 'Using your date table (add a Fiscal year column as in the lesson), answer:',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-date-periods',
        questions: [{ label: 'Revenue in Q4 2025 (Oct to Dec)', unit: '$' }, { label: 'Month of 2025 with the highest revenue' }, { label: 'Revenue in the fiscal year April 2025 to March 2026', unit: '$' }],
        hints: ['A matrix with Year and Quarter on rows is the quickest way to read Q4.', 'For the month question, sort the table by Revenue, not by month.'],
        explain: 'The same sales can be sliced by calendar quarter or fiscal year just by adding columns to the date table. None of this needs changes to the fact table. Remember that month names only sort correctly after *Sort by column*.',
      },
    ],
    challenge: {
      id: 'pbi-datetable-ch', type: 'numbers', title: 'How busy is the new store per day?', difficulty: 3, concept: 'date-table', business: 'Retail', minutes: 20,
      skills_tested: ['date-table', 'denominator'],
      context: 'The Canyon store (W02) opened on 1 September 2025. A slide says "Canyon averaged only $38 a day in 2025". The store manager is upset.',
      prompt: 'Calculate Canyon\'s 2025 revenue, then its average revenue per day in two ways.',
      files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-date-gaps',
      questions: [{ label: 'Canyon revenue in 2025', unit: '$' }, { label: 'Average per day, dividing by all 365 days of 2025', unit: '$' }, { label: 'Average per day, dividing only by the days it was open (1 Sep to 31 Dec)', unit: '$' }],
      hints: ['COUNTROWS of the date table gives a day count for whatever period is filtered.', 'How many days are there from 1 September to 31 December?'],
      explain: 'Dividing by 365 days includes eight months when the store did not exist, which is why the slide showed about $38 a day. Over the 122 days it was open, Canyon averaged about three times that. The denominator must match the period the thing existed.',
    },
    cards: [
      { id: 'pbi-datetable-c1', front: 'DAX to create a calendar table?', back: 'CALENDAR(DATE(2024,1,1), DATE(2026,12,31)), usually wrapped in ADDCOLUMNS for Year, Month, Quarter...' },
      { id: 'pbi-datetable-c2', kind: 'debug', front: 'Months appear alphabetically (April, August...). Fix?', back: 'Select Month → Column tools → Sort by column → Month number.' },
      { id: 'pbi-datetable-c3', front: 'Why turn off Auto date/time?', back: 'It creates hidden date tables for every date column, bloating the model and confusing measures. Use one marked date table instead.' },
    ],
  },

  // ================================================================ Report pages and KPI cards
  {
    id: 'pbi-reports', skill: 'pbi', level: 'Beginner', title: 'Report pages & KPI cards', minutes: 14,
    prereqs: ['pbi-visuals'], after: 'pbi-visuals',
    summary: 'Design pages people can read in ten seconds: KPI cards, layout, titles, drill-through and consistent slicers.',
    lesson: `
### One page, one purpose
Before placing a visual, write the page's question: *"How did we do last month?"* or *"Which stores are behind target?"*. Anything that does not help answer it goes to another page.

### Layout
- People read **top-left first**: put the headline numbers (KPI cards) there.
- Trend below the cards, breakdowns next, detail tables last.
- Keep slicers in the **same place on every page** and use **View → Sync slicers** so a year chosen on one page applies to the others.

### KPI cards
| Visual | Shows |
|---|---|
| **Card** | one number (Revenue) |
| **Card (new)** | several numbers with reference labels |
| **KPI** | a value, a target and a trend, coloured by whether the target is met |

A number without context is weak. Show it **against something**: last year, target, or the previous month.

### Titles that say something
"Revenue by month" describes the chart. "Revenue up 21% on August last year" tells the reader what to see. You can make titles dynamic with a measure (Format → Title → *fx*).

### Drill-through and tooltips
- **Drill-through**: a detail page that opens from a right-click on a store or product, already filtered to it.
- **Report page tooltip**: a small page shown when hovering over a data point.

### Keep it honest and readable
- Few colours; one highlight colour for what matters.
- Bars start at zero.
- Label units ($, %, thousands).
- Add alt text to visuals (Format → General) for screen readers.`,
    tryIt: {
      id: 'pbi-reports-try', type: 'mc', kind: 'scenario', difficulty: 1, concept: 'report-design',
      prompt: 'Your manager chooses 2025 in a Year slicer on the Overview page, then opens the Stores page and sees 2026 figures. What fixes this?',
      options: ['Delete the slicer on the Stores page', 'View → Sync slicers, so the Year slicer applies to both pages', 'Add a report-level filter for 2025', 'Use a KPI visual instead'],
      answer: 1, hints: ['Slicers normally affect only their own page.'],
      explain: 'Sync slicers links a slicer across pages, so a choice made on one page follows the reader. A fixed report-level filter would lock everyone into 2025.',
    },
    practice: [
      {
        id: 'pbi-reports-p1', type: 'numbers', title: 'KPI cards for last month', difficulty: 2, concept: 'report-design', business: 'Retail', minutes: 25,
        skills_tested: ['report-design', 'dax-basics', 'time-intel'],
        context: 'Cedarline\'s director opens the report on 1 September 2026 and wants four numbers at the top of the page for August 2026: revenue, orders, average order value, and growth versus August last year.',
        prompt: 'Build the four cards (Revenue, Orders = DISTINCTCOUNT(order_id), AOV = DIVIDE(Revenue, Orders), and growth versus August 2025) with the page filtered to August 2026.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-rep-kpis',
        questions: [{ label: 'Revenue, August 2026', unit: '$' }, { label: 'Orders, August 2026' }, { label: 'Average order value, August 2026', unit: '$' }, { label: 'Growth vs August 2025', unit: '%', percent: true, tolerance: 0.3 }],
        hints: ['Orders are distinct order_id values, not sales lines.', 'Growth = (this August − last August) ÷ last August. SAMEPERIODLASTYEAR needs your date table.'],
        explain: 'August is complete, so comparing it with a complete August last year is fair. The cards read: revenue about $114k, 636 orders at about $179 each, up about 21%. That is a headline a director can use in ten seconds.',
      },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-reports-c1', front: 'Where should KPI cards go on a page?', back: 'Top-left, where people start reading, with context (target, last year) next to each number.' },
      { id: 'pbi-reports-c2', front: 'What is drill-through?', back: 'A detail page opened from a right-click on a data point, already filtered to that item.' },
      { id: 'pbi-reports-c3', kind: 'decision', front: 'Descriptive or informative title?', back: 'Informative: say what the reader should see ("Revenue up 21% on last August"), not just what the chart is.' },
    ],
  },

  // ================================================================ Power Query inside Power BI
  {
    id: 'pbi-pq', skill: 'pbi', level: 'Beginner', title: 'Power Query inside Power BI', minutes: 15,
    prereqs: ['pbi-import'], after: 'pbi-reports',
    summary: 'Shape tables before they reach the model: types, columns, new columns and staging queries.',
    lesson: `
### Where it is
In Power BI Desktop: **Home → Transform data**. The window that opens is the same Power Query editor you may know from Excel. Everything you do there is recorded in **Applied Steps** and replayed on every refresh.

### The panes
| Pane | What it is for |
|---|---|
| **Queries** (left) | one query per table you load |
| **Preview** (middle) | the data after the selected step |
| **Applied Steps** (right) | every transformation, in order; click one to go back in time |
| **Formula bar** | the M code of the selected step (View → Formula Bar if hidden) |

### A good first pass on a fact table
1. **Check types first.** A number column shown with *ABC* is text: sums will fail or be wrong. Dates must be *Date*, not text.
2. **Remove columns** you will never use. Fewer columns = smaller, faster model.
3. **Rename** columns and queries so they read well in the field list (\`fact_sales\` → *Sales*).
4. **Add columns** only when they belong to the row (e.g. *Year* from the order date). Ratios and totals belong in DAX measures, not here.
5. **Close & Apply** loads the result into the model.

### Staging queries
A query you only need as a step for another one (for example a raw file that is merged into a clean table) can have **Enable load** switched off (right-click the query). It still runs, but it does not appear as a table in the model.

### Reference vs Duplicate
- **Reference** starts a new query from the *result* of an existing one. Change the original and the reference follows.
- **Duplicate** copies all the steps. The two queries then live separate lives.

### Power Query or DAX?
| Do it in Power Query | Do it in DAX |
|---|---|
| fix types, trim, split, remove rows | totals, ratios, % of total |
| combine files, merge lookup columns | anything that must react to slicers |
| columns that describe one row | time intelligence, rankings |

A simple rule: **clean and shape in Power Query, calculate in DAX.**`,
    tryIt: {
      id: 'pbi-pq-try', type: 'mc', kind: 'tool-selection', difficulty: 1, concept: 'pbi-query',
      prompt: 'You changed three columns to the right types in the Power Query editor, but the report still shows the old types. What did you forget?',
      options: ['Publish the report to the Service', 'Close & Apply to load the changes', 'Create a measure for each column', 'Refresh the visual on the canvas'],
      answer: 1, hints: ['Changes in the editor are not in the model until they are loaded.'],
      explain: 'Power Query changes only reach the model when you **Close & Apply** (or Apply). Until then the model still holds the previous load.',
    },
    practice: [
      {
        id: 'pbi-pq-p1', type: 'numbers', title: 'Shape fact_sales in Power Query', difficulty: 2, concept: 'pbi-query', business: 'Retail', minutes: 20,
        skills_tested: ['pbi-query', 'pq-types'],
        context: 'Cedarline\'s analyst wants a clean sales table before building anything. You will add a Year column and check how many sales lines each year has, and how often discounts are given.',
        prompt: 'Load **fact_sales.csv** with **Transform data**. Make sure *order_date* is a Date and *discount_pct* is a decimal number. Add a **Year** column (Add Column → Date → Year → Year) and use **Group By** on Year (count rows) to answer the first two questions. For the third, filter *discount_pct* to values greater than 0 (all years).',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-pq-shape',
        questions: [{ label: 'Sales lines in 2025' }, { label: 'Sales lines in 2026' }, { label: 'Discounted sales lines (discount_pct > 0), all years' }],
        hints: [
          'If Year is greyed out, order_date is still text: change its type to Date first.',
          'Group By with "Count Rows" gives one row per year. For the discount question, do it in a separate query (Reference) so the grouped query stays as it is.',
        ],
        explain: 'Group By is Power Query\'s PivotTable: one row per year with a count. The discount count tells you how common promotions are before you measure what they cost. Keeping the grouped result in its own referenced query leaves the clean fact table untouched for the model.',
      },
      {
        id: 'pbi-pq-p2', type: 'numbers', title: 'Profile the product table', difficulty: 2, concept: 'pbi-query', business: 'Retail', minutes: 15,
        skills_tested: ['pbi-query', 'pq-group'],
        context: 'The category manager asks how the range is made up before any sales analysis: how many products are still active, which category has the widest range, and what an active tent costs on average.',
        prompt: 'In Power Query, use **dim_product.csv**. Filter and group to answer the questions.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-pq-products',
        questions: [{ label: 'Active products (is_active = 1)' }, { label: 'Category with the most products (active or not)' }, { label: 'Average list price of ACTIVE tents', unit: '$' }],
        hints: ['is_active is 1 for the normal range and 0 for products being phased out.', 'Group By category with Count Rows; for the last question filter both category and is_active, then use Statistics → Average on list_price.'],
        explain: 'A product table is small, but profiling it first avoids surprises later: three products are being phased out, and averages change depending on whether you include them. Tents have the widest range, which matters when you compare category totals.',
      },
    ],
    challenge: {
      id: 'pbi-pq-ch', type: 'numbers', title: 'Is list price the price we charged?', difficulty: 3, concept: 'pbi-query', business: 'Retail', minutes: 25,
      skills_tested: ['pbi-query', 'pq-merge', 'data-quality'],
      context: 'A manager wants to measure discounting as "list price minus the price charged". Before anyone builds that, check whether dim_product[list_price] is really the price at the time of each sale.',
      prompt: 'In Power Query, **Merge** fact_sales with dim_product on product_id and expand *list_price*. Add a column comparing *unit_price* with *list_price*, then count the sales lines in each case.',
      files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-pq-price',
      questions: [{ label: 'Sales lines sold ABOVE today\'s list price' }, { label: 'Sales lines sold BELOW today\'s list price (before any discount)' }],
      hints: ['Merge Queries → choose product_id in both tables → Left Outer.', 'A conditional column (unit_price > list_price, unit_price < list_price) makes the counting easy with Group By.'],
      explain: 'No line was ever sold above today\'s list price, but thousands were sold below it before any discount was applied. That is because list_price is the **current** price: prices went up over time. "List price minus price charged" would overstate discounting badly. The discount is already in the data (discount_pct), so use that instead. Always ask what a column means at the time of each row.',
    },
    cards: [
      { id: 'pbi-pq-c1', front: 'Where do you open Power Query in Power BI Desktop?', back: 'Home → Transform data. Changes reach the model after Close & Apply.' },
      { id: 'pbi-pq-c2', kind: 'decision', front: 'A query is only used as an input to another query. What should you switch off?', back: 'Enable load (right-click the query), so it does not appear as a table in the model.' },
      { id: 'pbi-pq-c3', front: 'Reference vs Duplicate?', back: 'Reference starts from the result of the original query and follows its changes; Duplicate copies all the steps into an independent query.' },
    ],
  },

  // ================================================================ Filter context and row context
  {
    id: 'pbi-context', skill: 'pbi', level: 'Intermediate', title: 'Filter context & row context', minutes: 18,
    prereqs: ['pbi-dax'], after: 'pbi-dax',
    summary: 'Why the same measure shows different numbers in every cell, why totals are not always sums, and how SUMX and RELATED work row by row.',
    lesson: `
### Filter context: what a cell can see
Every number in a visual is calculated separately, with its own filters:
- the row and column of that cell (e.g. Category = Tents, Year = 2025)
- slicers and filter-pane filters
- filters added inside the measure (CALCULATE, next topic)

The measure is written once. **The visual decides which rows it sees.**

### Filters travel along relationships
A filter on *dim_product[category]* reaches *fact_sales* because of the one-to-many relationship from product to sales. If a visual combines a column from a table that is **not related**, every row shows the same total: the filter has no path to the fact table.

### Totals are recalculated, not added up
The total row runs the measure again with fewer filters. For sums this equals the sum of the rows. For other measures it does not:
- **DISTINCTCOUNT**: a customer who bought online *and* in store counts once in the total, but once in each channel row. The rows add up to more than the total.
- **Averages and ratios**: the total is the overall ratio, not the average of the row ratios.

This is correct behaviour. Explain it rather than "fixing" it.

### Row context: one row at a time
Calculated columns and **X functions** (SUMX, AVERAGEX, COUNTX...) go through a table row by row:
\`\`\`
Gross sales = SUMX ( fact_sales, fact_sales[quantity] * fact_sales[unit_price] )
\`\`\`
For each row, multiply; then sum the results.

### RELATED
Inside a row context you can fetch a value from the **one** side of a relationship:
\`\`\`
Revenue at list price =
SUMX ( fact_sales, fact_sales[quantity] * RELATED ( dim_product[list_price] ) )
\`\`\`
RELATED only works from the many side towards the one side (sales → product).

### Blank rows
A "(Blank)" row in a visual usually means fact rows whose key has no match in the dimension, or a blank key (a walk-in sale with no customer). Find out which before hiding it.`,
    tryIt: {
      id: 'pbi-context-try', type: 'mc', kind: 'interpretation', difficulty: 3, concept: 'filter-context',
      prompt: 'A table shows Customers = DISTINCTCOUNT(fact_sales[customer_id]) by channel: Online 1,366 and In-Store 1,228, but the total says 2,053. What explains it?',
      options: ['The total is wrong and needs a SUMX fix', 'Customers who bought in both channels are counted once in the total but once in each row', 'Blank customers are excluded only from the rows', 'The relationship is set to both directions'],
      answer: 1, hints: ['The total recalculates the distinct count over all rows.'],
      explain: 'The total is a fresh distinct count across both channels, so people who used both channels appear once. The two rows add up to more than the total. That is correct: it tells you roughly 540 customers used both channels.',
    },
    practice: [
      {
        id: 'pbi-context-p1', type: 'numbers', title: 'Why the customer totals do not add up', difficulty: 3, concept: 'filter-context', business: 'Retail', minutes: 20,
        skills_tested: ['filter-context', 'dax-basics'],
        context: 'The marketing lead summed the online and in-store customer counts and got a number bigger than the company\'s customer total. She thinks the report is broken.',
        prompt: 'Create `Customers = DISTINCTCOUNTNOBLANK(fact_sales[customer_id])` (walk-in sales have no customer). Show it by channel for 2025.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-ctx-customers',
        questions: [{ label: 'Online customers, 2025' }, { label: 'In-store customers, 2025' }, { label: 'Customers, total 2025' }],
        hints: ['DISTINCTCOUNT would count the blank customer as one extra "customer"; DISTINCTCOUNTNOBLANK does not.', 'Compare the two rows with the total.'],
        explain: 'Online and in-store customers add up to about 2,600, but the company had about 2,050 different customers in 2025. The difference is people who shopped in both channels. The report is right; the sum is the mistake. That overlap is also a useful business fact on its own.',
      },
      {
        id: 'pbi-context-p2', type: 'numbers', title: 'Revenue at list price with SUMX and RELATED', difficulty: 3, concept: 'row-context', business: 'Retail', minutes: 20,
        skills_tested: ['row-context', 'dax-basics'],
        context: 'Finance wants to know what 2025 sales would have been worth at today\'s list prices, as a rough measure of how much prices have moved.',
        prompt: 'Write `Revenue at list = SUMX(fact_sales, fact_sales[quantity] * RELATED(dim_product[list_price]))` and compare it with Revenue for 2025.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-ctx-rowctx',
        questions: [{ label: 'Revenue at list price, 2025', unit: '$' }, { label: 'Revenue at list price minus actual revenue, 2025', unit: '$' }],
        hints: ['RELATED needs the relationship from fact_sales to dim_product.', 'The gap is the list-price measure minus your Revenue measure.'],
        explain: 'SUMX walks every sales line, looks up that product\'s current list price with RELATED, multiplies by quantity, and adds it up. The gap mixes two things: price rises since the sale, and discounts. Name that honestly when you present it.',
      },
    ],
    challenge: {
      id: 'pbi-context-ch', type: 'numbers', title: 'Average order value by channel', difficulty: 3, concept: 'filter-context', business: 'Retail', minutes: 20,
      skills_tested: ['filter-context', 'dax-basics'],
      context: 'A regional manager claims in-store customers "spend far more per visit". Check it for 2025.',
      prompt: 'Using `AOV = DIVIDE([Revenue], DISTINCTCOUNT(fact_sales[order_id]))`, compare the channels in 2025.',
      files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-ctx-aov',
      questions: [{ label: 'AOV, all 2025', unit: '$' }, { label: 'AOV, Online, 2025', unit: '$' }, { label: 'AOV, In-Store, 2025', unit: '$' }],
      hints: ['Put channel in a table with the AOV measure; the total row is the all-channel figure.'],
      explain: 'In-store orders are only about $5 bigger than online orders, roughly 3%. "Far more" is not supported. Notice that the total AOV sits between the two channel values: it is the overall ratio, not their average.',
    },
    cards: [
      { id: 'pbi-context-c1', front: 'What is filter context?', back: 'The set of filters a measure sees in one cell: rows/columns of the visual, slicers, filters, and anything CALCULATE adds.' },
      { id: 'pbi-context-c2', front: 'What does RELATED do?', back: 'Inside a row context, fetches a value from the one side of a relationship (e.g. product list price for each sales row).' },
      { id: 'pbi-context-c3', kind: 'debug', front: 'The rows of a distinct count add up to more than the total. Bug?', back: 'No. The total recounts across all rows, so items in several rows are counted once.' },
    ],
  },

  // ================================================================ Ranking and Top N
  {
    id: 'pbi-ranking', skill: 'pbi', level: 'Intermediate', title: 'Ranking & Top N', minutes: 16,
    prereqs: ['pbi-calculate'], after: 'pbi-time',
    summary: 'Top products and stores with visual filters and RANKX, ties, and how much of revenue the top few really make.',
    lesson: `
### The quick way: Top N filter
Select a visual → Filters pane → the field (e.g. product name) → **Filter type: Top N** → Show items *Top 5* **by value** *Revenue*. No DAX needed. The filter follows slicers: pick 2025 and you get 2025's top five.

### A rank you can show: RANKX
\`\`\`
Product rank =
RANKX ( ALL ( dim_product[product_name] ), [Revenue] )
\`\`\`
- The first argument is the list to rank **within**. \`ALL(...)\` removes the product filter so each product is compared with all products.
- The second is the measure to rank by (a measure, so it follows the current year filter).
- Ties get the same rank and the next rank is skipped (1, 2, 2, 4). Add \`,, DESC, Dense\` for 1, 2, 2, 3.

### Rank within a group
To rank products **inside** their category, rank over the products that the current category allows:
\`\`\`
Rank in category =
RANKX ( ALLSELECTED ( dim_product[product_name] ), [Revenue] )
\`\`\`
used in a visual filtered or grouped by category.

### Top N as a number
\`\`\`
Top 5 revenue =
CALCULATE ( [Revenue], TOPN ( 5, ALL ( dim_product[product_name] ), [Revenue] ) )
\`\`\`
Divide it by total revenue to say "our top five products make X% of sales".

### Pareto
Sort products by revenue and add up their share until you reach 50% or 80%. If a few products carry most of the revenue, stock-outs on those items matter much more than on the rest.

### Traps
- Ranking a **column** instead of a measure ranks the wrong thing, or nothing.
- Products with no sales get a blank revenue and can take the bottom ranks: filter them out if they should not count.
- A rank without the numbers hides how close the positions are. Show both.`,
    tryIt: {
      id: 'pbi-ranking-try', type: 'mc', kind: 'debugging', difficulty: 3, concept: 'dax-ranking',
      prompt: '`Rank = RANKX(dim_product[product_name], [Revenue])` gives an error. Why?',
      options: ['RANKX can only rank numbers, not product names', 'Its first argument must be a table, e.g. ALL(...)', 'Revenue must be a calculated column, not a measure', 'RANKX needs a marked date table to work'],
      answer: 1, hints: ['RANKX iterates over a table.'],
      explain: 'RANKX needs a table to iterate. ALL(dim_product[product_name]) supplies every product and removes the product filter, so each product is ranked against all of them.',
    },
    practice: [
      {
        id: 'pbi-ranking-p1', type: 'numbers', title: 'The top sellers of 2025', difficulty: 3, concept: 'dax-ranking', business: 'Retail', minutes: 20,
        skills_tested: ['dax-ranking'],
        context: 'The buying team is planning 2026 stock and wants to know which products led 2025, and where a mid-range tent sits.',
        prompt: 'Add the Product rank measure from the lesson and a table of products for 2025, sorted by revenue.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-rank-top',
        questions: [{ label: 'Top product by 2025 revenue', accept: ['Four-Season Summit Tent', 'Four Season Summit Tent', 'Summit Tent'] }, { label: 'Its 2025 revenue', unit: '$' }, { label: 'Rank of "Ridgeline 1P Tent" by 2025 revenue' }],
        hints: ['Filter the page to 2025 before reading the ranks.'],
        explain: 'RANKX gives each product its position among all products for the filtered year. Showing the rank next to the revenue shows how far apart the positions are.',
      },
      {
        id: 'pbi-ranking-p2', type: 'numbers', title: 'How concentrated are sales?', difficulty: 3, concept: 'dax-ranking', business: 'Retail', minutes: 20,
        skills_tested: ['dax-ranking', 'calculate'],
        context: 'Operations asks whether a few products carry the business, because stock-outs on those would hurt most.',
        prompt: 'For 2025: find the best-selling footwear product, then build the Top 5 revenue measure from the lesson and express it as a share of total revenue.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-rank-cat',
        questions: [{ label: 'Top footwear product, 2025' }, { label: 'Top 5 products\' share of 2025 revenue', unit: '%', percent: true, tolerance: 0.3 }],
        hints: ['For the first question, filter category = Footwear and sort by revenue.', 'Top 5 share = [Top 5 revenue] ÷ [Revenue] with no product filter.'],
        explain: 'Five products out of more than 50 make about a fifth of revenue. Sales are fairly spread, but those five still deserve the most careful stock planning.',
      },
    ],
    challenge: {
      id: 'pbi-ranking-ch', type: 'numbers', title: 'Stores and the 50% line', difficulty: 4, concept: 'dax-ranking', business: 'Retail', minutes: 30,
      skills_tested: ['dax-ranking', 'calculate'],
      context: 'The COO wants a ranking of stores for January to August 2026 (in-store sales only) and a simple concentration figure for the product range.',
      prompt: 'Rank the physical stores by in-store revenue for January to August 2026. Then, for 2025, count how many of the top products it takes to reach half of total revenue.',
      files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-rank-stores',
      questions: [{ label: 'Store ranked 1st (Jan-Aug 2026, in-store)' }, { label: 'Store ranked last (Jan-Aug 2026, in-store)' }, { label: 'Number of top products that together reach 50% of 2025 revenue' }],
      hints: ['Exclude the Online shop: filter channel = In-Store.', 'Sort products by 2025 revenue and add a running share (a cumulative measure, or export the table to Excel if you must).'],
      explain: 'Canyon is last, but it only opened in September 2025, so a ranking without that context would be unfair. For concentration, about 16 products make half of 2025 revenue: a middle-heavy range, not a handful of heroes.',
    },
    cards: [
      { id: 'pbi-ranking-c1', front: 'Rank products by revenue in DAX?', back: 'RANKX(ALL(dim_product[product_name]), [Revenue])' },
      { id: 'pbi-ranking-c2', front: 'Top N without DAX?', back: 'Filters pane → the field → Filter type Top N → by a measure.' },
      { id: 'pbi-ranking-c3', kind: 'decision', front: 'A rank alone or rank with values?', back: 'Show both: ranks hide how close or far apart the positions are.' },
    ],
  },

  // ================================================================ Targets, variance and like-for-like
  {
    id: 'pbi-analysis', skill: 'pbi', level: 'Intermediate', title: 'Targets, variance & like-for-like', minutes: 20,
    prereqs: ['pbi-time'], after: 'pbi-ranking',
    summary: 'Bring in targets, measure variance fairly, explain where growth came from, and publish a report people can trust.',
    lesson: `
### Targets have a different grain
Sales are per line and per day. Targets are usually per **store per month**, often in a wide spreadsheet (one column per month).
1. In Power Query, **Unpivot** the month columns → *Store, Month, Target*.
2. Turn Month into a real date (the 1st of the month).
3. Relate the target table to **dim_store** and to the **Date** table (via a month column) rather than to fact_sales.

Both facts (sales and targets) now share the same dimensions, so one slicer filters both.

### Variance measures
\`\`\`
Target       = SUM ( Targets[Target] )
Variance     = [Revenue] - [Target]
Attainment % = DIVIDE ( [Revenue], [Target] )
\`\`\`
Only compare periods that have a target. Months without a target should show blank, not a 100% miss.

### Like-for-like
Growth that includes a store that did not exist last year is not growth of the business you had. Compare **stores open in both periods**:
\`\`\`
Revenue LFL = CALCULATE ( [Revenue], dim_store[opened_on] < DATE ( 2025, 1, 1 ) )
\`\`\`
Report total growth **and** like-for-like growth, and say which is which.

### Where did the growth come from?
Put category (or store, or channel) in a table with *this year*, *last year* and *change*. Sort by change. A **decomposition tree** visual does the same interactively. The categories with the largest change explain most of the total change.

### Publishing
- **Publish** sends the report to the Power BI Service (needs a work account and licence).
- **Scheduled refresh** keeps it current. Files on your own computer need a **gateway**, or move them to SharePoint/OneDrive.
- Share through a **workspace app** rather than copies of the file, so everyone sees one version.
- **Row-level security** can restrict each manager to their own stores.`,
    tryIt: {
      id: 'pbi-analysis-try', type: 'mc', kind: 'scenario', difficulty: 3, concept: 'pbi-analysis',
      prompt: 'In-store revenue grew 32% year on year, but one of the five stores opened only eight months ago. What should the report show?',
      options: ['Only the 32%, because it is the real total', 'Both total and like-for-like growth, labelled', 'Only the growth of the new store itself', 'Nothing until the new store has a full year'],
      answer: 1, hints: ['What part of the growth came from simply having an extra store?'],
      explain: 'The 32% is true but mixes real growth with the new store. Like-for-like growth (stores open in both periods) shows how the existing business did. Show both and label them.',
    },
    practice: [
      {
        id: 'pbi-analysis-p1', type: 'numbers', title: 'Summer actual vs target', difficulty: 3, concept: 'pbi-analysis', business: 'Retail', minutes: 35,
        skills_tested: ['pbi-analysis', 'pbi-query', 'pq-unpivot'],
        context: 'Each physical store had a monthly revenue target for June to August 2026. The regional directors want to know how the summer went.',
        prompt: 'Load **store_targets_summer_2026.csv**, unpivot the month columns, and relate it to your model (by store and month). Compare in-store revenue with target for June to August 2026.',
        files: [PACK, TARGETS], dataset: 'cedarline-pbi', answersKey: 'pbi-an-target',
        questions: [{ label: 'Total target, Jun-Aug 2026 (all five stores)', unit: '$' }, { label: 'Actual in-store revenue for those stores, Jun-Aug 2026', unit: '$' }, { label: 'Attainment %', unit: '%', percent: true, tolerance: 0.3 }, { label: 'Store with the lowest attainment' }],
        hints: ['Unpivot Other Columns after selecting StoreCode gives StoreCode, Month, Target.', 'Actual revenue for a store comes from fact_sales rows with that store_id (online sales have store_id ONLINE).'],
        explain: 'The five stores reached about 97% of their summer target together. The shortfall is concentrated in one place: Canyon, the new store, reached well under 80%, while the others were between about 95% and 106%. A single total would have hidden that.',
      },
      {
        id: 'pbi-analysis-p2', type: 'numbers', title: 'Where did 2026 growth come from?', difficulty: 3, concept: 'pbi-analysis', business: 'Retail', minutes: 25,
        skills_tested: ['pbi-analysis', 'time-intel'],
        context: 'The board pack says "revenue is well up this year". The CEO wants to know which categories drove it.',
        prompt: 'Compare January to August 2026 with January to August 2025 (all channels). Build a table by category with both periods and the change.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-an-growth',
        questions: [{ label: 'Total change in revenue (2026 minus 2025, Jan-Aug)', unit: '$' }, { label: 'Category with the largest increase' }, { label: 'That category\'s increase', unit: '$' }],
        hints: ['Use the same months in both years: January to August.', 'Sort the table by the change column.'],
        explain: 'Every category grew, but Footwear and Tents together account for close to half of the increase. "Well up" becomes a specific story you can check with the category managers.',
      },
    ],
    challenge: {
      id: 'pbi-analysis-ch', type: 'open', title: 'Explain the summer to the regional director', difficulty: 4, concept: 'pbi-analysis', business: 'Retail', minutes: 30,
      skills_tested: ['pbi-analysis', 'communication'],
      context: 'The West regional director (stores Summit and Canyon) has seen that the region missed its summer target and asks you for a short explanation she can forward.',
      prompt: 'Using your actual-vs-target report for June to August 2026, write 5 to 8 sentences: how the region did, where the gap is, what might explain it, and what you would check next.',
      checklist: [
        { point: 'Gives the region\'s result against target with a number', keywords: [['%', 'attainment', 'target'], ['west', 'region']] },
        { point: 'Separates the two stores: Summit close to target, Canyon well below', keywords: [['canyon'], ['summit']] },
        { point: 'Notes that Canyon is a new store (opened September 2025) with no trading history for its targets', keywords: [['new', 'opened', 'history', 'first']] },
        { point: 'Questions whether Canyon\'s targets were realistic rather than only blaming the store', keywords: [['target'], ['realistic', 'too high', 'ambitious', 'set', 'basis']] },
        { point: 'Proposes specific next checks (footfall, average order value, product mix, local competition, staffing)', keywords: [['footfall', 'traffic', 'order value', 'aov', 'mix', 'competition', 'staff']] },
        { point: 'Keeps it short and clear for a director', keywords: [['recommend', 'next', 'suggest', 'propose']] },
      ],
      model: `The West region reached about 86% of its June to August target, against about 97% for the stores as a whole. The gap is almost entirely Canyon: it reached between about 76% and 79% of target in each of the three months (about 77% overall), while Summit came in at about 95%, close to plan.

Canyon opened in September 2025, so its summer targets were set without any summer trading history for that store. Before treating this as a store performance problem, I would check how the targets were set and whether they assumed a mature store.

Next I would compare Canyon's order numbers and average order value with Summit's, look at its product mix, and ask the store about footfall and staffing in the summer months. If the targets turn out to be unrealistic, the 2027 plan should use Canyon's own first-year pattern.`,
      hints: ['Look at each store\'s attainment separately before writing about the region.', 'When did Canyon open, and what could its targets have been based on?'],
      explain: 'A good answer gives the number, finds where the gap is, questions the target as well as the store, and says what to check next.',
    },
    cards: [
      { id: 'pbi-analysis-c1', front: 'How do monthly store targets join a daily sales model?', back: 'Unpivot to Store/Month/Target, relate to the store dimension and to the date table (by month), not to the fact table.' },
      { id: 'pbi-analysis-c2', front: 'What is like-for-like growth?', back: 'Growth measured only on units (stores, products) that existed in both periods.' },
      { id: 'pbi-analysis-c3', kind: 'decision', front: 'Local CSV in a published report: how does it refresh?', back: 'Through an on-premises data gateway, or move the file to SharePoint/OneDrive.' },
    ],
  },
];
