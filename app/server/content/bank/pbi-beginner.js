// Extra Power BI Beginner questions: the model, visuals and first DAX.
export const PBI_BEGINNER = [
  // ---------------------------------------------------------------- pbi-intro
  {
    id: 'b-pbi-intro-01', topic: 'pbi-intro', type: 'mc', difficulty: 2, concept: 'pbi-basics',
    prompt: 'What does Power BI add that a well-built Excel dashboard does not?',
    options: ['A more powerful formula language than Excel', 'A shared, refreshing model many people view consistently, with cross-filtering', 'More rows per sheet, and nothing else', 'Nothing a good workbook cannot do'],
    answer: 1,
    explain: 'The important word is *shared*. One model, one refresh, one version of the numbers, instead of a workbook emailed to twelve people who each edit their copy.',
  },
  {
    id: 'b-pbi-intro-02', topic: 'pbi-intro', type: 'mc', difficulty: 2, concept: 'pbi-basics',
    prompt: 'Which three parts make up a typical Power BI file?',
    options: ['Worksheets, charts and a set of recorded macros', 'A data model (tables and relationships), calculations (DAX), and report pages (visuals)', 'Saved queries, pivot tables and slicers', 'Tables, data-entry forms and reports'],
    answer: 1,
    explain: 'Keeping those three layers distinct in your head is what stops a report becoming unmaintainable. Most "Power BI is hard" problems are really model problems.',
  },
  {
    id: 'b-pbi-intro-03', topic: 'pbi-intro', type: 'tf', difficulty: 2, concept: 'pbi-basics',
    prompt: 'True or false: Power BI Desktop uses the same Power Query engine as Excel for loading and shaping data.',
    answer: true,
    explain: 'The skills transfer directly. Anything you can clean in Excel\'s Power Query, you clean the same way in Power BI.',
  },
  {
    id: 'b-pbi-intro-04', topic: 'pbi-intro', type: 'mc', difficulty: 3, concept: 'pbi-basics',
    prompt: 'What is the difference between Import and DirectQuery?',
    options: ['Import only works with Excel source files', 'Import copies the data into the model; DirectQuery queries the source live', 'DirectQuery is always the faster option', 'There is no real difference between them'],
    answer: 1,
    explain: 'Import is the default and usually the right choice: much faster visuals, at the cost of data being as old as the last refresh.',
  },

  // ---------------------------------------------------------------- pbi-import
  {
    id: 'b-pbi-imp-01', topic: 'pbi-import', type: 'mc', difficulty: 2, concept: 'pbi-basics',
    prompt: 'Why should you remove columns you do not need during import?',
    options: ['It makes the field list look tidier', 'The model is smaller and faster, and the field list stays usable', 'It is required before you can publish', 'It avoids errors during the refresh'],
    answer: 1,
    explain: 'A model with 300 fields is unusable even when it is fast. Both the machine and the human benefit from importing only what the report needs.',
  },
  {
    id: 'b-pbi-imp-02', topic: 'pbi-import', type: 'mc', difficulty: 2, concept: 'pbi-basics',
    prompt: 'Where should data cleaning happen in a Power BI project?',
    options: ['In DAX measures, at the point where it is used', 'As far upstream as possible: in the source system, or failing that in Power Query', 'In the visuals, with visual-level filters', 'Wherever is quickest at the time'],
    answer: 1,
    explain: 'Cleaning in DAX means every measure carries the workaround, and the next person has to find them all. Fix it once, as early as possible.',
  },
  {
    id: 'b-pbi-imp-03', topic: 'pbi-import', type: 'tf', difficulty: 2, concept: 'pbi-basics',
    prompt: 'True or false: a refresh in Power BI Desktop re-runs the Power Query steps against the current source data.',
    answer: true,
    explain: 'Which is why a query that depends on a fragile step, like "remove top 4 rows", can succeed today and quietly corrupt the model next month.',
  },
  {
    id: 'b-pbi-imp-04', topic: 'pbi-import', type: 'mc', difficulty: 3, concept: 'pbi-basics',
    prompt: 'A published report shows yesterday\'s numbers although the source is up to date. What is the likely cause?',
    options: ['The visuals on the page are broken', 'The dataset refresh has not run, or is failing in the service', 'The model has grown too large to query', 'The user does not have permission to see it'],
    answer: 1,
    explain: 'Imported data is a snapshot. Check the refresh history in the service: a failing scheduled refresh keeps serving the last good load with no visible warning on the report.',
  },

  // ---------------------------------------------------------------- pbi-model
  {
    id: 'b-pbi-mod-01', topic: 'pbi-model', type: 'mc', difficulty: 2, concept: 'pbi-model',
    prompt: 'What does a relationship between two tables do?',
    options: ['It copies the columns from one table to the other', 'Lets a filter on one table flow to the other, so a slicer on Region filters the Sales table', 'Merges the two tables into a single table', 'Sorts the two tables in the same order'],
    answer: 1,
    explain: 'Filters flowing along relationships is the whole mechanism of a Power BI model. If a slicer does not filter a visual, the relationship is usually the reason.',
  },
  {
    id: 'b-pbi-mod-02', topic: 'pbi-model', type: 'mc', difficulty: 3, concept: 'pbi-model',
    prompt: 'What is the usual direction of a one-to-many relationship?',
    options: ['From the fact table to the dimension table', 'From the dimension (one row per product) to the fact table (many sales rows)', 'Both ways at once, by default', 'The direction does not matter'],
    answer: 1,
    explain: 'One product, many sales. The filter flows from the "one" side to the "many" side, which is why filtering the Product table filters Sales and not the other way round.',
  },
  {
    id: 'b-pbi-mod-03', topic: 'pbi-model', type: 'mc', difficulty: 3, concept: 'pbi-model',
    prompt: 'Why are bi-directional relationships discouraged unless you really need them?',
    options: ['They take longer to create than single-direction ones', 'They can create ambiguous filter paths, so results become hard to predict and hard to debug', 'They stop the scheduled refresh working', 'They are not supported in the service'],
    answer: 1,
    explain: 'With several bi-directional paths, the engine may have more than one way to apply a filter. Prefer single direction plus a targeted CROSSFILTER where genuinely needed.',
  },
  {
    id: 'b-pbi-mod-04', topic: 'pbi-model', type: 'tf', difficulty: 2, concept: 'pbi-model',
    prompt: 'True or false: a relationship needs a column with unique values on at least one side.',
    answer: true,
    explain: 'The "one" side must be unique. If both sides have duplicates you get a many-to-many relationship, which is legal but needs a deliberate decision, not an accident.',
  },

  // ---------------------------------------------------------------- pbi-star
  {
    id: 'b-pbi-star-01', topic: 'pbi-star', type: 'mc', difficulty: 3, concept: 'star-schema',
    prompt: 'In a star schema, what is a fact table?',
    options: ['A lookup table holding product names and codes', 'The table of events or measurements: one row per sale, per transaction, per day', 'The date table used for time intelligence', 'A summary table of pre-calculated totals'],
    answer: 1,
    explain: 'Facts are numbers you add up, surrounded by dimensions you slice by (product, store, date, customer). It is the shape the engine is built for.',
  },
  {
    id: 'b-pbi-star-02', topic: 'pbi-star', type: 'mc', difficulty: 3, concept: 'date-table',
    prompt: 'Why does a model need its own date table rather than using the date column in the sales table?',
    options: ['It makes the model diagram tidier', 'Time intelligence needs a continuous, complete set of dates', 'It makes every query run faster', 'It is not really necessary at all'],
    answer: 1,
    explain: 'Without every date present, "same period last year" and running totals break at the gaps. Mark it as a date table so the engine knows what it is.',
  },
  {
    id: 'b-pbi-star-03', topic: 'pbi-star', type: 'mc', difficulty: 3, concept: 'star-schema',
    prompt: 'Why is a star schema usually better than one big flat table?',
    options: ['It ends up holding fewer rows in total', 'It compresses better, filters faster, and gives reusable dimensions', 'It is required by Power BI itself', 'It is easier to import in one go'],
    answer: 1,
    explain: 'Repeating the product name on 10 million sales rows costs memory and makes "list all products" impossible for products with no sales.',
  },
  {
    id: 'b-pbi-star-04', topic: 'pbi-star', type: 'tf', difficulty: 3, concept: 'date-table',
    prompt: 'True or false: a date table should cover whole years, from 1 January of the earliest year to 31 December of the latest.',
    answer: true,
    explain: 'Partial years break year-to-date and year-on-year calculations at the edges. Build it to whole years and it behaves predictably.',
  },
  {
    id: 'b-pbi-star-05', topic: 'pbi-star', type: 'mc', difficulty: 3, concept: 'star-schema',
    prompt: 'Sales and Targets both need to be sliced by month and region. How should they connect?',
    options: ['Join them directly to each other on the month', 'Both relate to the shared Date and Region dimensions, so one slicer filters both', 'Merge them into one combined table', 'Use two separate reports side by side'],
    answer: 1,
    explain: 'Shared dimensions are how two fact tables at different grains live in one model. Joining fact to fact is where the trouble starts.',
  },

  // ---------------------------------------------------------------- pbi-visuals
  {
    id: 'b-pbi-vis-01', topic: 'pbi-visuals', type: 'mc', difficulty: 2, concept: 'pbi-visuals',
    prompt: 'What is the difference between a slicer and a visual-level filter?',
    options: ['There is no real difference between them', 'A slicer is on the page for the reader; a visual-level filter is set by the author', 'Slicers are faster than plain filters', 'Visual-level filters are visible to the readers'],
    answer: 1,
    explain: 'Author-set filters are invisible to the reader, which is exactly how a chart ends up showing one region while everyone reads it as the whole company. Use them deliberately and label the visual.',
  },
  {
    id: 'b-pbi-vis-02', topic: 'pbi-visuals', type: 'mc', difficulty: 2, concept: 'pbi-visuals',
    prompt: 'A card visual shows a much larger number than the matching table. What should you check?',
    options: ['The font size and number format on the card', 'The filters applied to each visual, and whether one summarises at another grain', 'The colour scheme of the report', 'The page size the report uses'],
    answer: 1,
    explain: 'Two visuals disagreeing on the same page is always worth resolving before publishing. It is usually a filter set on one and not the other.',
  },
  {
    id: 'b-pbi-vis-03', topic: 'pbi-visuals', type: 'tf', difficulty: 2, concept: 'pbi-visuals',
    prompt: 'True or false: clicking a bar in one visual filtering the others is on by default.',
    answer: true,
    explain: 'Cross-filtering is one of Power BI\'s best features for exploration. It can be turned off or changed to highlighting per visual pair when it gets in the way.',
  },
  {
    id: 'b-pbi-vis-04', topic: 'pbi-visuals', type: 'mc', difficulty: 3, concept: 'chart-choice',
    prompt: 'A page has 14 visuals and users say it is slow. What is the most likely cause?',
    options: ['There are too many colours on the page', 'Every visual fires its own query, and some measures are expensive', 'The file name is too long for the service', 'There are too many pages in the report'],
    answer: 1,
    explain: 'Fewer, better-chosen visuals per page is both faster and easier to read. Simplifying the heaviest measures usually helps more than anything else.',
  },

  // ---------------------------------------------------------------- pbi-dax
  {
    id: 'b-pbi-dax-01', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'measure-vs-column',
    prompt: 'When should you write a **measure** rather than a calculated column?',
    options: ['Always use calculated columns, never measures', 'When the value depends on what the user has filtered, such as a total or a ratio', 'When the value is a piece of text', 'When the table is small enough to scan'],
    answer: 1,
    explain: 'A column is computed once per row at refresh and frozen. A measure is computed for whatever the visual is showing, which is what makes a dashboard interactive.',
  },
  {
    id: 'b-pbi-dax-02', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'measure-vs-column',
    prompt: 'Which of these genuinely needs a calculated **column**?',
    options: ['Total sales across the model', 'A margin band ("High"/"Low") used as a slicer or axis', 'Average order value by region', 'Year-to-date revenue on a card'],
    answer: 1,
    explain: 'Anything you want to slice or group **by** must exist as a column on a row. Measures produce numbers to put in the values area, not categories to split by.',
  },
  {
    id: 'b-pbi-dax-03', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'dax-basics',
    prompt: 'What does `SUM(Sales[Amount])` return in a visual broken down by region?',
    options: ['The grand total, repeated on every single row', 'The total for each region, because the visual applies the region filter first', 'One row per sale in the table', 'An error, because there is no filter'],
    answer: 1,
    explain: 'That is filter context: the measure is evaluated once per cell of the visual, with that cell\'s filters applied. The same measure gives a different number in every row.',
  },
  {
    id: 'b-pbi-dax-04', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'dax-basics',
    prompt: 'What is wrong with a margin measure written as `AVERAGE(Sales[MarginPct])`?',
    options: ['Nothing at all: it is the right way to do this', 'It averages row percentages, giving a small sale the same weight as a large one', 'The AVERAGE function does not exist in DAX', 'It needs to be wrapped in CALCULATE'],
    answer: 1,
    explain: 'Write it as `DIVIDE(SUM(Sales[Margin]), SUM(Sales[Revenue]))`. Same principle as everywhere else: rebuild the ratio from its totals.',
  },
  {
    id: 'b-pbi-dax-05', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'dax-basics',
    prompt: 'Why use `DIVIDE(a, b)` instead of `a / b` in DAX?',
    options: ['It is faster than the plain division sign', 'It handles division by zero cleanly, returning blank instead of an error', 'It is more accurate on decimals', 'There is no difference between them'],
    answer: 1,
    explain: 'One region with no revenue would otherwise break the whole visual. DIVIDE is the DAX way of saying "and here is what to do when there is nothing to divide by".',
  },
  {
    id: 'b-pbi-dax-06', topic: 'pbi-dax', type: 'tf', difficulty: 3, concept: 'measure-vs-column',
    prompt: 'True or false: calculated columns increase the size of the model, measures generally do not.',
    answer: true,
    explain: 'A column stores a value for every row. A measure stores only its definition and is computed on demand, which is another reason to prefer measures when either would work.',
  },
  {
    id: 'b-pbi-dax-07', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'dax-basics',
    prompt: 'A measure gives the right total but a wrong number in every subtotal row. What is usually happening?',
    options: ['A display bug in the matrix or table visual', 'The measure is re-evaluated at the subtotal\'s filter context, not summed', 'The underlying data itself is wrong', 'The visual needs refreshing again'],
    answer: 1,
    explain: 'Measures do not add up their own rows: each cell, including totals, is computed from scratch. When you need a sum of per-row results, use SUMX over the table.',
  },
  {
    id: 'b-pbi-dax-08', topic: 'pbi-dax', type: 'mc', difficulty: 3, concept: 'dax-basics',
    prompt: 'What is the practical difference between `SUM(Sales[Amount])` and `SUMX(Sales, Sales[Qty] * Sales[Price])`?',
    options: ['There is no real difference between them', 'SUM adds an existing column; SUMX evaluates an expression per row, then adds', 'SUMX is always faster than SUM is', 'SUM only works on whole-number columns'],
    answer: 1,
    explain: 'The X functions iterate. You need one whenever the thing you want to add does not exist as a stored column.',
  },
];
