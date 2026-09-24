// Excel practice tasks added to the original Excel topics. Formula tasks are graded by the
// calculator; file tasks against numbers computed from the files (tools/data/answers-excel.js).
const PHONES = ['0428 299 4190', '+44 7526 812918', '0910 919 5909', '+44 346 539 2478', '0870 671 0410', '+44 1463 683884'];

export const EXCEL_PRACTICE = [
  {
    id: 'xl-cleaning-p2', topic: 'xl-cleaning', type: 'formula', title: 'One format for phone numbers', difficulty: 2, concept: 'cleaning', business: 'Marketing', minutes: 8,
    context: 'The text-message tool rejects numbers with spaces or a +44 country code. It needs 11 digits starting with 0.',
    prompt: 'In **B2**, turn the phone number in A2 into that format: remove the spaces, then replace "+44" with "0". Copy down to B7.',
    grid: { rows: [['Phone (as typed)', 'Phone (clean)'], ...PHONES.map((p) => [p, null])] },
    target: 'B2', fillTo: 'B7', answer: '=SUBSTITUTE(SUBSTITUTE(A2," ",""),"+44","0")',
    hints: ['SUBSTITUTE(text, old, new) replaces every occurrence. Nest one inside the other.', 'Remove spaces first: SUBSTITUTE(A2," ",""). Then wrap it: SUBSTITUTE(…, "+44", "0").'],
    explain: '"+44 7526 812918" becomes "07526812918". The result stays text, which is right: a phone number is a label, and a number format would drop the leading zero.',
  },
  {
    id: 'xl-indexmatch-p2', topic: 'xl-indexmatch', type: 'formula', title: 'Shipping rate by weight and zone', difficulty: 3, concept: 'index-match', business: 'Logistics', minutes: 10,
    context: 'The courier\'s rate card has weight bands down the side and delivery zones across the top.',
    prompt: 'In **I2**, return the rate for the parcel\'s weight band (G2) and zone (H2) from the rate card A1:E6. Copy down to I6.',
    grid: { rows: [
      ['Weight band', 'Zone A', 'Zone B', 'Zone C', 'Zone D', null, 'Band', 'Zone', 'Rate'],
      ['0-1 kg', 4.2, 5.1, 6.4, 8.9, null, '2-5 kg', 'Zone C', null],
      ['1-2 kg', 5.3, 6.2, 7.8, 10.5, null, '0-1 kg', 'Zone A', null],
      ['2-5 kg', 7.9, 9.4, 11.6, 15.2, null, '10-20 kg', 'Zone D', null],
      ['5-10 kg', 11.5, 13.8, 16.9, 22.4, null, '5-10 kg', 'Zone B', null],
      ['10-20 kg', 16.8, 19.9, 24.5, 31.7, null, '1-2 kg', 'Zone D', null],
    ] },
    target: 'I2', fillTo: 'I6', answer: '=INDEX($B$2:$E$6,MATCH(G2,$A$2:$A$6,0),MATCH(H2,$B$1:$E$1,0))',
    hints: ['One MATCH finds the row (band in A2:A6), another finds the column (zone in B1:E1).', '=INDEX($B$2:$E$6, MATCH(G2,$A$2:$A$6,0), MATCH(H2,$B$1:$E$1,0)). Lock the ranges before copying.'],
    explain: 'The first parcel (2-5 kg, Zone C) costs 11.6; the last (1-2 kg, Zone D) costs 10.5. A nested XLOOKUP works too: XLOOKUP(G2, $A$2:$A$6, XLOOKUP(H2, $B$1:$E$1, $B$2:$E$6)).',
  },
  {
    id: 'xl-pivots-p2', topic: 'xl-pivots', type: 'numbers', title: 'Channel mix by region', difficulty: 3, concept: 'pivot', business: 'Retail', minutes: 25,
    files: [{ label: 'regional_sales_2026.xlsx', path: 'excel/regional_sales_2026.xlsx' }], dataset: 'regional-sales',
    skills_tested: ['pivot', 'metric-choice'],
    context: 'The head of sales wants to know which region relies most on online sales, and how much the stores sold in the second quarter.',
    prompt: 'Build a PivotTable on the Orders data: Region in Rows, Channel in Columns, Sum of Revenue in Values. Use **Show Values As → % of Row Total** for the share, then a second pivot (or a filter) for the quarter.',
    questions: [
      { label: 'Region with the highest share of revenue from Online orders' },
      { label: 'That region\'s Online share of its revenue', unit: '%', percent: true, tolerance: 0.1 },
      { label: 'Store revenue in Q2 2026 (April to June), all regions', unit: '$' },
    ],
    answersKey: 'xl-regional-pivot',
    hints: [
      '% of Row Total divides each cell by its region\'s total, which is the share you need.',
      'For Q2, put Order Date in Rows and group it by Quarters (right-click → Group), or filter the dates from 1 April to 30 June.',
    ],
    explain: 'Comparing shares, not totals, is what reveals dependence on a channel: a big region can have a high online total with a modest share. The same pivot with Show Values As turns one table into both answers.',
  },
  {
    id: 'xl-pivots-p3', topic: 'xl-pivots', type: 'numbers', title: 'Search ads by month and campaign', difficulty: 3, concept: 'pivot', business: 'Marketing', minutes: 20,
    files: [{ label: 'harbor_pine_ads.zip (use search_ads_2026-Q2.csv)', path: 'harbor_pine_ads.zip' }], dataset: 'harbor-pine-ads',
    skills_tested: ['pivot'],
    context: 'Harbor & Pine\'s marketing lead wants a quick view of Q2 search advertising: spend by month and value by campaign.',
    prompt: 'Open **search_ads_2026-Q2.csv** in Excel, turn it into a Table, and build a PivotTable. Group the dates by month.',
    questions: [
      { label: 'Search spend in June 2026', unit: '$' },
      { label: 'Campaign with the highest conversion value (the name after "|")' },
      { label: 'Brand Search\'s share of all search spend', unit: '%', percent: true, tolerance: 0.1 },
    ],
    answersKey: 'xl-search-pivot',
    hints: [
      'Dates → Rows, then right-click a date → Group → Months. Cost → Values as Sum.',
      'Campaign → Rows and ConvValue → Values, sorted largest to smallest.',
      'Show Values As → % of Grand Total on Cost gives each campaign\'s share of spend.',
    ],
    explain: 'Brand Search brings in the most conversion value on about 15% of the spend: people already looking for the shop convert well and cheaply. That is a useful caveat when someone suggests cutting "the small campaign".',
  },
];
