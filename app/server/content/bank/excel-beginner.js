// Extra Excel Beginner questions. Every question names the topic it belongs to and explains
// the answer, including why the tempting wrong answers are wrong.
export const EXCEL_BEGINNER = [
  // ---------------------------------------------------------------- xl-basics
  {
    id: 'b-xl-basics-01', topic: 'xl-basics', type: 'mc', difficulty: 1, concept: 'cell-refs',
    prompt: 'You wrote `=B2*C2` in D2 and copied it down to D50. What does D50 contain?',
    options: ['`=B2*C2`', '`=B50*C50`', '`=B2*C50`', 'An error, because you cannot copy formulas'],
    answer: 1,
    explain: 'Plain references like B2 are **relative**: copying down 48 rows moves them down 48 rows. That is exactly what you want when every row does the same calculation.',
  },
  {
    id: 'b-xl-basics-02', topic: 'xl-basics', type: 'mc', difficulty: 2, concept: 'cell-refs',
    prompt: 'The VAT rate sits in **G1**. In D2 you write `=C2*G1` and copy it down. Row 3 shows 0 and row 4 shows a #VALUE! error. What went wrong?',
    options: [
      'G1 must be text',
      'The reference to G1 moved down with the formula: row 3 reads G2, row 4 reads G3',
      'You cannot multiply by a percentage',
      'Excel needs the rate written as 0.2 not 20%',
    ],
    answer: 1,
    explain: 'G1 is relative, so it slid down to G2, G3... which are empty or contain labels. Lock it as `$G$1` and every row reads the same cell.',
    mistake: 'Forgot to lock a rate cell with $',
  },
  {
    id: 'b-xl-basics-03', topic: 'xl-basics', type: 'tf', difficulty: 1, concept: 'cell-refs',
    prompt: 'True or false: typing `=250*1.2` in a cell is just as good as `=B2*C2` when the numbers are known.',
    answer: false,
    explain: 'It gives the right number today and the wrong number tomorrow. When the data changes, a typed-in number does not update, and nobody can see where 250 came from. Point at cells.',
  },
  {
    id: 'b-xl-basics-04', topic: 'xl-basics', type: 'mc', difficulty: 2, concept: 'cell-refs',
    prompt: 'What is the difference between `$B2` and `B$2` when you copy a formula?',
    options: [
      'There is none, the $ is decoration',
      '`$B2` keeps the column fixed and lets the row move; `B$2` keeps the row fixed and lets the column move',
      '`$B2` keeps the row fixed; `B$2` keeps the column fixed',
      'Both lock the whole reference',
    ],
    answer: 1,
    explain: 'The `$` locks whatever comes straight after it. `$B` locks the column, `$2` locks the row. This is what makes one formula fill a whole grid correctly.',
  },
  {
    id: 'b-xl-basics-05', topic: 'xl-basics', type: 'mc', difficulty: 2, concept: 'basic-agg',
    prompt: 'Column B holds 10 sales figures and two blank cells. `=AVERAGE(B2:B13)` returns 480. How did Excel treat the blanks?',
    options: ['As zeros, so the average is dragged down', 'It ignored them and divided by 10', 'It returned an error', 'It used the row above'],
    answer: 1,
    explain: 'AVERAGE skips truly blank cells and divides by the count of numbers. Careful: a cell containing 0 **is** counted, and that does drag the average down. Blank and zero are not the same thing.',
  },
  {
    id: 'b-xl-basics-06', topic: 'xl-basics', type: 'order', difficulty: 2, concept: 'cell-refs',
    prompt: 'Put these in the order Excel calculates them in `=A1+B1*C1^2`.',
    options: ['C1^2 (the power)', 'B1 × the result (multiplication)', 'A1 + the result (addition)'],
    answer: [0, 1, 2],
    explain: 'Powers, then multiply/divide, then add/subtract. If you meant to add first, use brackets: `=(A1+B1)*C1^2`.',
  },

  // ---------------------------------------------------------------- xl-logic
  {
    id: 'b-xl-logic-01', topic: 'xl-logic', type: 'mc', difficulty: 2, concept: 'if-logic',
    prompt: 'Which formula flags orders **over 500 that were paid late**?',
    options: [
      '`=IF(OR(B2>500,C2="Late"),"Flag","")`',
      '`=IF(AND(B2>500,C2="Late"),"Flag","")`',
      '`=IF(B2>500,"Flag",IF(C2="Late","Flag",""))`',
      '`=AND(B2>500,C2="Late")`',
    ],
    answer: 1,
    explain: '"And" means both must be true, so AND. Option 1 and 3 both flag an order that is merely large **or** merely late. Option 4 returns TRUE/FALSE rather than the word you asked for.',
  },
  {
    id: 'b-xl-logic-02', topic: 'xl-logic', type: 'mc', difficulty: 2, concept: 'if-logic',
    prompt: 'A colleague wrote `=IF(B2>100,"High",IF(B2>50,"Medium","Low"))`. What does it return when B2 is 100?',
    options: ['"High"', '"Medium"', '"Low"', '#VALUE!'],
    answer: 1,
    explain: '100 is not greater than 100, so the first test fails; 100 **is** greater than 50, so it lands on "Medium". Boundary values are where this kind of formula goes wrong: decide whether you mean `>` or `>=` and say so.',
  },
  {
    id: 'b-xl-logic-03', topic: 'xl-logic', type: 'mc', difficulty: 2, concept: 'if-logic',
    prompt: 'Nested IFs for grades keep returning the wrong band: everything shows "A". The formula is `=IF(B2>50,"A",IF(B2>70,"B",IF(B2>90,"C","D")))`. What is wrong?',
    options: [
      'IF cannot be nested more than two levels deep',
      'The bands are tested in the wrong order, so the loosest test catches everything first',
      'The text results need single quotes, not double',
      'Each test needs to be wrapped in its own AND()',
    ],
    answer: 1,
    explain: 'A score of 95 hits `>50` first and stops there. Nested IFs are checked top to bottom, so the tightest band must come first: `>90`, then `>70`, then `>50`.',
    mistake: 'Nested IF bands tested in the wrong order',
  },
  {
    id: 'b-xl-logic-04', topic: 'xl-logic', type: 'tf', difficulty: 2, concept: 'if-logic',
    prompt: 'True or false: `=IF(B2="","Missing","Present")` treats a cell holding a single space as missing.',
    answer: false,
    explain: 'A space is a character, so the cell is not empty and the formula says "Present". This is why imported data needs TRIM. `=IF(TRIM(B2)="","Missing","Present")` is the safer test.',
  },
  {
    id: 'b-xl-logic-05', topic: 'xl-logic', type: 'mc', difficulty: 3, concept: 'if-logic',
    prompt: 'Which is the cleanest way to write "if the region is West or North, 10% bonus, otherwise 5%"?',
    options: [
      '`=IF(OR(B2="West",B2="North"),0.1,0.05)`',
      '`=IF(B2="West",0.1,IF(B2="North",0.1,0.05))`',
      '`=IF(B2="West" OR B2="North",0.1,0.05)`',
      '`=IF(B2=OR("West","North"),0.1,0.05)`',
    ],
    answer: 0,
    explain: 'OR takes the conditions as its arguments. Option 2 works but repeats itself. Options 3 and 4 are not valid Excel: OR is a function, not a word you can drop into a comparison.',
  },

  // ---------------------------------------------------------------- xl-countif
  {
    id: 'b-xl-countif-01', topic: 'xl-countif', type: 'mc', difficulty: 2, concept: 'countif-sumif',
    prompt: 'You want the total revenue for the West region. Region is in column B, revenue in column D. Which is right?',
    options: ['`=SUMIF(D:D,"West",B:B)`', '`=SUMIF(B:B,"West",D:D)`', '`=SUMIFS(B:B,"West",D:D)`', '`=SUM(IF(B:B="West",D:D))`'],
    answer: 1,
    explain: 'SUMIF reads: where do I look, what am I looking for, what do I add up. So `SUMIF(region, "West", revenue)`. Note SUMIFS takes them the other way round, which is a common trip-up.',
  },
  {
    id: 'b-xl-countif-02', topic: 'xl-countif', type: 'mc', difficulty: 2, concept: 'countif-sumif',
    prompt: 'What does `=COUNTIF(B2:B100,">="&D1)` count?',
    options: [
      'Cells containing the literal text ">=D1"',
      'Cells whose value is greater than or equal to whatever is in D1',
      'Nothing, this is not valid',
      'Cells equal to D1 only',
    ],
    answer: 1,
    explain: 'The `&` joins the operator to the value in D1 to build the condition text, for example ">=500". Writing `">=D1"` without the `&` would look for that literal text and count nothing.',
  },
  {
    id: 'b-xl-countif-03', topic: 'xl-countif', type: 'mc', difficulty: 2, concept: 'count-types',
    prompt: 'Column C has 200 rows: 180 numbers, 12 text notes and 8 blanks. What does `=COUNT(C1:C200)` return?',
    options: ['200', '192', '180', '188'],
    answer: 2,
    explain: 'COUNT counts numbers only. COUNTA would give 192 (everything not blank), and COUNTBLANK would give 8. Picking the wrong one silently changes every average you build on it.',
  },
  {
    id: 'b-xl-countif-04', topic: 'xl-countif', type: 'tf', difficulty: 2, concept: 'countif-sumif',
    prompt: 'True or false: `=COUNTIF(B:B,"north")` will miss rows that say "North".',
    answer: false,
    explain: 'COUNTIF is not case sensitive, so "north", "North" and "NORTH" all match. What it will miss is "North " with a trailing space, or "N. North". Case is safe; stray characters are not.',
  },
  {
    id: 'b-xl-countif-05', topic: 'xl-countif', type: 'mc', difficulty: 3, concept: 'countif-sumif',
    prompt: 'A sales report should count orders from any city starting with "San". Which condition does that?',
    options: ['`"San"`', '`"San*"`', '`"*San*"`', '`"=San"`'],
    answer: 1,
    explain: 'The asterisk stands for any number of characters, so "San*" matches San Diego and San Jose. "*San*" would also match "Santiago de Cuba" **and** anything containing "san" anywhere, such as "Busan".',
  },

  // ---------------------------------------------------------------- xl-textdates
  {
    id: 'b-xl-textdates-01', topic: 'xl-textdates', type: 'mc', difficulty: 2, concept: 'text-numbers',
    prompt: 'A column of numbers imported from a system sits left-aligned and SUM returns 0. What is the most likely cause?',
    options: ['The cells are formatted as currency', 'The values are text, not numbers', 'The column is too narrow', 'SUM cannot handle more than 100 rows'],
    answer: 1,
    explain: 'Excel left-aligns text and right-aligns numbers by default, so left-aligned "numbers" are a giveaway. SUM ignores text. Fix it with VALUE, Text to Columns, or a multiply-by-1 paste special.',
  },
  {
    id: 'b-xl-textdates-02', topic: 'xl-textdates', type: 'mc', difficulty: 2, concept: 'text-funcs',
    prompt: 'Product codes look like `NW-4821-XL`. Which formula pulls out `4821`?',
    options: ['`=MID(A2,4,4)`', '`=LEFT(A2,4)`', '`=RIGHT(A2,4)`', '`=MID(A2,3,4)`'],
    answer: 0,
    explain: 'MID(text, start, length). The digits start at position 4 (N=1, W=2, -=3, 4=4) and run for 4 characters. Counting positions carefully is the whole skill here.',
  },
  {
    id: 'b-xl-textdates-03', topic: 'xl-textdates', type: 'mc', difficulty: 2, concept: 'dates',
    prompt: 'A date column shows values like 45292 instead of dates. What happened?',
    options: [
      'The file was damaged when it was exported',
      'The cells are formatted as General, so you see the underlying serial number',
      'The dates were typed in the wrong century',
      'Excel cannot read dates written in that format',
    ],
    answer: 1,
    explain: 'Excel stores a date as the number of days since 1899-12-30. The value is fine; only the format is wrong. Change the cell format to a date and it reads normally again.',
  },
  {
    id: 'b-xl-textdates-04', topic: 'xl-textdates', type: 'tf', difficulty: 2, concept: 'dates',
    prompt: 'True or false: subtracting two dates in Excel gives you the number of days between them.',
    answer: true,
    explain: 'Because dates are numbers underneath, `=B2-A2` gives whole days. Format the answer as a number, not a date, or Excel will show you "January 1900" style nonsense.',
  },
  {
    id: 'b-xl-textdates-05', topic: 'xl-textdates', type: 'mc', difficulty: 3, concept: 'text-funcs',
    prompt: 'You need the part of an email address before the `@`. Which formula works for any length of name?',
    options: [
      '`=LEFT(A2,8)`',
      '`=LEFT(A2,FIND("@",A2)-1)`',
      '`=MID(A2,1,FIND("@",A2))`',
      '`=RIGHT(A2,FIND("@",A2))`',
    ],
    answer: 1,
    explain: 'FIND returns the position of the @, and you take everything up to one character before it. Option 3 is nearly right but keeps the @ itself.',
  },

  // ---------------------------------------------------------------- xl-cleaning
  {
    id: 'b-xl-cleaning-01', topic: 'xl-cleaning', type: 'mc', difficulty: 2, concept: 'cleaning',
    prompt: 'Two customer names look identical on screen but a lookup only finds one of them. What should you suspect first?',
    options: ['A corrupted file', 'Trailing spaces or non-printing characters', 'Too many rows', 'The wrong Excel version'],
    answer: 1,
    explain: '"Acme Ltd" and "Acme Ltd " are different strings. TRIM removes leading, trailing and repeated inner spaces; CLEAN removes non-printing characters that come from web or PDF exports.',
  },
  {
    id: 'b-xl-cleaning-02', topic: 'xl-cleaning', type: 'mc', difficulty: 2, concept: 'cleaning',
    prompt: 'What is the main practical benefit of turning a range into an Excel Table (Ctrl+T)?',
    options: [
      'It makes the workbook noticeably smaller on disk',
      'Formulas, charts and PivotTables that point at it grow automatically when rows are added',
      'It locks the data so nobody can edit it',
      'It converts numbers stored as text into real numbers',
    ],
    answer: 1,
    explain: 'A Table has a name and a range that expands. A formula written as `=SUM(Sales[Revenue])` keeps working after new rows arrive, which is what stops reports quietly going stale.',
  },
  {
    id: 'b-xl-cleaning-03', topic: 'xl-cleaning', type: 'tf', difficulty: 2, concept: 'cleaning',
    prompt: 'True or false: Remove Duplicates compares only the columns you tick in the dialog.',
    answer: true,
    explain: 'That is both the power and the danger. Tick only "Email" and you delete genuinely different orders that share an email. Tick every column and you only remove rows that are identical everywhere.',
    mistake: 'Removed duplicates on too few columns',
  },
  {
    id: 'b-xl-cleaning-04', topic: 'xl-cleaning', type: 'mc', difficulty: 2, concept: 'cleaning',
    prompt: 'Before deleting rows that look like duplicates, what is the safest first step?',
    options: [
      'Delete them and undo if it looks wrong',
      'Count them first (for example with COUNTIF) and check a few by hand',
      'Sort the data',
      'Save the file under a new name and delete anyway',
    ],
    answer: 1,
    explain: 'Know how many you are about to lose and why. A count plus a spot check catches the case where "duplicates" are really two separate orders on the same day.',
  },
  {
    id: 'b-xl-cleaning-05', topic: 'xl-cleaning', type: 'mc', difficulty: 3, concept: 'cleaning',
    prompt: 'A "Revenue" column mixes `1,234.50`, `1234.5` and `£1,234.50`. Which approach is most reliable for the whole column?',
    options: [
      'Fix each cell by hand, one row at a time',
      'Strip symbols and separators, then convert the whole column to numbers',
      'Change the cell format to Currency',
      'Use ROUND on the column to tidy the values',
    ],
    answer: 1,
    explain: 'Formatting changes only what you see, not what the cell holds, so text stays text. The values have to be converted. Doing it in one repeatable step (Text to Columns, or Power Query) beats editing cells one by one.',
  },
];
