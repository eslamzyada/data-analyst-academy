// POWER BI from zero. The app doesn't imitate Power BI Desktop; it teaches the ideas, checks
// your understanding, and checks the numbers your real Power BI report should show.

const PACK = { label: 'cedarline_powerbi_pack.zip (fact_sales + 3 dimensions)', path: 'cedarline_powerbi_pack.zip' };

export const PBI = [
  {
    id: 'pbi-intro', skill: 'pbi', level: 'Beginner', title: 'What Power BI is', minutes: 8, prereqs: [],
    summary: 'The big picture: get data → shape → model → visualise → share.',
    lesson: `
### What is it?
Power BI is Microsoft's tool for building **interactive reports** from one or many data sources. Think of it as Excel's Power Query + PivotTables + charts, but built to handle millions of rows, and meant to be shared.

### The pieces
| Piece | What it is |
|---|---|
| **Power BI Desktop** | the free Windows app where you build reports |
| **Power BI Service** | the website where reports are published and shared (needs a work account) |
| **Power Query** | the same data-cleaning engine you know from Excel |
| **Data model** | your tables and the relationships between them |
| **DAX** | the formula language for measures (like "Total Sales") |

### The workflow
1. **Get Data** (Excel, CSV, SQL databases, folders…)
2. **Transform** in Power Query
3. **Model**: connect tables with relationships
4. **Measures** in DAX
5. **Visualise** on report pages: charts, cards, slicers
6. **Publish** to the Service and share

### Desktop's three views (left edge)
- **Report**: the canvas where you build visuals
- **Table** (Data): look at the loaded rows
- **Model**: the tables as boxes with relationship lines

### Get it
Power BI Desktop is free from the Microsoft Store. You don't need an account to build and practise locally.`,
    tryIt: {
      id: 'pbi-intro-try', type: 'order', difficulty: 1, concept: 'pbi-basics',
      prompt: 'Put the Power BI workflow in order.',
      options: ['Build visuals on report pages', 'Get Data', 'Create relationships in the model', 'Transform in Power Query', 'Publish and share'],
      answer: [1, 3, 2, 0, 4], hints: ['Data must be clean before it is modelled, and modelled before it is visualised.'],
      explain: 'Get → Transform → Model → Visualise → Share. When you get stuck in a report, the fix is usually one step earlier.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-intro-q1', type: 'mc', difficulty: 1, concept: 'pbi-basics', prompt: 'Where do you clean and reshape data in Power BI?', options: ['The Report view', 'Power Query (Transform Data)', 'The Model view', 'DAX'], answer: 1, explain: 'Transform Data opens Power Query, the same engine as in Excel.' },
      { id: 'pbi-intro-q2', type: 'mc', difficulty: 1, concept: 'pbi-basics', prompt: 'Which view shows tables as boxes connected by lines?', options: ['Report', 'Table', 'Model', 'Service'], answer: 2, explain: 'Model view draws each table as a box and each relationship as a line between them. Report view is where you build visuals, and Table view shows the rows themselves.' },
      { id: 'pbi-intro-q3', type: 'tf', difficulty: 1, concept: 'pbi-basics', prompt: 'True or false: you need a paid account to build reports in Power BI Desktop.', answer: false, explain: 'Desktop is free. Sharing through the Service needs a work licence.' },
      { id: 'pbi-intro-q4', type: 'mc', difficulty: 2, concept: 'tool-choice', prompt: 'When is Power BI a better choice than an Excel workbook?', options: ['A one-off calculation on fifty rows of data', 'An interactive, shared report on large data that refreshes automatically', 'Writing a letter or a short memo', 'A quick what-if on a single number'], answer: 1, explain: 'Power BI shines for big data, many users, interactivity and scheduled refresh.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-intro-c1', front: 'The 5 steps of building a Power BI report?', back: 'Get data → Transform (Power Query) → Model (relationships) → Visualise (+ DAX measures) → Publish/share.' },
    ],
  },

  {
    id: 'pbi-import', skill: 'pbi', level: 'Beginner', title: 'Importing & shaping data', minutes: 10, prereqs: ['pbi-intro'],
    summary: 'Load CSVs into Power BI and clean them before they reach the model.',
    lesson: `
### Load or Transform?
Home → **Get Data** → Text/CSV → pick the file. You get a preview with two buttons:
- **Load**: straight into the model (only if the data is already clean)
- **Transform Data**: open Power Query first (almost always the right choice)

### What to check in Power Query
- Types: dates as Date, money as Decimal (Fixed Decimal for currency), IDs as whole numbers or text consistently
- Headers promoted, junk rows removed
- Only the columns you need
- Query names: rename "fact_sales (2)" to **Sales**. The names appear everywhere in your report.

### Several files
Get each CSV (fact_sales, dim_product, dim_store, dim_customer). They become separate tables. You'll connect them in the Model view next.

### Refresh
Home → **Refresh** re-runs every query. With files in a fixed folder, next month's report is one click.`,
    tryIt: {
      id: 'pbi-import-try', type: 'mc', difficulty: 1, concept: 'pq-types', crossConcept: true,
      prompt: 'After loading, your order_date column shows the ABC icon and the date slicer doesn\'t work. What is the fix?',
      options: ['Delete the column and reload it', 'Change its type to Date in Power Query (Transform Data)', 'Use a different chart type instead', 'Sort the column into date order'], answer: 1,
      hints: ['ABC means text.'], explain: 'Types are set in Power Query. A date stored as text can\'t drive date slicers or time intelligence.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-import-q1', type: 'mc', difficulty: 1, concept: 'pbi-basics', prompt: 'A file needs cleaning before you use it. Which button?', options: ['Load', 'Transform Data', 'Publish', 'New Measure'], answer: 1, explain: 'Transform Data opens the Power Query editor before anything loads, so the cleaning steps are saved with the file and run again on every refresh. Load brings the file in exactly as it is.' },
      { id: 'pbi-import-q2', type: 'tf', difficulty: 1, concept: 'pbi-basics', prompt: 'True or false: renaming queries (fact_sales → Sales) is only cosmetic and not worth it.', answer: false, explain: 'Table names appear in every field list, measure and visual. Clear names make reports much easier to build and maintain.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-import-c1', front: 'Load vs Transform Data?', back: 'Load sends data straight to the model; Transform Data opens Power Query to clean it first (usually the right choice).' },
    ],
  },

  {
    id: 'pbi-model', skill: 'pbi', level: 'Beginner', title: 'Tables & relationships', minutes: 14, prereqs: ['pbi-import'],
    summary: 'Connect tables so a filter on one flows to the others.',
    lesson: `
### Why relationships?
Sales rows only store product_id. To show "revenue by category", Power BI must know that Sales.product_id matches Product.product_id. That link is a **relationship**.

### Creating one
Model view → drag **dim_product[product_id]** onto **fact_sales[product_id]**. (Power BI often auto-detects them; always check.)

### Cardinality
| Type | Meaning | Example |
|---|---|---|
| **One-to-many (1:*)** | one product, many sales rows | Product → Sales (the normal case) |
| One-to-one (1:1) | rare | |
| Many-to-many (*:*) | usually a design problem | |

The "one" side needs **unique keys**. If dim_product has a duplicated product_id, the relationship becomes many-to-many and totals go wrong.

### Filter direction
The arrow shows how filters flow: from the **one** side (Product) to the **many** side (Sales). Click the category "Tents" and the Sales rows filter. Keep it **Single** unless you have a specific reason; "Both" can create ambiguous, slow models.

### Common problems
- A visual shows the **same number on every row** → there is no relationship (or it's inactive) between the tables used.
- Blank category in a visual → sales rows whose product_id isn't in the product table.`,
    tryIt: {
      id: 'pbi-model-try', type: 'mc', difficulty: 2, concept: 'pbi-model',
      prompt: 'A table visual shows every category with the SAME revenue (the grand total). What is the most likely cause?',
      options: ['The measure itself has been written wrongly', 'There is no active relationship between the product table and the sales table', 'There are too many rows to filter', 'The report theme is overriding it'], answer: 1,
      hints: ['The category filter isn\'t reaching the sales rows.'],
      explain: 'Without a relationship, filtering by category can\'t filter Sales, so every row shows the total. Create Product[product_id] → Sales[product_id].',
    },
    practice: [],
    quiz: [
      { id: 'pbi-model-q1', type: 'mc', difficulty: 2, concept: 'pbi-model', prompt: 'Product (one row per product) and Sales (many rows per product) should be related as…', options: ['One-to-many from Product to Sales', 'Many-to-many', 'One-to-one', 'No relationship needed'], answer: 0, explain: 'The dimension (one) filters the fact table (many).' },
      { id: 'pbi-model-q2', type: 'mc', difficulty: 3, concept: 'pbi-model', prompt: 'Power BI says the relationship must be many-to-many, although product_id should be unique in the product table. What should you check?', options: ['Whether the product table has duplicate product_ids (or blanks)', 'The chart type the visual is using', 'The page size set for the report', 'Nothing: accept the many-to-many'], answer: 0, explain: 'The one side must have unique keys. Find and fix the duplicates in Power Query.' },
      { id: 'pbi-model-q3', type: 'tf', difficulty: 2, concept: 'pbi-model', prompt: 'True or false: setting every relationship\'s filter direction to "Both" is best practice.', answer: false, explain: 'Keep Single by default. Both can cause ambiguity and slow models.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-model-c1', front: 'Which way do filters flow in a normal relationship?', back: 'From the one side (dimension) to the many side (fact).' },
      { id: 'pbi-model-c2', kind: 'debug', front: 'Every row of a visual shows the same total. Why?', back: 'The tables in the visual aren\'t related (or the relationship is inactive), so the filter can\'t reach the fact table.' },
    ],
  },

  {
    id: 'pbi-star', skill: 'pbi', level: 'Beginner', title: 'Star schema & date tables', minutes: 14, prereqs: ['pbi-model'],
    summary: 'The one model shape that keeps Power BI simple, fast and correct.',
    lesson: `
### Facts and dimensions
- **Fact table**: events you measure, one row per sale / purchase / visit. Numbers (quantity, revenue) plus keys. Usually long.
- **Dimension tables**: the things you slice by: Product, Store, Customer, **Date**. Descriptive columns. Usually short.

### The star
\`\`\`
            dim_date
               |
dim_product — fact_sales — dim_store
               |
          dim_customer
\`\`\`
Each dimension relates **one-to-many** to the fact table. Slicers and axes come from dimensions; measures sum the fact table.

### Why not one big flat table?
Flat tables repeat descriptions millions of times, make DAX harder, and break when you add a second fact table (like targets). Stars stay clean.

### The date table
Time intelligence (YTD, last year) needs a proper **date table**: one row per day, no gaps, covering all your dates, with Year, Month, Quarter columns.
- Create it in Power Query, or with DAX: \`Date = CALENDAR(DATE(2024,1,1), DATE(2026,12,31))\`
- Relate Date[Date] → fact_sales[order_date]
- Table tools → **Mark as date table**
- Sort the Month name column by the month number (Column tools → Sort by column), so months aren't sorted alphabetically.`,
    tryIt: {
      id: 'pbi-star-try', type: 'mc', difficulty: 2, concept: 'star-schema',
      prompt: 'Which of these is a FACT table?',
      options: ['A list of stores with region and opening date', 'One row per order line with quantity and revenue', 'A calendar with one row per day', 'A list of product categories'], answer: 1,
      hints: ['Facts are events you measure.'], explain: 'Order lines are events with numbers → fact. Stores, calendar and categories describe things → dimensions.',
    },
    practice: [
      { id: 'pbi-star-p1', type: 'numbers', title: 'Build the Cedarline model', difficulty: 3, concept: 'star-schema', business: 'Retail', minutes: 45,
        context: 'Cedarline wants its first Power BI report. You get a star-schema extract: fact_sales and three dimensions.',
        prompt: 'In Power BI Desktop: load the 4 CSVs, add a date table, create the relationships (star), write the measures below, and read the answers from card visuals.',
        files: [PACK], dataset: 'cedarline-pbi', answersKey: 'pbi-cedarline-pack',
        tasks: ['Load fact_sales, dim_product, dim_store, dim_customer (Transform: check the types; order_date = Date).', 'Create a Date table (CALENDAR or Power Query) → Mark as date table → relate it to fact_sales[order_date].', 'Relate dim_product, dim_store, dim_customer to fact_sales (one-to-many).', 'Measures: Revenue = SUM(fact_sales[net_revenue]); Orders = DISTINCTCOUNT(fact_sales[order_id]); Customers = DISTINCTCOUNT(fact_sales[customer_id]); AOV = DIVIDE([Revenue],[Orders]).'],
        questions: [{ label: 'Revenue for 2025 (filter Year = 2025)' }, { label: 'Distinct customers in 2025', tolerance: 1.1 }, { label: 'Average order value in 2025' }, { label: 'June 2026 revenue growth vs June 2025 (%)', percent: true, tolerance: 0.3 }, { label: 'Category with the highest 2025 revenue' }],
        hints: ['fact_sales contains completed orders only. Walk-in sales have no customer_id: DISTINCTCOUNT counts a blank as one value, so check whether your card counts it.', 'YoY: put Date[Year] and Date[Month] in a matrix, or write Revenue LY = CALCULATE([Revenue], SAMEPERIODLASTYEAR(Date[Date])).'],
        explain: 'If your numbers match, your model is right: relationships filter correctly and your measures aggregate at the right level. That\'s the point of building a star.' },
    ],
    quiz: [
      { id: 'pbi-star-q1', type: 'mc', difficulty: 2, concept: 'star-schema', prompt: 'In a star schema, where do slicers usually come from?', options: ['The fact table', 'Dimension tables', 'Measures', 'The report theme'], answer: 1, explain: 'Slice by dimension attributes; sum the fact table.' },
      { id: 'pbi-star-q2', type: 'mc', difficulty: 2, concept: 'date-table', prompt: 'Month names in your chart appear as April, August, December… How do you fix the order?', options: ['Rename the months to sort properly', 'Sort the Month name column by the Month number column', 'Use a pie chart instead of a bar', 'Delete April from the data'], answer: 1, explain: 'Column tools → Sort by column → MonthNumber.' },
      { id: 'pbi-star-q3', type: 'tf', difficulty: 2, concept: 'date-table', prompt: 'True or false: a date table may skip days that had no sales.', answer: false, explain: 'It must be continuous (every day), or time intelligence gives wrong results.' },
      { id: 'pbi-star-q4', type: 'mc', difficulty: 3, concept: 'star-schema', prompt: 'Why is one huge flat table usually worse than a star schema?', options: ['Power BI cannot load one big flat table at all', 'It repeats descriptive data, complicates DAX, and breaks with a second fact table', 'Flat tables cannot hold date columns', 'Stars always end up with more rows'], answer: 1, explain: 'Stars keep one version of each dimension and let several facts share them.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-star-c1', front: 'Fact vs dimension table?', back: 'Fact = events with numbers (sales lines). Dimension = descriptions to slice by (product, store, date).' },
      { id: 'pbi-star-c2', front: 'Three musts for a date table?', back: 'Every day with no gaps, covers all your dates, and is marked as a date table (related to the fact dates).' },
    ],
  },

  {
    id: 'pbi-visuals', skill: 'pbi', level: 'Beginner', title: 'Visuals, filters, slicers & pages', minutes: 12, prereqs: ['pbi-star'],
    summary: 'Build a clean, interactive report page.',
    lesson: `
### Adding a visual
Click a visual type in the Visualizations pane, then drag fields into its wells (Axis/X, Values/Y, Legend). Or tick fields and let Power BI choose.

### Everyday visuals
| Question | Visual |
|---|---|
| One key number | **Card** (or KPI) |
| Trend over time | **Line chart** |
| Compare categories | **Bar/column chart** (sorted) |
| Detail | **Table / Matrix** |
| Filter buttons | **Slicer** |

### Three levels of filters (Filters pane)
- **Visual**: only this chart
- **Page**: every visual on this page
- **Report**: every page

### Slicers and interactions
Slicers filter the page. Clicking a bar also **cross-filters** the other visuals. Adjust it in Format → **Edit interactions** when a visual shouldn't react.

### Pages
Use several pages: an Overview (KPIs + trend), then detail pages (by region, by product). Keep a consistent layout, the same slicers in the same place, and titles that say what to look at.`,
    tryIt: {
      id: 'pbi-visuals-try', type: 'mc', difficulty: 1, concept: 'pbi-visuals',
      prompt: 'You want a Year filter that applies to every visual on the Overview page, but not to other pages. Where?',
      options: ['Visual-level filter on one chart', 'Page-level filter (or a slicer on that page)', 'Report-level filter', 'In Power Query'], answer: 1,
      hints: ['There are three filter levels.'], explain: 'Page-level filters and slicers affect just that page.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-visuals-q1', type: 'mc', difficulty: 1, concept: 'chart-choice', prompt: 'Best visual for monthly revenue over two years?', options: ['Pie', 'Line', 'Table', 'Map'], answer: 1, explain: 'A line chart is for a value moving through time: twenty-four months read as one continuous trend. A pie compares parts of a single total, and a table hides the shape you are looking for.' },
      { id: 'pbi-visuals-q2', type: 'mc', difficulty: 2, concept: 'pbi-visuals', prompt: 'Clicking a bar filters another chart, but you don\'t want it to. What do you change?', options: ['Delete the relationship between them', 'Format → Edit interactions → set that chart to "None"', 'Use a slicer on the page instead', 'Change the theme of the report'], answer: 1, explain: 'Edit interactions controls cross-filtering between visuals.' },
      { id: 'pbi-visuals-q3', type: 'tf', difficulty: 1, concept: 'pbi-visuals', prompt: 'True or false: a report-level filter affects every page.', answer: true, explain: 'Filters come at three levels: visual, page and report. A report-level filter applies to every page, which is the right home for a rule such as "exclude cancelled orders".' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-visuals-c1', front: 'The 3 filter levels in Power BI?', back: 'Visual, Page, Report.' },
    ],
  },

  {
    id: 'pbi-dax', skill: 'pbi', level: 'Beginner', title: 'First DAX measures', minutes: 15, prereqs: ['pbi-star'],
    summary: 'SUM, COUNTROWS, DISTINCTCOUNT and DIVIDE, and why measures beat calculated columns.',
    lesson: `
### Measures vs calculated columns
| | Measure | Calculated column |
|---|---|---|
| Calculated | when a visual asks, **in the current filter** | once per row, at refresh |
| Stored | nothing stored | stored in the table (uses memory) |
| Use for | totals, ratios, KPIs | a row-level attribute you want to slice by (e.g. Price band) |

**Default to measures.**

### Your first measures
New measure (Home → New measure):
\`\`\`
Revenue   = SUM ( fact_sales[net_revenue] )
Lines     = COUNTROWS ( fact_sales )
Orders    = DISTINCTCOUNT ( fact_sales[order_id] )
Customers = DISTINCTCOUNT ( fact_sales[customer_id] )
AOV       = DIVIDE ( [Revenue], [Orders] )
Margin %  = DIVIDE ( [Revenue] - SUM ( fact_sales[cost] ), [Revenue] )
\`\`\`
- Reference measures in [brackets] and columns as Table[column].
- **DIVIDE** handles division by zero (it returns blank instead of an error).
- Build measures on measures: AOV reuses Revenue and Orders.

### Filter context (the key idea)
The same measure shows different numbers in each cell of a visual because each cell **filters** the data (this year, this category, this store). You write the measure once; the visual supplies the filters.

### Implicit measures
Dragging a numeric column into a visual creates an automatic "Sum of …". It's fine for exploring, but write explicit measures for real reports (reusable, named, formatted).`,
    tryIt: {
      id: 'pbi-dax-try', type: 'mc', difficulty: 2, concept: 'measure-vs-column',
      prompt: 'You need "Average order value" that changes when users pick a region or month. Measure or calculated column?',
      options: ['A calculated column on the table', 'Measure: it is computed in the current filter context', 'Either one works the same way', 'Neither: do the sums in Excel'], answer: 1,
      hints: ['Which one reacts to slicers?'], explain: 'Ratios and KPIs must be measures: DIVIDE([Revenue],[Orders]) recalculates for every filter combination.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-dax-q1', type: 'mc', difficulty: 2, concept: 'dax-basics', prompt: 'Which measure counts different customers?', options: ['COUNT(fact_sales[customer_id])', 'DISTINCTCOUNT(fact_sales[customer_id])', 'COUNTROWS(fact_sales)', 'SUM(fact_sales[customer_id])'], answer: 1, explain: 'DISTINCTCOUNT counts unique values. (Note: a blank counts as one value.)' },
      { id: 'pbi-dax-q2', type: 'mc', difficulty: 2, concept: 'dax-basics', prompt: 'Why use DIVIDE([A],[B]) instead of [A]/[B]?', options: ['It is faster to type than the slash sign', 'It returns blank (or an alternate value) instead of an error when B is zero', 'It rounds the result automatically', 'It only works inside a card visual'], answer: 1, explain: 'DIVIDE(numerator, denominator, [alternate]) is division that is safe with zero.' },
      { id: 'pbi-dax-q3', type: 'fill', difficulty: 1, concept: 'dax-basics', prompt: 'Complete the measure that counts rows of the Sales table: `Lines = ________ ( Sales )`', answer: ['COUNTROWS', 'countrows'], explain: 'COUNTROWS(Sales) counts the rows of the table under the filters that apply right now. COUNT needs a column and skips blanks, so it quietly answers a different question.' },
      { id: 'pbi-dax-q4', type: 'mc', difficulty: 3, concept: 'measure-vs-column', prompt: 'Which is a good use of a CALCULATED COLUMN?', options: ['Total revenue across the whole data model', 'Year-over-year growth as a percentage', 'A "Price band" label per product that you want to put on a chart axis', 'Average order value, sliced by region'], answer: 2, explain: 'Row-level attributes you slice by can be columns. Aggregations should be measures.' },
      { id: 'pbi-dax-q5', type: 'tf', difficulty: 2, concept: 'dax-basics', prompt: 'True or false: a measure can reference other measures, e.g. DIVIDE([Revenue],[Orders]).', answer: true, explain: 'Building measures on measures keeps definitions in one place.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-dax-c1', front: 'Measure vs calculated column?', back: 'A measure is calculated when a visual asks, in the current filter context, and stores nothing. A calculated column is computed per row at refresh and stored.' },
      { id: 'pbi-dax-c2', front: 'Safe division in DAX?', back: 'DIVIDE(numerator, denominator [, alternate result])' },
    ],
  },

  {
    id: 'pbi-calculate', skill: 'pbi', level: 'Intermediate', title: 'CALCULATE & filter context', minutes: 15, prereqs: ['pbi-dax'],
    summary: 'The most important DAX function: change the filters a measure sees.',
    lesson: `
### CALCULATE(expression, filters…)
CALCULATE evaluates a measure with **modified filters**:
\`\`\`
Online Revenue = CALCULATE ( [Revenue], fact_sales[channel] = "Online" )
West Revenue   = CALCULATE ( [Revenue], dim_store[region] = "West" )
\`\`\`
In a visual by month, *Online Revenue* shows each month's online revenue, whatever other filters are active.

### Removing filters: ALL
Share of total:
\`\`\`
Revenue (all categories) = CALCULATE ( [Revenue], ALL ( dim_product[category] ) )
Category share %         = DIVIDE ( [Revenue], [Revenue (all categories)] )
\`\`\`
ALL ignores the category filter, so the denominator is the total.

### Row context vs filter context
- **Filter context**: which rows are visible (from slicers, axes, CALCULATE).
- **Row context**: "the current row", inside a calculated column or an iterator like SUMX.
\`Revenue = SUMX ( fact_sales, fact_sales[quantity] * fact_sales[unit_price] * (1 - fact_sales[discount_pct]) )\`

### Context transition (advanced)
When a measure is used inside a row context (e.g. in a calculated column), CALCULATE turns the current row into a filter. You'll meet it later. For now: measures used in calculated columns can behave surprisingly.`,
    tryIt: {
      id: 'pbi-calculate-try', type: 'mc', difficulty: 3, concept: 'calculate',
      prompt: 'Which measure shows each category\'s share of total revenue?',
      options: ['DIVIDE([Revenue], SUM(fact_sales[net_revenue]))', 'DIVIDE([Revenue], CALCULATE([Revenue], ALL(dim_product[category])))', 'CALCULATE([Revenue], dim_product[category])', '[Revenue] / 100'], answer: 1,
      hints: ['The denominator must ignore the category filter.'], explain: 'ALL(dim_product[category]) removes the category filter for the denominator, so each category is divided by the overall total.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-calculate-q1', type: 'mc', difficulty: 3, concept: 'calculate', prompt: 'What does CALCULATE([Revenue], dim_store[region] = "West") return in a chart by month?', options: ['Total revenue for all regions', 'West revenue for each month', 'An error', 'Only the West total, the same in every month'], answer: 1, explain: 'The month filter from the axis stays; the region filter is set to West.' },
      { id: 'pbi-calculate-q2', type: 'mc', difficulty: 3, concept: 'calculate', prompt: 'Which function removes a filter so a measure sees all rows of a column?', options: ['FILTER', 'ALL', 'VALUES', 'RELATED'], answer: 1, explain: 'ALL(table or column) removes filters. It is the basis of "% of total".' },
      { id: 'pbi-calculate-q3', type: 'mc', difficulty: 3, concept: 'calculate', prompt: 'SUMX(fact_sales, fact_sales[quantity] * fact_sales[unit_price]) works because…', options: ['SUMX iterates row by row (row context) and then sums', 'It follows a relationship to Sales', 'It is really a calculated column', 'It ignores the filters on the visual'], answer: 0, explain: 'X-functions iterate a table in row context, evaluate the expression per row, then aggregate.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-calculate-c1', front: 'What does CALCULATE do?', back: 'Evaluates an expression under modified filters: CALCULATE([Measure], filter1, filter2, …).' },
      { id: 'pbi-calculate-c2', front: 'Category % of total in DAX?', back: 'DIVIDE([Revenue], CALCULATE([Revenue], ALL(dim_product[category])))' },
    ],
  },

  {
    id: 'pbi-time', skill: 'pbi', level: 'Intermediate', title: 'Time intelligence: YTD, MTD, YoY', minutes: 14, prereqs: ['pbi-calculate'],
    summary: 'Year-to-date, last year, and growth %, the measures every manager asks for.',
    lesson: `
### Requirements
A marked **date table** related to your fact table. Time-intelligence functions use it.

### The core measures
\`\`\`
Revenue YTD = TOTALYTD ( [Revenue], 'Date'[Date] )
Revenue MTD = TOTALMTD ( [Revenue], 'Date'[Date] )
Revenue LY  = CALCULATE ( [Revenue], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
YoY %       = DIVIDE ( [Revenue] - [Revenue LY], [Revenue LY] )
\`\`\`

### Reading them
In a matrix by Year/Month:
- **YTD** accumulates from January to the current month, then resets each year
- **LY** shows the same month a year earlier
- **YoY %** compares like with like (seasonality removed)

### Traps
- The current month is incomplete: comparing a partial August with a full August last year understates growth. Use a "last complete month" filter, or MTD vs the same days last year.
- If the date table doesn't cover last year, LY is blank.
- Use the date table's columns on axes, not the fact table's order_date.`,
    tryIt: {
      id: 'pbi-time-try', type: 'mc', difficulty: 2, concept: 'time-intel',
      prompt: 'Which measure returns revenue for the same period last year?',
      options: ['CALCULATE([Revenue], SAMEPERIODLASTYEAR(\'Date\'[Date]))', 'TOTALYTD([Revenue], \'Date\'[Date])', '[Revenue] - 365', 'SUM(Date[Year]) - 1'], answer: 0,
      hints: ['You need to shift the date filter by one year.'], explain: 'SAMEPERIODLASTYEAR shifts the current date filter back a year; CALCULATE applies it.',
    },
    practice: [],
    quiz: [
      { id: 'pbi-time-q1', type: 'mc', difficulty: 2, concept: 'time-intel', prompt: 'TOTALYTD([Revenue], \'Date\'[Date]) in March 2026 shows…', options: ['March 2026 only', 'January–March 2026', 'The whole of 2026', 'March 2025'], answer: 1, explain: 'Year-to-date accumulates from the start of the year.' },
      { id: 'pbi-time-q2', type: 'mc', difficulty: 3, concept: 'time-intel', prompt: 'August 2026 shows −40% YoY, but it\'s 14 August today. Most likely?', options: ['A real collapse in the month\'s sales', 'You are comparing half a month with a full month last year', 'SAMEPERIODLASTYEAR is behaving badly', 'A problem with the date relationship'], answer: 1, explain: 'Partial current periods need like-for-like comparisons (MTD vs the same days, or a last-complete-month filter).' },
      { id: 'pbi-time-q3', type: 'tf', difficulty: 2, concept: 'date-table', prompt: 'True or false: time-intelligence functions work reliably without a date table if the fact table has dates.', answer: false, explain: 'Use a continuous, marked date table related to the fact table.' },
    ],
    challenge: null,
    cards: [
      { id: 'pbi-time-c1', front: 'Revenue last year in DAX?', back: "CALCULATE([Revenue], SAMEPERIODLASTYEAR('Date'[Date]))" },
      { id: 'pbi-time-c2', front: 'YoY % in DAX?', back: 'DIVIDE([Revenue] - [Revenue LY], [Revenue LY])' },
    ],
  },
];
