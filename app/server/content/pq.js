// POWER QUERY: visual transformations first, M code only at the end.
// Practice happens in real Excel (Data > Get Data); the app checks the numbers your clean table produces.

export const PQ = [
  // =========================================================================== BEGINNER
  {
    id: 'pq-intro', skill: 'pq', level: 'Beginner', title: 'What Power Query is & importing data', minutes: 10, prereqs: [],
    summary: 'A recorder for data cleaning: do it once, refresh forever.',
    lesson: `
### The problem it solves
Every week someone downloads the same messy export and spends an hour cleaning it by hand: deleting title rows, fixing dates, removing blanks. Power Query **records those steps** and replays them with one click: **Refresh**.

### Where it lives
- **Excel:** Data → Get Data (or *From Text/CSV*, *From Workbook*, *From Folder*)
- **Power BI:** Home → Get Data → Transform Data. It's exactly the same engine.

### The Power Query Editor
| Part | What it's for |
|---|---|
| Preview grid | your data, as it looks after the selected step |
| **Applied Steps** (right) | every transformation, in order. Click one to go back in time; delete one to undo it |
| Ribbon | the transformations (Remove Rows, Split Column, Group By…) |
| Formula bar | the M code behind the selected step (turn it on under View) |

### The workflow
1. **Get Data** → choose the file → **Transform Data** (not "Load", if it needs cleaning)
2. Clean it in the editor; each click becomes a step
3. **Close & Load** → the result lands in a sheet as a Table (or only in the Data Model)
4. Next month: replace the file, then **Data → Refresh All**

### Key idea: the source file is never changed
Power Query reads the file and builds a new, clean table. Your raw data stays untouched, so cleaning is safe and repeatable.

### When to use it (and when not)
- ✔ Repeated imports, multiple files, messy exports, reshaping, combining tables
- ✘ A quick one-off calculation on a small, clean sheet. A formula is faster there.`,
    tryIt: {
      id: 'pq-intro-try', type: 'order', difficulty: 1, concept: 'pq-basics',
      prompt: 'Put the Power Query workflow in the right order.',
      options: ['Close & Load the clean table to a sheet', 'Get Data and pick the file', 'Refresh when next month\'s file arrives', 'Clean the data in the Power Query Editor (each action becomes a step)'],
      answer: [1, 3, 0, 2],
      hints: ['You can\'t clean data you haven\'t connected to yet.'],
      explain: 'Get Data → Transform (steps) → Close & Load → Refresh. The refresh is where you get your time back, every month.',
    },
    practice: [
      { id: 'pq-intro-p1', type: 'numbers', title: 'First import: the CRM export', difficulty: 1, concept: 'pq-basics', business: 'Marketing', minutes: 10,
        context: 'Marketing sent a CSV export from their CRM. Before cleaning anything, you want to know what you received.',
        prompt: 'In Excel: **Data → From Text/CSV**, choose the file, click **Transform Data**. Without changing anything, look at the preview and the status bar at the bottom of the editor.',
        files: [{ label: 'crm_contacts_export.csv', path: 'powerquery/crm_contacts_export.csv' }], dataset: 'crm-contacts', answersKey: 'pq-contacts-raw',
        questions: [{ label: 'How many rows does the raw file have (below the header)?' }, { label: 'How many columns?' }],
        hints: ['The row count is shown at the bottom left of the editor ("… ROWS"). If the status bar only profiles the first 1,000 rows, that\'s still enough for this file.', 'Every line under the header counts, including the blank ones.'],
        explain: 'Always know the raw row count before you clean. It\'s your baseline for checking that nothing important was dropped later.' },
    ],
    quiz: [
      { id: 'pq-intro-q1', type: 'mc', difficulty: 1, concept: 'pq-basics', prompt: 'What happens to the original CSV file when you clean it in Power Query?', options: ['It is overwritten with the clean data', 'Nothing: Power Query builds a new table and leaves the source untouched', 'It is deleted once the query has loaded', 'It is converted to an .xlsx workbook'], answer: 1, explain: 'Power Query only reads the source. The clean result is a new table.' },
      { id: 'pq-intro-q2', type: 'mc', difficulty: 1, concept: 'pq-basics', prompt: 'Where do you see (and undo) every transformation you made?', options: ['The formula bar', 'Applied Steps', 'The status bar', 'Name Manager'], answer: 1, explain: 'Applied Steps lists every step in order. Click one to see the data at that point; delete it to undo.' },
      { id: 'pq-intro-q3', type: 'mc', difficulty: 2, concept: 'tool-choice', prompt: 'Which task is the best fit for Power Query?', options: ['Adding two numbers in a small, clean table once', 'Cleaning the same weekly export from 6 branches every Monday', 'Writing a memo', 'Formatting a single chart'], answer: 1, explain: 'Repeated, messy, multi-file work is exactly what Power Query automates.' },
      { id: 'pq-intro-q4', type: 'tf', difficulty: 1, concept: 'pq-basics', prompt: 'True or false: Excel\'s Power Query and Power BI\'s Power Query are the same engine.', answer: true, explain: 'Same engine, same M language. What you learn here carries straight into Power BI.' },
      { id: 'pq-intro-q5', type: 'mc', difficulty: 1, concept: 'pq-basics', prompt: 'You chose "Load" instead of "Transform Data" and the messy data landed in a sheet. How do you get back to the editor?', options: ['Start again with a brand new query', 'Data → Queries & Connections → right-click the query → Edit', 'Press Ctrl+Z until the data disappears', 'Nothing: loaded queries cannot be edited'], answer: 1, explain: 'Queries & Connections lists every query; Edit reopens the editor.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-intro-c1', front: 'Power Query in one sentence?', back: 'A tool that records your data-cleaning steps so you can replay them on new data with one click (Refresh).' },
      { id: 'pq-intro-c2', kind: 'decision', front: 'Every Monday you clean the same export by hand for an hour. What should you do?', back: 'Build it once in Power Query; afterwards, replace the file and Refresh.' },
    ],
  },

  {
    id: 'pq-types', skill: 'pq', level: 'Beginner', title: 'Data types, columns & locale', minutes: 12, prereqs: ['pq-intro'],
    summary: 'Get every column the right type, keep only what you need, and read foreign date formats.',
    lesson: `
### Every column has a type
The icon left of each header shows it: **ABC** text, **123** whole number, **1.2** decimal, a calendar for date, **ABC/123** "any" (not decided). Wrong types cause wrong sums, broken date filters and failed merges.

### Changing types
Click the icon → pick a type. Power Query often adds a **Changed Type** step automatically after promoting headers. Check it: it guessed from the first rows only.

### Dates in another format: "Using Locale"
A file from the UK writes 07/01/2026 for **7 January**. A US computer reads it as **July 1**, and dates like 13/01/2026 become errors.
**Fix:** right-click the column → **Change Type → Using Locale…** → type Date, locale **English (United Kingdom)**.
⚠ The dangerous part: days 1–12 don't error. They become the **wrong date** without any warning. Always check your monthly totals after a type change.

### Columns
- **Remove Columns** / **Choose Columns** (keep only what you need: faster and clearer)
- **Rename**: double-click the header
- Reorder: drag

### Errors
After a type change, cells that can't convert show **Error**. Click an error cell to see why. Keep Rows → **Keep Errors** shows them all. Don't just Remove Errors blindly: find out first what they are.`,
    tryIt: {
      id: 'pq-types-try', type: 'mc', difficulty: 2, concept: 'locale',
      prompt: 'A supplier file writes dates like 03/07/2026 meaning **3 July**. Your PC uses US settings. After "Change Type → Date", July\'s totals look far too low. What happened?',
      options: ['Power Query deleted the July rows', 'Days 1–12 moved to other months; days 13+ became errors', 'The file is corrupt and must be exported again', 'July simply had fewer sales than June'],
      answer: 1, hints: ['What does 03/07 mean in the US vs the UK?'],
      explain: 'Use Change Type → Using Locale → English (United Kingdom). Then check the monthly totals: silent misreads don\'t show up as errors.',
    },
    practice: [],
    quiz: [
      { id: 'pq-types-q1', type: 'mc', difficulty: 2, concept: 'pq-types', prompt: 'A number column shows the ABC icon. What problem will you hit?', options: ['None', 'It is text: sums and numeric filters won\'t work properly', 'It will be sorted alphabetically only in Excel', 'Power Query will refuse to load it'], answer: 1, explain: 'Text "numbers" can\'t be summed. Change the type to Decimal/Whole Number.' },
      { id: 'pq-types-q2', type: 'mc', difficulty: 2, concept: 'locale', prompt: 'How do you correctly read "15/07/2026" style dates on a US-settings PC?', options: ['Change Type → Date', 'Change Type → Using Locale → Date, English (United Kingdom)', 'Split the column and rebuild the dates manually (the only way)', 'Format the cells in Excel after loading'], answer: 1, explain: 'Using Locale tells Power Query which format the source uses. (Splitting also works, but it\'s much more effort.)' },
      { id: 'pq-types-q3', type: 'tf', difficulty: 2, concept: 'pq-types', prompt: 'True or false: the automatic "Changed Type" step always picks the right types because it reads the whole file.', answer: false, explain: 'It guesses from the first rows (about 200). Always check the types yourself.' },
      { id: 'pq-types-q4', type: 'mc', difficulty: 2, concept: 'pq-robust', prompt: 'Why remove columns you don\'t need, early in the query?', options: ['It makes the preview look tidier', 'Faster refreshes, and fewer steps that can break', 'Excel limits queries to 5 columns', 'It is required before Close & Load'], answer: 1, explain: 'Fewer columns = faster refreshes and fewer surprises when the source changes.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-types-c1', front: 'How do you read UK-format dates on a US PC in Power Query?', back: 'Change Type → Using Locale → Date → English (United Kingdom).' },
      { id: 'pq-types-c2', kind: 'debug', front: 'Refresh fails: "column Qty was not found". Usual cause?', back: 'A step (often Changed Type) hard-codes the column name, and the source renamed it.' },
    ],
  },

  {
    id: 'pq-clean', skill: 'pq', level: 'Beginner', title: 'Filtering, duplicates, replacing & nulls', minutes: 14, prereqs: ['pq-types'],
    summary: 'The everyday cleaning toolkit: remove junk rows, fix values, fill gaps.',
    lesson: `
### Remove rows you don't want
- **Remove Top Rows**: title lines above the header (then *Use First Row as Headers*)
- **Remove Blank Rows**: Home → Remove Rows → Remove Blank Rows
- **Filter** (header drop-down): e.g. untick "TOTAL" or null
- **Remove Duplicates**: select the key column(s) first → Remove Rows → Remove Duplicates

### Fix values
- **Replace Values** (Transform tab): "N/A" → null, "Canceled" → "Cancelled"
- **Format → Trim / Clean / Capitalize Each Word**: spaces, invisible characters, case
- **Fill Down**: when a value appears only in the first row of each group (a common report export style)

### null
null means "no value". It is not 0 and not "". Replace "N/A", "-" and "" with null, so they're treated consistently; then decide: keep them, filter them out, or replace them (e.g. with 0 when you know it means none).

### Check your work
Turn on **View → Column quality / Column distribution / Column profile**: you get % empty, % errors, distinct counts, top values. Set it to profile the entire dataset (bottom-left: "Column profiling based on entire data set").`,
    tryIt: {
      id: 'pq-clean-try', type: 'order', difficulty: 2, concept: 'pq-clean',
      prompt: 'A CSV has 2 title lines, then the header, blank lines in the middle and a TOTAL row at the end. Put the cleaning steps in a sensible order.',
      options: ['Use First Row as Headers', 'Remove Top Rows (2)', 'Filter out the TOTAL row', 'Remove Blank Rows'],
      answer: [1, 0, 3, 2],
      hints: ['You need the right header before you can filter by column values.'],
      explain: 'Remove the title rows → promote the header → then the row cleaning (blanks, totals) can use real column names. The blank and TOTAL steps can be swapped.',
    },
    practice: [
      { id: 'pq-clean-p1', type: 'numbers', title: 'Clean the CRM contacts', difficulty: 2, concept: 'pq-clean', business: 'Marketing', minutes: 25,
        context: 'Marketing wants a clean contact list for a campaign. The CRM export has blank rows, duplicated rows, "N/A" emails, inconsistent city names and names written "Last, First".',
        prompt: 'Clean the file in Power Query and answer from your clean table.',
        files: [{ label: 'crm_contacts_export.csv', path: 'powerquery/crm_contacts_export.csv' }], dataset: 'crm-contacts', answersKey: 'pq-file-contacts',
        questions: [{ label: 'Unique customers after removing blank and duplicate rows' }, { label: 'Customers with no usable email (blank or N/A)' }, { label: 'Distinct cities after fixing case and spaces' }, { label: 'Customers who signed up in 2025' }, { label: 'Customers whose LAST name is Chen' }],
        hints: ['Remove Blank Rows, then Remove Duplicates. Replace "N/A" with null in Email. Trim + Capitalize Each Word on City.', 'Signup Date has two formats (YYYY-MM-DD and DD/MM/YYYY): use Change Type → Using Locale (English UK) or split the job. Split Full Name by ", " to get last and first names.'],
        explain: 'Each step is simple. The skill is noticing every problem and checking the row count at each stage (239 raw → 236 without blanks → 230 unique).' },
    ],
    quiz: [
      { id: 'pq-clean-q1', type: 'mc', difficulty: 2, concept: 'pq-clean', prompt: 'Which step handles "N/A" in an Email column best?', options: ['Remove Rows → Remove Errors', 'Replace Values "N/A" → null', 'Change Type to Text', 'Fill Down'], answer: 1, explain: 'Turn placeholders into proper nulls so every missing email is treated the same way.' },
      { id: 'pq-clean-q2', type: 'mc', difficulty: 2, concept: 'pq-clean', prompt: 'A report export shows the Region only on the first row of each block, and the rows below it are empty. Which transformation fixes it?', options: ['Fill Down', 'Pivot', 'Remove Duplicates', 'Transpose'], answer: 0, explain: 'Fill Down copies the value above into the empty cells below.' },
      { id: 'pq-clean-q3', type: 'tf', difficulty: 2, concept: 'pq-clean', prompt: 'True or false: in Power Query, null and 0 mean the same thing.', answer: false, explain: 'null = no value/unknown. Decide explicitly whether a null should become 0.' },
      { id: 'pq-clean-q4', type: 'mc', difficulty: 3, concept: 'pq-clean', prompt: 'You remove duplicates on the whole table, but "duplicate" customers remain. Why?', options: ['Remove Duplicates is broken in this file', 'The rows differ slightly, e.g. spaces or capitals', 'You must sort the table first', 'Duplicates can only be found in numbers'], answer: 1, explain: 'Clean the values (Trim, case), then remove duplicates using the key column(s).' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-clean-c1', front: 'How do you see % empty and % errors per column?', back: 'View → Column quality (and set profiling to the entire data set).' },
      { id: 'pq-clean-c2', front: 'Report export with the group value only on the first row of each block?', back: 'Transform → Fill → Down.' },
    ],
  },

  {
    id: 'pq-split', skill: 'pq', level: 'Beginner', title: 'Splitting & merging columns', minutes: 10, prereqs: ['pq-clean'],
    summary: 'Break "Last, First" apart, pull codes out of text, and build keys.',
    lesson: `
### Split Column
Home/Transform → **Split Column**:
- **By Delimiter**: "Chen, Anna" split by ", " → Last | First
- **By Number of Characters**: fixed-width codes
- **By Positions**, and **Lowercase to Uppercase**, etc.

Choose *at the left-most / right-most / each occurrence* carefully. "Mary Anne Smith" split at each space gives three columns.

### Extract (without splitting)
Add Column → **Extract** → Text Before/After Delimiter, First Characters, Range…
Example: the category code before the dash in "TNT-104".

### Merge Columns
Select columns (in order) → **Merge Columns** → pick a separator. For example Store + "-" + Month to build a matching key.

### Add Column vs Transform
- **Transform** changes the column in place.
- **Add Column** keeps the original and adds a new one. Safer while you're exploring.`,
    tryIt: {
      id: 'pq-split-try', type: 'mc', difficulty: 1, concept: 'pq-split',
      prompt: 'A column holds "Chen, Anna". You want Last and First in two columns. Which is the cleanest step?',
      options: ['Split Column → By Delimiter ", " (a comma and a space)', 'Split Column → By Number of Characters (5)', 'Replace Values "," with ""', 'Merge Columns'], answer: 0,
      hints: ['Last names have different lengths.'], explain: 'Splitting on ", " handles names of any length and doesn\'t leave a stray leading space.',
    },
    practice: [],
    quiz: [
      { id: 'pq-split-q1', type: 'mc', difficulty: 2, concept: 'pq-split', prompt: 'You split "Mary Anne Smith" by space at EACH occurrence. What do you get?', options: ['2 columns', '3 columns: Mary | Anne | Smith', '1 column', 'An error'], answer: 1, explain: 'Each occurrence → as many columns as pieces. Use "left-most" or "right-most" for exactly two parts.' },
      { id: 'pq-split-q2', type: 'mc', difficulty: 2, concept: 'pq-split', prompt: 'You want to keep the original SKU column AND get its category code. Which tab?', options: ['Transform → Extract', 'Add Column → Extract', 'Home → Remove Columns', 'View → Advanced Editor'], answer: 1, explain: 'Add Column creates a new column and leaves the original alone.' },
      { id: 'pq-split-q3', type: 'tf', difficulty: 1, concept: 'pq-split', prompt: 'True or false: Merge Columns can put a separator such as "-" between the merged values.', answer: true, explain: 'You choose the separator (none, comma, space, custom).' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-split-c1', front: 'Split "Chen, Anna" into Last and First?', back: 'Split Column → By Delimiter → custom ", " → at the left-most delimiter.' },
    ],
  },

  // =========================================================================== INTERMEDIATE
  {
    id: 'pq-append', skill: 'pq', level: 'Intermediate', title: 'Append & folder imports', minutes: 15, prereqs: ['pq-clean'],
    summary: 'Stack monthly files into one table, and pick up next month\'s file automatically.',
    lesson: `
### Append = stack rows
Home → **Append Queries**: January + February + March → one table. The columns are matched **by name**. A column called "Qty Sold" in one file and "Units" in another ends up as two half-empty columns.

### From Folder: the grown-up way
Data → Get Data → From File → **From Folder** → **Combine & Transform**.
Power Query then:
1. lists every file in the folder
2. builds a **sample file** transformation (your cleaning steps)
3. applies it to **every** file, and stacks the results

Next month: drop the new file in the folder → **Refresh**. Nothing to edit.

### When the files aren't identical
Real exports drift: an extra title line, a renamed column, a different date format, a TOTAL row.
- Clean in the **Transform Sample File** query: the steps there run on every file.
- Remove title rows by condition (keep rows from the header onward), not by a fixed count.
- Rename columns to one standard name.
- Filter out TOTAL and blank rows.
- Use **Using Locale** for dates.

### Always reconcile
After combining, check the **row count and the totals per file (month)** against the source. A silent misread shows up here.`,
    tryIt: {
      id: 'pq-append-try', type: 'mc', difficulty: 2, concept: 'pq-append',
      prompt: 'After appending three monthly files, the "Units" column is empty for July, and a new column "Qty Sold" appears, filled only for July. Why?',
      options: ['July had no sales', 'Append matches columns by NAME; July calls it "Qty Sold"', 'Append only works on two tables', 'The July file is corrupt'], answer: 1,
      hints: ['How does Append decide which column goes where?'],
      explain: 'Rename "Qty Sold" to "Units" (in the sample-file transformation, or before appending) so the columns line up.',
    },
    practice: [
      { id: 'pq-append-p1', type: 'numbers', title: 'Combine the store POS exports', difficulty: 4, concept: 'pq-append', business: 'Retail', minutes: 40,
        context: 'Every month Cedarline\'s till vendor drops a summary file into a folder. The Head of Retail wants a store scorecard that refreshes itself. The files look alike, but they are not identical.',
        prompt: 'Download the ZIP and unzip the 3 files into one folder. Use **From Folder** to combine them, clean the result, merge stores.csv (store names/regions), unpivot the targets file, and answer.',
        files: [{ label: 'cedarline_pos_exports.zip (3 monthly files)', path: 'cedarline_pos_exports.zip' }, { label: 'stores.csv', path: 'powerquery/stores.csv' }, { label: 'store_targets_summer_2026.csv', path: 'powerquery/store_targets_summer_2026.csv' }], dataset: 'pos-exports', answersKey: 'pq-file-pos',
        questions: [{ label: 'Data rows in the clean combined table' }, { label: 'June NetSales total' }, { label: 'July NetSales total' }, { label: 'August NetSales total' }, { label: 'Store furthest below target (StoreCode)', accept: ['W02', 'Canyon'] }, { label: 'That store\'s July attainment %', percent: true, tolerance: 0.3 }],
        hints: ['Open each CSV in Notepad first. July has title lines, uses "Qty Sold" and writes dates as DD/MM/YYYY; August has an extra Notes column, a TOTAL row, and lowercase "w02" on some rows.', 'In the sample transformation: remove the rows above the header, promote headers, rename Qty Sold → Units, filter out TOTAL/blank rows, change Date type Using Locale, and Uppercase StoreCode. Check the July total: if it\'s ~$45k, some July dates were misread.'],
        explain: 'The files differ in small ways, each of which silently corrupts a total: title rows, a renamed column, a date format that misreads days 1–12, a TOTAL row, and store codes that break a case-sensitive merge. Reconcile totals per month every time.' },
    ],
    quiz: [
      { id: 'pq-append-q1', type: 'mc', difficulty: 2, concept: 'pq-append', prompt: 'Append or Merge: you have 12 monthly files with the same columns and want all rows in one table.', options: ['Merge', 'Append', 'Group By', 'Pivot'], answer: 1, explain: 'Append stacks rows. Merge adds columns by matching keys (like a lookup).' },
      { id: 'pq-append-q2', type: 'mc', difficulty: 3, concept: 'pq-robust', prompt: 'With From Folder, where should the cleaning steps that apply to every file go?', options: ['In the final combined query only', 'In the "Transform Sample File" query', 'In each file separately', 'In Excel after loading'], answer: 1, explain: 'Steps in the sample-file transformation run on every file before they are stacked.' },
      { id: 'pq-append-q3', type: 'tf', difficulty: 2, concept: 'pq-append', prompt: 'True or false: with a folder query, adding next month\'s file to the folder and clicking Refresh is enough.', answer: true, explain: 'As long as the new file follows the formats your steps can handle.' },
      { id: 'pq-append-q4', type: 'mc', difficulty: 3, concept: 'locale', prompt: 'After combining, July\'s total is much lower than the POS system says, and there are no errors. Most likely?', options: ['Rounding of the NetSales values', 'Some July dates were read as other months', 'The extra Notes column in August', 'Too many rows in the June file'], answer: 1, explain: 'DD/MM misread as MM/DD moves days 1–12 to the wrong month without errors. Use Using Locale.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-append-c1', front: 'Append vs Merge?', back: 'Append stacks rows (same columns). Merge joins columns from another table by a key (like XLOOKUP).' },
      { id: 'pq-append-c2', front: 'First check after combining monthly files?', back: 'Row count and totals per month vs the source files.' },
    ],
  },

  {
    id: 'pq-merge', skill: 'pq', level: 'Intermediate', title: 'Merge queries (lookups)', minutes: 14, prereqs: ['pq-append'],
    summary: 'Bring columns from another table: Power Query\'s XLOOKUP, with every join type.',
    lesson: `
### Merge = join
Home → **Merge Queries**: pick the second table and click the matching column in each (you can Ctrl-click several columns for a composite key). Then **expand** the new column to choose which fields to bring in.

### Join kinds
| Join kind | Keeps |
|---|---|
| **Left Outer** (default) | all rows of the first table + matches |
| Inner | only rows that match in both |
| Full Outer | everything from both |
| **Left Anti** | rows of the first table with **no** match, great for "what's missing?" |
| Right Anti | rows of the second table with no match |

### Matching is exact
- **Case-sensitive:** "w02" does not match "W02". Uppercase both first.
- Spaces matter: Trim first.
- Types must match: text "101" ≠ number 101.
The merge dialog shows "The selection matches 1,150 of 1,183 rows". Read that number!

### Fuzzy matching
The option "Use fuzzy matching" can match "Northline Supply" with "Northline Supplies". Handy, but check the results.`,
    tryIt: {
      id: 'pq-merge-try', type: 'mc', difficulty: 2, concept: 'pq-merge',
      prompt: 'You want the list of invoice lines whose product code is NOT in the product master (to send to the master-data team). Which join kind?',
      options: ['Left Outer', 'Inner', 'Left Anti', 'Full Outer'], answer: 2, hints: ['You want rows WITHOUT a match.'],
      explain: 'Left Anti returns the rows of the first table that found no match in the second table.',
    },
    practice: [
      { id: 'pq-merge-p1', type: 'numbers', title: 'Prime Meats invoices', difficulty: 3, concept: 'pq-append', business: 'Restaurant', minutes: 35,
        context: 'Olive & Ember\'s finance team downloads Prime Meats invoice lines each month. The supplier changed their export several times. Finance suspects Prime Meats raised prices in June.',
        prompt: 'Combine the four monthly files (From Folder), clean them, and answer. Product names and sites must be consistent across months.',
        files: [{ label: 'prime_meats_invoices.zip (4 monthly files)', path: 'prime_meats_invoices.zip' }], dataset: 'prime-meats', answersKey: 'pq-file-primemeats',
        questions: [{ label: 'Invoice lines after cleaning (no TOTAL row, no duplicated line)' }, { label: 'Total spend with Prime Meats in July 2026' }, { label: 'Beef mince: % change in average price per kg, May → June (weighted: total ÷ kg)', percent: true, tolerance: 0.5 }, { label: 'Site that bought the most beef mince (kg) in August', accept: ['Olive & Ember Riverside', 'Riverside'] }],
        hints: ['June renames Qty → Quantity, writes dates DD/MM/YYYY and uses CAPITALS; July pads product names with spaces and adds a TOTAL row; August repeats one invoice line.', 'Standardise: rename columns, Trim + Capitalize Each Word, date Using Locale, filter TOTAL, then Remove Duplicates on all columns. Average price = SUM(LineTotal) ÷ SUM(Qty), not the average of UnitPrice.'],
        explain: 'Finance\'s suspicion was right: beef mince is ~22–23% dearer from June. Note the method: a weighted average price, after a careful clean. Otherwise capitals and spaces split "Beef mince" into three products.' },
    ],
    quiz: [
      { id: 'pq-merge-q1', type: 'mc', difficulty: 2, concept: 'pq-merge', prompt: 'A merge on StoreCode leaves 35 rows with null store names. They all have "w02" in lowercase. Why?', options: ['Merges ignore lowercase', 'Power Query merges are case-sensitive, so "w02" ≠ "W02"', 'The stores table is too small', 'Nulls are normal after a merge'], answer: 1, explain: 'Uppercase (and Trim) the key in both tables before merging.' },
      { id: 'pq-merge-q2', type: 'mc', difficulty: 2, concept: 'pq-merge', prompt: 'Merge with Join Kind "Left Anti" returns…', options: ['All rows from both tables', 'Rows in the left table that have a match', 'Rows in the left table with no match in the right table', 'Rows in the right table with no match'], answer: 2, explain: 'Left Anti = "what in my table is missing from the other one?"' },
      { id: 'pq-merge-q3', type: 'tf', difficulty: 2, concept: 'pq-merge', prompt: 'True or false: you can merge on two columns at once (e.g. StoreCode + Month).', answer: true, explain: 'Ctrl-click the columns in the same order in both tables: a composite key.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-merge-c1', front: 'Find rows in table A that are missing from table B in Power Query?', back: 'Merge A with B using Join Kind = Left Anti.' },
      { id: 'pq-merge-c2', kind: 'debug', front: 'A merge matches fewer rows than expected. Three things to check?', back: 'Case (merges are case-sensitive), extra spaces, and data types (text vs number).' },
    ],
  },

  {
    id: 'pq-reshape', skill: 'pq', level: 'Intermediate', title: 'Group By, Pivot & Unpivot', minutes: 14, prereqs: ['pq-append'],
    summary: 'Summarise inside Power Query, and fix "wide" tables that Excel people love.',
    lesson: `
### Group By
Transform → **Group By**: e.g. by StoreCode and Month → Sum of NetSales, Count Rows. It's like a PivotTable, but the result is a table you can keep transforming.

### Wide vs long
Budgets and targets are often **wide**: one column per month.

| Dept | Jan | Feb | Mar |
|---|---|---|---|
| Sales | 100 | 110 | 120 |

Analysis tools want **long** (tidy) data: one row per Dept and Month.

| Dept | Month | Budget |
|---|---|---|
| Sales | Jan | 100 |

### Unpivot
Select the column(s) that **identify** a row (Dept) → right-click → **Unpivot Other Columns**. Rename *Attribute* → Month and *Value* → Budget.

Why "Other Columns"? Next year, when "Jan-27" is added, it's unpivoted automatically. "Unpivot **Only Selected** Columns" hard-codes the month names and silently ignores new ones.

### Pivot
The reverse: long → wide (Transform → Pivot Column). Useful for presentation, rarely for analysis.`,
    tryIt: {
      id: 'pq-reshape-try', type: 'mc', difficulty: 2, concept: 'pq-unpivot',
      prompt: 'A targets table has Region, Jan, Feb, … Dec. You want Region | Month | Target. You select **Region**, then…',
      options: ['Unpivot Other Columns', 'Pivot Column', 'Unpivot Only Selected Columns', 'Transpose'], answer: 0,
      hints: ['Keep the identifier, turn everything else into rows.'],
      explain: 'Unpivot Other Columns keeps Region and turns every other column (all months, including future ones) into Month/Target rows.',
    },
    practice: [
      { id: 'pq-reshape-p1', type: 'numbers', title: 'Unpivot the budget', difficulty: 3, concept: 'pq-unpivot', business: 'Finance', minutes: 20,
        context: 'Finance keeps the 2026 budget in a wide sheet with two title rows. You need it long, so it can be matched to actual spend by month.',
        prompt: 'Load the workbook in Power Query, remove the title rows, promote headers, unpivot the months, and answer.',
        files: [{ label: 'department_budget_2026_wide.xlsx', path: 'powerquery/department_budget_2026_wide.xlsx' }], dataset: 'budget-wide', answersKey: 'pq-file-budget',
        questions: [{ label: 'Rows after unpivoting' }, { label: 'Total budget for Q3 (Jul–Sep), all departments' }, { label: 'Department with the largest Q4 budget' }, { label: 'IT\'s total 2026 budget' }],
        hints: ['Remove Top Rows (2) → Use First Row as Headers → select Department → Unpivot Other Columns.', 'Then Group By Department, or filter Month in (Jul, Aug, Sep), and sum.'],
        explain: '7 departments × 12 months = 84 rows. Once it\'s long, every question is a simple filter + sum.' },
    ],
    quiz: [
      { id: 'pq-reshape-q1', type: 'mc', difficulty: 3, concept: 'pq-unpivot', prompt: 'You used "Unpivot Only Selected Columns" on Jan..Dec. Next year a "Jan-27" column appears. On refresh…', options: ['It is unpivoted automatically', 'It stays a separate column and is not unpivoted', 'The query stops with an error', 'Power Query asks you what to do'], answer: 1, explain: 'Only Selected hard-codes the list. Unpivot Other Columns is the refresh-proof choice.' },
      { id: 'pq-reshape-q2', type: 'mc', difficulty: 2, concept: 'pq-group', prompt: 'Which step gives total NetSales per store per month inside Power Query?', options: ['Group By StoreCode and Month, Sum of NetSales', 'Pivot Column', 'Merge Queries', 'Fill Down'], answer: 0, explain: 'Group By with several grouping columns and a Sum aggregation.' },
      { id: 'pq-reshape-q3', type: 'tf', difficulty: 2, concept: 'pq-unpivot', prompt: 'True or false: long (tidy) data is usually easier to analyse than wide data.', answer: true, explain: 'One row per observation makes filtering, grouping, charts and joins straightforward.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-reshape-c1', front: 'Wide months → one Month column in Power Query?', back: 'Select the ID column(s) → Unpivot Other Columns → rename Attribute/Value.' },
    ],
  },

  {
    id: 'pq-custom', skill: 'pq', level: 'Intermediate', title: 'Conditional & custom columns, parameters', minutes: 12, prereqs: ['pq-reshape', 'pq-merge'],
    summary: 'Add your own logic, and make queries configurable and reusable.',
    lesson: `
### Conditional Column (no code)
Add Column → **Conditional Column**: if NetSales ≥ 1000 then "Big" else "Small". It's IF logic with a form.

### Custom Column (a little formula)
Add Column → **Custom Column**:
\`\`\`
[Units] * [UnitPrice]
if [Status] = "Cancelled" then 0 else [NetSales]
Text.Upper(Text.Trim([StoreCode]))
\`\`\`
Columns go in [square brackets]. M is case-sensitive: \`if … then … else\` must be lowercase.

### Parameters
Home → Manage Parameters → New: e.g. **FolderPath**. Use it in the Source step, and anyone can point the query at a different folder without opening the code.

### Reference vs Duplicate
- **Reference** a query: a new query that starts from the result of the first. Change the first, and both update. Use it to branch one clean base into several outputs.
- **Duplicate**: an independent copy.

### Refresh workflow
- Data → Refresh All (or set Refresh on open in the query properties)
- Keep raw files in a fixed folder; use parameters for paths
- After a refresh, glance at the row counts and totals`,
    tryIt: {
      id: 'pq-custom-try', type: 'fill', difficulty: 2, concept: 'pq-custom',
      prompt: 'Complete the Custom Column formula so cancelled orders count as 0: `if [Status] = "Cancelled" ____ 0 else [NetSales]`',
      answer: ['then'], hints: ['M uses if … then … else, in lowercase.'], explain: 'if [Status] = "Cancelled" then 0 else [NetSales]',
    },
    practice: [],
    quiz: [
      { id: 'pq-custom-q1', type: 'mc', difficulty: 2, concept: 'pq-custom', prompt: 'In a Custom Column, how do you refer to the column Units?', options: ['Units', '"Units"', '[Units]', '{Units}'], answer: 2, explain: 'Square brackets: [Units]. Quotes would make it a piece of text, and curly braces make a list.' },
      { id: 'pq-custom-q2', type: 'mc', difficulty: 3, concept: 'pq-robust', prompt: 'You want 3 different reports from one cleaned table, and fixes to the cleaning should flow to all 3. You should…', options: ['Duplicate the clean query 3 times', 'Reference the clean query 3 times', 'Copy-paste the data into 3 sheets', 'Build 3 separate folder imports'], answer: 1, explain: 'Referenced queries start from the base query\'s result, so fixes flow downstream.' },
      { id: 'pq-custom-q3', type: 'tf', difficulty: 2, concept: 'm-code', prompt: 'True or false: in M, IF can be written in capitals (IF … THEN … ELSE).', answer: false, explain: 'M is case-sensitive: if … then … else must be lowercase. Function names like Text.Upper are case-sensitive too.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-custom-c1', front: 'Reference vs Duplicate a query?', back: 'Reference starts from the original\'s result (changes flow through). Duplicate is an independent copy.' },
    ],
  },

  // =========================================================================== ADVANCED
  {
    id: 'pq-m', skill: 'pq', level: 'Advanced', title: 'A first look at M code', minutes: 15, prereqs: ['pq-custom'],
    summary: 'Read the code behind your clicks, and make queries that survive changing files.',
    lesson: `
### Every click writes M
Home → **Advanced Editor** shows the whole query:
\`\`\`
let
    Source   = Csv.Document(File.Contents(FolderPath & "sales.csv"), [Delimiter=","]),
    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Promoted, {{"Units", Int64.Type}}),
    Filtered = Table.SelectRows(Typed, each [Units] > 0)
in
    Filtered
\`\`\`
- **let** lists the steps; each step is a name = an expression that uses the previous step
- **in** says which step is the result
- \`each [Units] > 0\` is a small function applied to every row

### Why touch the code?
The GUI writes **hard-coded** steps. When the source changes, they break. Small edits make queries robust:

| Fragile | Robust |
|---|---|
| \`Table.RemoveColumns(t, {"Notes"})\` errors when Notes is gone | add \`MissingField.Ignore\` |
| \`Table.SelectColumns(t, {...})\` errors on a missing column | add \`MissingField.UseNull\` |
| Remove Top Rows(2) | \`Table.Skip(t, each [Column1] <> "Date")\`: skip until the header |
| Changed Type on every column | type only the columns you use |

### Handling errors
\`try Number.From([Qty]) otherwise null\`: a failed conversion becomes null instead of an error.

### Custom functions
Turn a query into a function: \`(file as binary) => let … in …\`, then apply it to every file in a folder. That's what "Combine Files" builds for you.`,
    tryIt: {
      id: 'pq-m-try', type: 'mc', difficulty: 3, concept: 'm-code',
      prompt: 'In `let A = …, B = …, C = … in B`, what does the query return?',
      options: ['Step A', 'Step B', 'Step C', 'All three steps'], answer: 1,
      hints: ['What follows "in" is the output.'], explain: 'The in part names the result. C is calculated only if something needs it.',
    },
    practice: [],
    quiz: [
      { id: 'pq-m-q1', type: 'mc', difficulty: 3, concept: 'pq-robust', prompt: 'Which change makes a Remove Columns step survive a file that no longer has that column?', options: ['Add MissingField.Ignore to Table.RemoveColumns', 'Wrap the step in IFERROR like Excel', 'Sort the table before removing', 'Nothing: the step will always fail'], answer: 0, explain: 'Table.RemoveColumns(t, {"Notes"}, MissingField.Ignore)' },
      { id: 'pq-m-q2', type: 'mc', difficulty: 3, concept: 'm-code', prompt: 'What does `each [Units] > 0` mean in Table.SelectRows?', options: ['A loop that runs zero times for Units', 'A function run on every row, keeping rows where Units > 0', 'Sort the table by Units, largest first', 'Rename the Units column for each row'], answer: 1, explain: 'each … is shorthand for a one-argument function applied row by row.' },
      { id: 'pq-m-q3', type: 'fill', difficulty: 3, concept: 'm-code', prompt: 'Complete: `___ Number.From([Qty]) otherwise null` turns conversion errors into null.', answer: ['try'], explain: 'try … otherwise … is M\'s error handling.' },
      { id: 'pq-m-q4', type: 'tf', difficulty: 3, concept: 'm-code', prompt: 'True or false: you must write M by hand to use Power Query.', answer: false, explain: 'The GUI writes it for you. M is for when you need robustness or logic the buttons don\'t offer.' },
    ],
    challenge: null,
    cards: [
      { id: 'pq-m-c1', front: 'What does the `in` part of a query mean?', back: 'It names the step whose result the query returns.' },
      { id: 'pq-m-c2', front: 'Skip title lines of any length in M?', back: 'Table.Skip(Source, each [Column1] <> "Date"): skip rows until the header row.' },
    ],
  },
];
