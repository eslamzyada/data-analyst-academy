// Power Query topics added by the content expansion. They slot into the existing path (see `after`).
// Practice tasks are checked against numbers computed from the same files (tools/data/answers-pq.js).

const SWIFT = { label: 'swiftline_depot_exports.zip (4 depot files + README)', path: 'swiftline_depot_exports.zip' };
const DEPOTS = { label: 'swiftline_depots.csv (depot list)', path: 'powerquery/swiftline_depots.csv' };
const PRIME = { label: 'prime_meats_invoices.zip (4 monthly files)', path: 'prime_meats_invoices.zip' };

export const PQ_EXTRA = [
  // ================================================================ parameters and folders
  {
    id: 'pq-params', skill: 'pq', level: 'Intermediate', title: 'Parameters & folder imports in depth', minutes: 18,
    prereqs: ['pq-custom'], after: 'pq-custom',
    summary: 'Point a query at a folder, take information from file names, and move fixed values into parameters.',
    lesson: `
### Why parameters
A **parameter** is a named value that your steps use: a folder path, a start date, a region, a file name. Home → **Manage Parameters → New Parameter**, give it a name, a type and a current value.

Then replace the fixed value in a step. A filter step recorded as
\`Table.SelectRows(Typed, each [RunDate] >= #date(2026, 8, 1))\`
becomes
\`Table.SelectRows(Typed, each [RunDate] >= StartDate)\`

Next quarter, someone changes the parameter and refreshes. Nobody hunts through steps, and the rule is visible in one place. In Power BI, parameters can also be changed in the service without opening the file.

### From Folder, step by step
1. **Get Data → From Folder**, pick the folder, then **Transform Data** (look before you combine).
2. You get one row per file: *Content* (the file itself), *Name*, *Extension*, *Date modified*, *Folder Path*.
3. **Filter this list first.** Keep Extension = ".csv" (or ".xlsx"), and names that start with the export prefix. This keeps out README files, old copies and \`~$\` lock files that Excel leaves behind.
4. **Combine Files** (the double-arrow button on Content). Power Query builds four things: a *Sample File* parameter, a **Transform Sample File** query, a *Transform File* function, and the combined query that calls the function for every file.
5. Put the cleaning in **Transform Sample File**. The function follows it automatically, so every file gets the same steps.

### Information that lives in the file name
The combined table keeps a **Source.Name** column, for example \`Swiftline_ML_2026-Q3.csv\`. Add Column → Extract → **Text Between Delimiters** "_" and "_" gives \`ML\`. Merge a small lookup table to turn codes into names, regions or managers.

### Files that are not quite the same
- Different column order: fine, Append matches columns by **name**.
- Title lines of different lengths: skip rows until the header (\`Table.Skip(Source, each [Column1] <> "RunID")\`), not a fixed number.
- A column with another name or unit: rename it, or convert it (see *Dynamic transformations*).
- Summary rows such as TOTAL: filter them out in the sample file.

### Keep lookups out of the folder
Anything inside the folder is treated as data. Store lookup tables, notes and archives somewhere else, or filter them out by name.

### A check after every refresh
Group By **Source.Name** with Count Rows and the sum of a key measure. A file with 0 rows, or double its usual total, shows up at once.`,
    tryIt: {
      id: 'pq-params-try', type: 'mc', kind: 'debugging', difficulty: 2, concept: 'pq-folder',
      prompt: 'After From Folder → Combine, the RunID column contains a few rows such as "Each depot system drops its quarterly run export here." What is the cause?',
      options: ['A README text file in the folder was combined as data', 'The CSV files use a semicolon as delimiter', 'Power Query merged two columns by mistake', 'The dates were read with the wrong locale'],
      answer: 0,
      hints: ['Which files does From Folder read?'],
      explain: 'From Folder reads every file in the folder. Filter the file list on Extension = ".csv" (or on the file name) before combining.',
    },
    practice: [
      {
        id: 'pq-params-p1', type: 'numbers', title: 'Four depots, one folder', difficulty: 3, concept: 'pq-folder', business: 'Logistics', minutes: 40,
        files: [SWIFT, DEPOTS], dataset: 'swiftline-depots',
        skills_tested: ['pq-folder', 'pq-append', 'pq-merge'],
        context: 'Swiftline Couriers runs four delivery depots. Each depot system drops a quarterly export into a shared folder, together with a README. Operations wants one table of every delivery run, with the depot name on each row.',
        prompt: 'Unzip the files into one folder. **Get Data → From Folder**, keep only the .csv files, and combine them. Take the depot code from the file name (the text between the two underscores) and merge **swiftline_depots.csv** for the depot name. Fix whatever differs between the files.',
        questions: [
          { label: 'Delivery runs in the combined table (no blank, title or TOTAL rows)' },
          { label: 'Parcels delivered in Q3, all depots' },
          { label: 'Depot with the highest failure rate (failed ÷ parcels)' },
          { label: 'That depot\'s failure rate', unit: '%', percent: true, tolerance: 0.1 },
          { label: 'On-time rate for all depots together (on time ÷ delivered)', unit: '%', percent: true, tolerance: 0.1 },
        ],
        answersKey: 'pq-swift-combine',
        hints: [
          'Filter the folder list on Extension = ".csv" before combining, otherwise README.txt becomes data.',
          'The Marlow file has title lines: in Transform Sample File, skip rows until the one that starts with "RunID" instead of removing a fixed number. The column order differs between files, which is fine.',
          'Bayport has empty lines, Easton has a TOTAL row, and Marlow writes dates day first (Using Locale, English UK).',
        ],
        explain: 'Easton fails about 7.4% of its parcels, well above the other depots (3.1% to 5.0%). Before blaming the team, notice it is the rural depot with the longest routes: the next question for operations is whether the failures are about access (nobody home, hard-to-find addresses) rather than effort.',
      },
      {
        id: 'pq-params-p2', type: 'numbers', title: 'A start-date parameter', difficulty: 3, concept: 'pq-params', business: 'Logistics', minutes: 25,
        files: [SWIFT, DEPOTS], dataset: 'swiftline-depots',
        skills_tested: ['pq-params', 'locale'],
        context: 'Swiftline\'s operations manager wants the same report "since the new routing software went live on 1 August 2026", and next quarter for another start date, without anyone editing steps.',
        prompt: 'Create a parameter **StartDate** (type Date, current value 1 August 2026). In your combined table, filter RunDate to dates on or after StartDate by editing the filter step so it uses the parameter. Answer.',
        questions: [
          { label: 'Delivery runs on or after the start date' },
          { label: 'Parcels delivered on or after the start date' },
          { label: 'Marlow\'s on-time rate on or after the start date', unit: '%', percent: true, tolerance: 0.1 },
        ],
        answersKey: 'pq-swift-param',
        hints: [
          'Home → Manage Parameters → New Parameter. Filter RunDate with "is after or equal to" any date, then replace that date with StartDate in the formula bar.',
          'Marlow\'s dates must be read Using Locale (English UK). If they are not, some July runs look like August runs and the Marlow figures change.',
          'Try another date in the parameter and refresh: the whole report should follow.',
        ],
        explain: 'Since the new software went live, Marlow delivered about 95.7% of its parcels on time. The parameter keeps the rule in one visible place: next quarter someone changes the date instead of hunting for a filter step.',
      },
    ],
    quiz: [],
    challenge: {
      id: 'pq-params-ch', type: 'numbers', title: 'The depot scorecard', difficulty: 4, concept: 'pq-folder', business: 'Logistics', minutes: 40,
      files: [SWIFT, DEPOTS], dataset: 'swiftline-depots',
      skills_tested: ['pq-folder', 'pq-group', 'pq-merge', 'denominator'],
      context: 'Before the quarterly review, Swiftline\'s regional director asks three questions that nobody can answer from the depot files one at a time.',
      prompt: 'Use your combined, cleaned table of Q3 runs and the depot list to answer.',
      questions: [
        { label: 'Driver with the most failed parcels in Q3 (all depots)' },
        { label: 'Share of runs where every delivered parcel was on time', unit: '%', percent: true, tolerance: 0.1 },
        { label: 'Region with the most parcels delivered per van (Region and Vans are in the depot list)' },
        { label: 'That region\'s parcels delivered per van in Q3', tolerance: 20 },
      ],
      answersKey: 'pq-swift-score',
      hints: [
        'Group By Driver with Sum of Failed on the combined table.',
        'A Custom Column [OnTime] = [Delivered] marks the runs that were fully on time.',
        'Vans belong to depots, not to runs. Group the depot list by Region (Sum of Vans) and the runs by Region (Sum of Delivered) separately, then merge. Merging vans onto every run and summing would count each van hundreds of times.',
      ],
      explain: 'Hana Sato (Bayport) has the most failed parcels, yet Easton\'s drivers fail a bigger share of what they carry (over 7% against her 5%): a count favours drivers who carry more, so compare rates before naming anyone. Metro delivers about 9,000 parcels per van, on short city routes, so parcels per van is not a fair comparison with a rural depot either.',
    },
    cards: [
      { id: 'pq-params-c1', front: 'What is a Power Query parameter for?', back: 'A named value (folder path, start date, region) that steps use, so it can be changed in one place without editing the steps.' },
      { id: 'pq-params-c2', kind: 'decision', front: 'A folder import picks up a README and a ~$ lock file. Fix?', back: 'Filter the folder list (Extension = ".csv", name starts with the export prefix) before Combine Files.' },
      { id: 'pq-params-c3', front: 'Where does the depot code in "Swiftline_ML_2026-Q3.csv" come from after a folder combine?', back: 'The Source.Name column: Extract → Text Between Delimiters "_" and "_".' },
    ],
  },

  // ================================================================ custom functions
  {
    id: 'pq-functions', skill: 'pq', level: 'Advanced', title: 'Custom functions', minutes: 18,
    prereqs: ['pq-m'], after: 'pq-m',
    summary: 'Write the cleaning once as a function, and call it for every file, supplier or value.',
    lesson: `
### A function is a query with inputs
\`\`\`
(price as number, cost as number) as number =>
    if price = 0 then null else (price - cost) / price
\`\`\`
Save it as a blank query named **fnMargin**. Call it with **Add Column → Invoke Custom Function**, or in a Custom Column: \`fnMargin([Price], [Cost])\`.

### Turning a cleaning query into a function
1. Build and test a query that cleans **one** file.
2. Open the Advanced Editor and wrap it:
\`\`\`
(file as binary) as table =>
let
    Source   = Csv.Document(file, [Delimiter = ","]),
    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),
    Renamed  = Table.RenameColumns(Promoted, {{"Quantity", "Qty"}}, MissingField.Ignore),
    Clean    = Table.TransformColumns(Renamed, {{"Product", each Text.Proper(Text.Trim(_)), type text}}),
    Typed    = Table.TransformColumnTypes(Clean, {{"Date", type date}, {"Qty", type number}}, "en-GB")
in
    Typed
\`\`\`
3. On the folder list, **Invoke Custom Function** on the *Content* column, then expand the tables.

This is what **Combine Files** builds for you (the *Transform File* function). Writing your own gives you control, a readable name, and a function you can reuse for other suppliers.

### Parameter or function?
- **Parameter:** one value that steps use (a path, a date).
- **Function:** logic you call many times with different inputs (every file, every row).

### each and _
\`each [Qty] * 2\` is shorthand for \`(_) => _[Qty] * 2\`. In \`Table.TransformColumns\`, \`each Text.Upper(_)\` receives one cell value at a time.

### Good habits
- Give inputs a type (\`as number\`, \`as table\`, \`as binary\`) so wrong calls fail clearly.
- Handle bad values inside: \`try Number.From(x) otherwise null\`.
- Keep a small test query that calls the function on one known file and checks its row count and total.
- If the function is slow on a folder, check that it does not re-read other files or tables for every call.`,
    tryIt: {
      id: 'pq-functions-try', type: 'mc', kind: 'tool-selection', difficulty: 3, concept: 'pq-functions',
      prompt: 'Which first line turns a cleaning query into a function that takes one file?',
      options: ['(file as binary) as table =>', 'let file = binary in', 'function clean(file) {', '=LAMBDA(file, clean)'],
      answer: 0,
      hints: ['M functions list their inputs in brackets, followed by an arrow.'],
      explain: 'An M function starts with its parameters in brackets and =>, followed by the body (usually a let … in block).',
    },
    practice: [
      {
        id: 'pq-functions-p1', type: 'numbers', title: 'One function for every invoice file', difficulty: 4, concept: 'pq-functions', business: 'Restaurant', minutes: 45,
        files: [PRIME], dataset: 'prime-meats',
        skills_tested: ['pq-functions', 'pq-folder', 'locale'],
        context: 'Olive & Ember\'s finance team wants a function, **fnCleanInvoice**, that takes one Prime Meats file and returns clean invoice lines, so the same logic can later be reused for other suppliers.',
        prompt: 'Write a custom function that takes a file (binary) and returns its cleaned lines: headers promoted, Quantity renamed to Qty, Product and Site trimmed with consistent capitals, UK dates read correctly, no TOTAL row. Invoke it on every file in the folder, combine, remove the duplicated line, and answer.',
        questions: [
          { label: 'Kilograms of ribeye steak bought, May to August', tolerance: 0.5 },
          { label: 'Month with the highest spend on chicken breast', month: true },
          { label: 'Lamb shoulder: weighted average price per kg in August', unit: '$', tolerance: 0.03 },
        ],
        answersKey: 'pq-pm-function',
        hints: [
          'Start from a query that cleans one file, then wrap it: (file as binary) as table => let Source = Csv.Document(file, [Delimiter=","]), … in Result.',
          'Inside: Table.RenameColumns(…, {{"Quantity", "Qty"}}, MissingField.Ignore), Text.Proper(Text.Trim(_)) on Product and Site, Table.SelectRows to drop TOTAL, and the Date type with the "en-GB" culture.',
          'Invoke Custom Function on the Content column of the folder list, expand, then Remove Duplicates (the duplicated August line is an exact copy).',
        ],
        explain: 'With one function, every file gets identical cleaning, and a new file needs no new steps. July had the highest chicken spend, and lamb cost about $22.03 a kg in August, almost the same as in May: the price problem is elsewhere.',
      },
    ],
    quiz: [],
    challenge: null,
    cards: [
      { id: 'pq-functions-c1', front: 'How do you turn a one-file cleaning query into a function?', back: 'Wrap it in (file as binary) as table => let … in …, then Invoke Custom Function on the folder list\'s Content column.' },
      { id: 'pq-functions-c2', front: 'What does `each` stand for?', back: 'A one-input function: each [Qty] * 2 is (_) => _[Qty] * 2.' },
    ],
  },

  // ================================================================ dynamic transformations
  {
    id: 'pq-dynamic', skill: 'pq', level: 'Advanced', title: 'Dynamic transformations', minutes: 18,
    prereqs: ['pq-functions'], after: 'pq-functions',
    summary: 'Queries that adapt to the columns and values they find, instead of naming them one by one.',
    lesson: `
### The problem with recorded steps
Recorded steps name columns: \`Table.TransformColumnTypes(t, {{"Jan", type number}, {"Feb", type number}})\`. A new column is ignored, and a missing one breaks the refresh.

### Work with the list of columns
- \`Table.ColumnNames(t)\` returns the headers as a list.
- \`List.Select(Table.ColumnNames(t), each Text.StartsWith(_, "2026"))\` finds the month columns, whatever they are.
- \`List.Transform(cols, each {_, type number})\` builds the list a typing step needs.
\`\`\`
let
    Months = List.Select(Table.ColumnNames(Source), each Text.StartsWith(_, "2026")),
    Typed  = Table.TransformColumnTypes(Source, List.Transform(Months, each {_, type number}))
in
    Typed
\`\`\`

### Rename with a mapping table
Keep a small table **Map** (OldName, NewName), for example DistanceMi → DistanceMiles, Qty Sold → Units. Then:
\`Table.RenameColumns(Source, List.Zip({Map[OldName], Map[NewName]}), MissingField.Ignore)\`
When a new system sends another layout, you add a row to the mapping table instead of editing the query.

### Branch on what the file contains
\`\`\`
if Table.HasColumns(t, "DistanceMi")
then Table.AddColumn(t, "Km", each [DistanceMi] * 1.609344, type number)
else Table.AddColumn(t, "Km", each [DistanceKm], type number)
\`\`\`
One function now handles files in miles and in kilometres.

### Rolling filters
\`Table.SelectRows(t, each [Date] >= Date.AddMonths(Date.From(DateTime.LocalNow()), -12))\` keeps the last 12 months. The result changes every day, so say so in the report, and prefer a parameter when people need to reproduce a number.

### Know when to stop
Dynamic code is harder to read. Use it where the source really changes; keep simple recorded steps elsewhere, and name the steps so the next person can follow them.`,
    tryIt: {
      id: 'pq-dynamic-try', type: 'mc', kind: 'debugging', difficulty: 3, concept: 'pq-dynamic',
      prompt: 'A query types the columns "Jan" to "Dec" by name. Next year the file has columns "2027-01" to "2027-12" instead. What happens on refresh?',
      options: ['It fails: the step looks for columns that no longer exist', 'Power Query renames the new columns to Jan to Dec', 'The new columns are typed as numbers as well', 'The refresh works and nothing changes'],
      answer: 0,
      hints: ['What does a recorded Changed Type step contain?'],
      explain: 'Recorded steps name each column. Select the columns with List.Select on Table.ColumnNames, and type whatever the file contains.',
    },
    practice: [
      {
        id: 'pq-dynamic-p1', type: 'numbers', title: 'Miles, kilometres and a rename table', difficulty: 4, concept: 'pq-dynamic', business: 'Logistics', minutes: 40,
        files: [SWIFT, DEPOTS], dataset: 'swiftline-depots',
        skills_tested: ['pq-dynamic', 'pq-functions'],
        context: 'Next quarter more depot systems will join Swiftline, each with its own column names. Instead of a new Rename step per depot, the operations analyst wants a mapping table (OldName → NewName) and one rule for distance units.',
        prompt: 'In your folder query, rename columns through a mapping table, and add a distance column in km that uses the kilometres when a file has them and converts miles (× 1.609344) when it does not. Answer.',
        questions: [
          { label: 'Total distance driven in Q3, all depots, in km', tolerance: 50 },
          { label: 'Easton\'s distance in km', tolerance: 20 },
          { label: 'Average distance per run, all depots, in km', tolerance: 0.3 },
        ],
        answersKey: 'pq-swift-km',
        hints: [
          'Rename with a list built from the table: Table.RenameColumns(t, List.Zip({Map[OldName], Map[NewName]}), MissingField.Ignore).',
          'In the file function: if Table.HasColumns(t, "DistanceMi") then add [DistanceMi] * 1.609344, else use [DistanceKm].',
          'Summing DistanceKm alone leaves Easton out: its rows have no kilometre value.',
        ],
        explain: 'Easton drives about 40,600 of the 146,800 km, more than a quarter of the distance with 3 of the 18 routes. A transformation that checks which columns exist keeps working when a new depot sends another layout.',
      },
    ],
    quiz: [],
    challenge: null,
    cards: [
      { id: 'pq-dynamic-c1', front: 'Type every column whose name starts with "2026", whatever they are?', back: 'List.Select(Table.ColumnNames(t), each Text.StartsWith(_, "2026")), then List.Transform(…, each {_, type number}) inside TransformColumnTypes.' },
      { id: 'pq-dynamic-c2', front: 'Rename columns from a mapping table?', back: 'Table.RenameColumns(t, List.Zip({Map[OldName], Map[NewName]}), MissingField.Ignore).' },
    ],
  },
];
