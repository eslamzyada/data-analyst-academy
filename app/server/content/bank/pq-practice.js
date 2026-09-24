// Power Query practice tasks and challenges for the original Power Query topics. Every number is
// computed from the files the learner downloads (tools/data/answers-pq.js), after the cleaning the
// task describes.
const POS = [
  { label: 'cedarline_pos_exports.zip (3 monthly files)', path: 'cedarline_pos_exports.zip' },
  { label: 'stores.csv', path: 'powerquery/stores.csv' },
  { label: 'store_targets_summer_2026.csv', path: 'powerquery/store_targets_summer_2026.csv' },
];
const CRM = [{ label: 'crm_contacts_export.csv', path: 'powerquery/crm_contacts_export.csv' }];
const ADS = [{ label: 'harbor_pine_ads.zip (2 exports + campaign register)', path: 'harbor_pine_ads.zip' }];
const SURVEY = [{ label: 'bright_wells_school_survey.xlsx', path: 'powerquery/bright_wells_school_survey.xlsx' }];
const PRIME = [{ label: 'prime_meats_invoices.zip (4 monthly files)', path: 'prime_meats_invoices.zip' }];
const SWIFT = [{ label: 'swiftline_depot_exports.zip', path: 'swiftline_depot_exports.zip' }];

export const PQ_PRACTICE = [
  // ---------------------------------------------------------------- types and locale
  {
    id: 'pq-types-p1', topic: 'pq-types', type: 'numbers', title: 'The July file that moves days', difficulty: 2, concept: 'locale', business: 'Retail', minutes: 20,
    files: [{ label: 'POS_Summary_2026-07.csv', path: 'powerquery/cedarline_pos_exports/POS_Summary_2026-07.csv' }], dataset: 'pos-exports',
    skills_tested: ['locale', 'pq-types', 'data-quality'],
    context: 'Cedarline\'s July till export comes from a system set to UK format (day first). Before combining it with the other months, you want to know exactly what a careless type change would do to it.',
    prompt: 'Load **POS_Summary_2026-07.csv** on its own (Data → From Text/CSV → Transform Data). Remove the lines above the header and promote the headers. For questions 2 and 3, think about a plain **Change Type → Date** on a PC with US settings (month first), which reads 03/07/2026 as 7 March.',
    questions: [
      { label: 'Data rows in the July file (no title lines, no blank lines)' },
      { label: 'Rows a US-settings PC would silently read as a different, valid date' },
      { label: 'Rows that would become errors instead' },
      { label: 'July NetSales total, with the dates read correctly', unit: '$' },
      { label: 'Units sold in July (the column is called "Qty Sold" in this file)' },
    ],
    answersKey: 'pq-pos-july',
    hints: [
      'Remove Top Rows (3) takes out the two title lines and the empty line. The row count is in the status bar.',
      'Before changing the type, add a column with the first two characters of the Date text (Add Column → Extract → First Characters) and filter it: a day from 1 to 12 can be read as a month.',
      'A date such as 07/07/2026 reads the same either way round, so it does not move.',
    ],
    explain: 'Only the rows with a day of 13 or more (265) show up as errors. The other 124 misread rows turn into real-looking dates in other months, with no warning, and quietly leave July. That is why you use Change Type → Using Locale (English UK), and why you check the monthly total (here $69,462.10) after every type change.',
  },
  // ---------------------------------------------------------------- split
  {
    id: 'pq-split-p1', topic: 'pq-split', type: 'numbers', title: 'First names and phone numbers', difficulty: 2, concept: 'pq-split', business: 'Marketing', minutes: 20,
    files: CRM, dataset: 'crm-contacts',
    skills_tested: ['pq-split', 'pq-clean'],
    context: 'The campaign team wants to greet customers by first name and send text-message reminders. The CRM export writes names as "Last, First" and phone numbers in several formats.',
    prompt: 'Load crm_contacts_export.csv, remove blank rows and duplicate rows, then split **Full Name** into Last Name and First Name. Answer from the clean table (230 customers).',
    questions: [
      { label: 'Customers whose first name is Anna' },
      { label: 'Phone numbers written in international format (starting with +44)' },
      { label: 'Phone numbers that contain spaces' },
    ],
    answersKey: 'pq-crm-split',
    hints: [
      'Split Column → By Delimiter → Custom ", " (a comma and a space) → at the left-most delimiter.',
      'For the phone questions, use Text Filters → Begins With "+44", and Contains " " (a space), on the Phone column, then read the row count.',
      'Remove duplicates before counting: one customer appears twice.',
    ],
    explain: 'Splitting on ", " gives first names without a leading space. The phone column shows the next job before any text campaign: 23 international and 46 spaced numbers need one standard format (remove spaces, replace +44 with 0).',
  },
  // ---------------------------------------------------------------- cleaning
  {
    id: 'pq-clean-p2', topic: 'pq-clean', type: 'numbers', title: 'Rebuild the roster clean-up', difficulty: 3, concept: 'pq-clean', business: 'HR', minutes: 35,
    files: [{ label: 'brightpath_roster_messy.xlsx', path: 'excel/brightpath_roster_messy.xlsx' }], dataset: 'brightpath-roster',
    skills_tested: ['pq-clean', 'pq-types', 'duplicates'],
    context: 'Brightpath\'s HR assistant cleans the roster export by hand every month. You will rebuild the cleaning in Power Query so next month\'s export takes one Refresh.',
    prompt: 'Load the **Roster** sheet of brightpath_roster_messy.xlsx in Power Query. Fix the names, standardise the departments, turn the salaries into numbers, read the hire dates, remove duplicate employees, and answer.',
    questions: [
      { label: 'Data rows in the raw Roster sheet (before removing anything)' },
      { label: 'Salary cells stored as text (like "$45,100") in the raw sheet' },
      { label: 'Unique employees in Customer Service (every spelling counts)' },
      { label: 'Total annual salary of all unique employees', unit: '$' },
      { label: 'Unique employees hired before 2015' },
    ],
    answersKey: 'pq-roster',
    hints: [
      'To count text salaries, add a Custom Column Value.Is([Salary], type text) and filter it. Then Replace Values "$" and "," with nothing and change the type to Whole Number.',
      'Department: Trim, lowercase, replace double spaces with one, then Replace Values for "ops", "cs" and "cust. service". The filter list shows every spelling left.',
      'Hire Date mixes real dates, YYYY-MM-DD text and DD/MM/YYYY text: Change Type → Using Locale (English UK) reads them all. Remove Duplicates on Employee ID last.',
    ],
    explain: 'The sheet has 145 rows but 140 employees: five rows were exported twice. Salaries stored as text would be skipped by a sum, and the department spellings split the headcount. The payroll only comes out right when every fix is in place, and a query keeps them in place next month.',
  },
  // ---------------------------------------------------------------- append
  {
    id: 'pq-append-p2', topic: 'pq-append', type: 'numbers', title: 'One table for two ad platforms', difficulty: 3, concept: 'pq-append', business: 'Marketing', minutes: 30,
    files: ADS, dataset: 'harbor-pine-ads',
    skills_tested: ['pq-append', 'pq-types', 'kpi'],
    context: 'Harbor & Pine, an online homeware shop, advertises on a search platform and a social platform. Each platform exports its own CSV with its own column names. The marketing lead wants one table for the quarter.',
    prompt: 'Load both ad exports. Rename the social columns to the search names (Day → Date, Campaign name → Campaign, Link clicks → Clicks, Amount spent (USD) → Cost, Purchases → Conversions, Purchase value → ConvValue), make Cost a number, and append the two tables.',
    questions: [
      { label: 'Rows in the appended table' },
      { label: 'Total ad spend in Q2', unit: '$' },
      { label: 'Total conversions (search conversions plus social purchases)' },
      { label: 'Return on ad spend for the quarter (conversion value ÷ spend)', tolerance: 0.02 },
    ],
    answersKey: 'pq-hp-append',
    hints: [
      'Rename before appending. Append matches columns by name, so "Cost" and "Amount spent (USD)" would become two half-empty columns.',
      'Amount spent is text such as "$1,234.56": Replace Values "$" and "," with nothing, then change the type to Decimal Number.',
      'Check: the appended table has as many rows as the two files together.',
    ],
    explain: 'Across both platforms Harbor & Pine spent about $73,363 and got back about $4.95 of sales for each $1. The two traps are the different column names, which silently split the data, and the dollar text, which stops Cost from adding up at all.',
  },
  // ---------------------------------------------------------------- merge
  {
    id: 'pq-merge-p2', topic: 'pq-merge', type: 'numbers', title: 'Match campaigns to the register', difficulty: 3, concept: 'pq-merge', business: 'Marketing', minutes: 30,
    files: ADS, dataset: 'harbor-pine-ads',
    skills_tested: ['pq-merge', 'pq-group', 'reconciliation'],
    context: 'Harbor & Pine\'s finance team keeps a campaign register with each campaign\'s channel, objective, owner and quarter budget. Every ad row should belong to a registered campaign.',
    prompt: 'Start from your appended ad table. Extract the campaign code (the text before " | ", in capitals), merge campaign_register.csv on the code, and answer.',
    questions: [
      { label: 'Spend on campaigns the register lists as Social', unit: '$' },
      { label: 'Spend on campaigns that are not in the register at all', unit: '$' },
      { label: 'Registered campaigns that spent more than their quarter budget' },
    ],
    answersKey: 'pq-hp-merge',
    hints: [
      'Add Column → Extract → Text Before Delimiter " | ", then Format → Trim and Format → UPPERCASE: one campaign is written in lowercase from May.',
      'Merge with Left Outer to keep every ad row. A second merge with Left Anti lists the rows that found no campaign.',
      'For budgets: Group By code with Sum of Cost, merge the register, and compare the two with a Custom Column.',
    ],
    explain: 'One social campaign was never registered, so its $2,746 disappears from any report built on the register\'s channels: that is why "Social" from the register is lower than the social export. Three registered campaigns overspent. A Left Anti merge is the quickest way to find this kind of gap.',
  },
  // ---------------------------------------------------------------- reshape
  {
    id: 'pq-reshape-p2', topic: 'pq-reshape', type: 'numbers', title: 'From a wide survey to a long table', difficulty: 3, concept: 'pq-unpivot', business: 'NGO', minutes: 25,
    files: SURVEY, dataset: 'bright-wells-survey',
    skills_tested: ['pq-unpivot', 'pq-split', 'missing-data'],
    context: 'Bright Wells, a small charity, records its school survey with one column per year and measure ("2024 Enrolled", "2024 Attending" and so on). The trustees want trends, and trends need a long table.',
    prompt: 'Load the **Survey** sheet, remove the two title rows, promote headers, select Village, Region and Programme Start, and **Unpivot Other Columns**. Split the Attribute column into Year and Measure, then answer.',
    questions: [
      { label: 'Rows straight after unpivoting' },
      { label: 'Children enrolled in 2026, all villages' },
      { label: 'Attendance rate in 2026 (attending ÷ enrolled)', unit: '%', percent: true, tolerance: 0.2 },
    ],
    answersKey: 'pq-bw-unpivot',
    hints: [
      'Unpivot skips empty cells, so you get fewer rows than villages × 6. Useful, but a missing survey then leaves no trace in the long table.',
      'Split Column → By Delimiter → Space → at the left-most delimiter: "2024 Enrolled" becomes 2024 and Enrolled.',
      'For the rate, filter Year = 2026, then Pivot Column on Measure (values: Value, Sum) to get Enrolled and Attending side by side.',
    ],
    explain: '36 villages × 6 columns would be 216 cells, but only 197 rows come out, because Unpivot drops blanks. Pivoting Measure back gives one row per village and year, the shape you need for rates.',
  },
  // ---------------------------------------------------------------- custom columns
  {
    id: 'pq-custom-p1', topic: 'pq-custom', type: 'numbers', title: 'How deep are the discounts?', difficulty: 3, concept: 'pq-custom', business: 'Restaurant', minutes: 25,
    files: [{ label: 'sales_daily.csv', path: 'restaurant/sales_daily.csv' }], dataset: 'olive-ember',
    skills_tested: ['pq-custom', 'pq-types'],
    context: 'Olive & Ember\'s managers can give discounts at the till. The owners suspect some lines are discounted heavily, and they also want to know how much the Airport site depends on weekends.',
    prompt: 'Load sales_daily.csv and keep 2026. Add a column that flags lines where Discount is more than 10% of Gross Sales, and a weekend flag from the date. Answer.',
    questions: [
      { label: 'Sales lines in 2026 with a discount above 10% of gross sales' },
      { label: 'Net sales on those lines', unit: '$' },
      { label: 'Airport: weekend (Saturday and Sunday) share of 2026 net sales', unit: '%', percent: true, tolerance: 0.2 },
    ],
    answersKey: 'pq-rest-discounts',
    hints: [
      'The condition compares two columns, so a Custom Column is easiest: [Discount] > 0.1 * [Gross Sales].',
      'Weekend flag: Date.DayOfWeek([Date], Day.Monday) >= 5 is true on Saturday and Sunday, whatever your language settings.',
      'Filter Restaurant to Olive & Ember Airport before you sum.',
    ],
    explain: 'Deep discounts are rare (463 lines) but worth about $55,800 of sales. The Airport takes about 30% of its sales at weekends, barely more than the 28% the calendar alone gives: unlike a city restaurant, it trades evenly through the week, so weekday staffing matters as much as weekends.',
  },
  {
    id: 'pq-custom-p2', topic: 'pq-custom', type: 'numbers', title: 'Scale, keep or cut?', difficulty: 3, concept: 'pq-custom', business: 'Marketing', minutes: 25,
    files: ADS, dataset: 'harbor-pine-ads',
    skills_tested: ['pq-custom', 'pq-group', 'metric-choice'],
    context: 'Harbor & Pine\'s marketing lead wants a simple rule for the campaign review: ROAS of 4 or more → Scale, from 2 to under 4 → Keep, under 2 → Cut. You suspect the rule is too simple.',
    prompt: 'From your appended ad table with campaign codes, group by code (Sum of Cost, Sum of ConvValue), add ROAS, add a Conditional Column with the three tiers, and merge the register for each campaign\'s objective.',
    questions: [
      { label: 'Campaigns in the Cut tier' },
      { label: 'Cut campaigns whose objective is Awareness' },
      { label: 'Spend in the Cut tier', unit: '$' },
    ],
    answersKey: 'pq-hp-tiers',
    hints: [
      'Group by the upper-case code, not the campaign name: one campaign was renamed in May and would otherwise count twice.',
      'Conditional Column rules run from the top: test ROAS ≥ 4 first, then ≥ 2, else Cut.',
      'The unregistered campaign has no objective after the merge: it shows null.',
    ],
    explain: 'Five campaigns land in Cut, but two of them are Awareness campaigns whose job is reach, not sales, so ROAS is the wrong yardstick for them. Report the rule with that caveat: it works for Sales campaigns only.',
  },
  // ---------------------------------------------------------------- M code
  {
    id: 'pq-m-p1', topic: 'pq-m', type: 'numbers', title: 'Fuel readings that say n/a', difficulty: 3, concept: 'm-code', business: 'Logistics', minutes: 25,
    files: SWIFT, dataset: 'swiftline-depots',
    skills_tested: ['m-code', 'missing-data', 'denominator'],
    context: 'Swiftline Couriers\' Easton depot records fuel for every delivery run, but the fuel card reader sometimes fails and writes "n/a". Distances are in miles. The fleet manager wants Easton\'s fuel use in litres per 100 km.',
    prompt: 'Load **Swiftline_ET_2026-Q3.csv** from the ZIP. Remove the TOTAL row, add kilometres (miles × 1.609344), and turn FuelLitres into a number with `try Number.From([FuelLitres]) otherwise null`.',
    questions: [
      { label: 'Runs whose fuel reading is missing' },
      { label: 'Litres per 100 km, using only runs with a fuel reading', tolerance: 0.05 },
      { label: 'Litres per 100 km if you (wrongly) divide all the fuel by all the kilometres', tolerance: 0.05 },
    ],
    answersKey: 'pq-swift-fuel',
    hints: [
      'Add Column → Custom Column with try Number.From([FuelLitres]) otherwise null, then count the nulls (the column profile shows them).',
      'For the correct figure, filter out the null fuel rows before summing BOTH fuel and kilometres: the top and bottom of the ratio must cover the same runs.',
      'Round only at the end.',
    ],
    explain: 'About 14.6 litres per 100 km is right. The naive 12.3 looks like a big saving but only reflects the 37 missing readings: their kilometres are counted while their fuel is not. A denominator that covers more rows than the numerator is a classic silent error.',
  },
  {
    id: 'pq-m-p2', topic: 'pq-m', type: 'numbers', title: 'Campaign codes with Text functions', difficulty: 3, concept: 'm-code', business: 'Marketing', minutes: 20,
    files: ADS, dataset: 'harbor-pine-ads',
    skills_tested: ['m-code', 'pq-custom'],
    context: 'Harbor & Pine\'s social platform exports whatever campaign name the marketer typed. One campaign was renamed in May, and its code was typed in lowercase after that.',
    prompt: 'Load **social_ads_2026-Q2.csv**. Add a Custom Column that returns the campaign code in capitals: `Text.Upper(Text.Trim(Text.BeforeDelimiter([Campaign name], "|")))`, and answer.',
    questions: [
      { label: 'Different values in the raw "Campaign name" column' },
      { label: 'Different campaign codes in your new column' },
      { label: 'Total spend of campaign HP-F01, across both of its names', unit: '$' },
    ],
    answersKey: 'pq-hp-names',
    hints: [
      'View → Column distribution shows the distinct count under each header (profile the entire data set).',
      'Amount spent needs cleaning before it adds up: remove "$" and ",", then change the type.',
      'Text.BeforeDelimiter keeps the space before "|", which is why the formula trims.',
    ],
    explain: 'Six names but five campaigns: anything grouped by name splits HP-F01 in two and under-reports its $7,170. Codes are the stable key; names are for people.',
  },
];

export const PQ_CHALLENGES = [
  {
    id: 'pq-clean-ch', topic: 'pq-clean', type: 'numbers', title: 'Who can we actually email?', difficulty: 3, concept: 'pq-clean', business: 'Marketing', minutes: 30,
    files: CRM, dataset: 'crm-contacts',
    skills_tested: ['pq-clean', 'locale', 'data-quality'],
    context: 'Marketing is planning an email campaign for customers who joined from 2025 onwards, with local events in the cities that have the most of them. They asked for "the list". Nobody has asked how many contacts are usable.',
    prompt: 'From the raw CRM export, build the campaign list: unique customers with a usable email (not blank, not "N/A") who signed up on or after 1 January 2025. Fix the city names before you count by city.',
    questions: [
      { label: 'Customers on the campaign list' },
      { label: 'City with the most customers on the list' },
      { label: 'Share of all unique customers who make the list', unit: '%', percent: true, tolerance: 0.3 },
    ],
    answersKey: 'pq-crm-campaign',
    hints: [
      'Signup Date has two formats: Change Type → Using Locale (English UK) reads both 2025-01-03 and 24/12/2025.',
      'City: Trim, then Capitalize Each Word, before grouping.',
      'Replace "N/A" with null in Email, then filter out null and empty values.',
    ],
    explain: 'Fewer than half the customers can be emailed: that is the finding to report back, not just the list. Counting by city before trimming and fixing the case would split Bayport into several spellings and could name the wrong city.',
  },
  {
    id: 'pq-append-ch', topic: 'pq-append', type: 'numbers', title: 'The store scorecard, reconciled', difficulty: 4, concept: 'pq-append', business: 'Retail', minutes: 45,
    files: POS, dataset: 'pos-exports',
    skills_tested: ['pq-append', 'pq-unpivot', 'pq-merge', 'reconciliation'],
    context: 'The Head of Retail saw your combined POS table and asked two things before using it: can we trust the totals, and how many store-months actually reached their target? The three monthly files still have all their quirks.',
    prompt: 'Build the combined table from the folder (June to August) with every quirk fixed. Unpivot the targets file, group your sales by store and month, and merge the two on both columns.',
    questions: [
      { label: 'Units sold across the three months' },
      { label: 'August rows whose store code was written in lowercase' },
      { label: 'Footwear NetSales across the three months', unit: '$' },
      { label: 'Category with the largest NetSales drop from July to August' },
      { label: 'Store-months (out of 15) that met or beat their target' },
    ],
    answersKey: 'pq-pos-reconcile',
    hints: [
      'If the Units total looks low, check July: its column is called "Qty Sold", so it did not stack under Units.',
      'Count the lowercase codes before you fix them: a Custom Column [StoreCode] <> Text.Upper([StoreCode]).',
      'Targets: select StoreCode → Unpivot Other Columns → rename Attribute to Month. For the sales, add Month = Date.ToText([Date], "yyyy-MM"), group by StoreCode and Month, then merge on both columns.',
    ],
    explain: 'Each quirk changes an answer: July units vanish without the rename, lowercase codes lose their target in a case-sensitive merge, and misread UK dates move July sales into other months. With everything fixed, only 6 of the 15 store-months met target, and Tents had the biggest drop from July to August.',
  },
  {
    id: 'pq-merge-ch', topic: 'pq-merge', type: 'numbers', title: 'What does each dish cost to make?', difficulty: 4, concept: 'pq-merge', business: 'Restaurant', minutes: 45,
    files: [{ label: 'menu_recipes_suppliers.xlsx', path: 'restaurant/menu_recipes_suppliers.xlsx' }, { label: 'purchases.csv', path: 'restaurant/purchases.csv' }], dataset: 'olive-ember',
    skills_tested: ['pq-merge', 'pq-group', 'weighted-avg'],
    context: 'Olive & Ember\'s head chef says the burgers are the best dishes to sell because they are cheap to make. The owners want the ingredient cost of every dish at real August prices, and they use a food cost ceiling of 35% of the menu price.',
    prompt: 'From purchases.csv, keep deliveries in August 2026 and get each ingredient\'s average price (Sum of Line Total ÷ Sum of Qty). Merge it into the **Recipes** sheet, add Cost = Qty per Portion × price, group by Menu Item, and merge the **Menu** sheet for the current price.',
    questions: [
      { label: 'Dish with the highest ingredient cost per portion' },
      { label: 'Its ingredient cost per portion', unit: '$', tolerance: 0.05 },
      { label: 'Food cost % of the Truffle Mushroom Burger (cost ÷ current price)', unit: '%', percent: true, tolerance: 0.3 },
      { label: 'Dishes above the 35% food cost ceiling' },
    ],
    answersKey: 'pq-recipe-cost',
    hints: [
      'The price must be weighted: Group By Ingredient with two aggregations (Sum of Line Total, Sum of Qty), then divide. An average of Unit Cost gives a small delivery the same weight as a big one.',
      'Merge Recipes with the price table on Ingredient (Left Outer), expand the price, then add [Qty per Portion] * [Price].',
      'Group the recipe lines by Menu Item (Sum of Cost), then merge Menu on Menu Item and divide by Current Price.',
    ],
    explain: 'The ribeye costs the most to make (about $15.93), but the chef\'s hunch fails where it matters: the Truffle Mushroom Burger has the highest food cost %, about 46% of its price, because truffle paste is expensive and the burger is priced low. Three dishes break the 35% ceiling: both burgers and the steak.',
  },
  {
    id: 'pq-reshape-ch', topic: 'pq-reshape', type: 'numbers', title: 'Where is attendance improving?', difficulty: 4, concept: 'pq-unpivot', business: 'NGO', minutes: 35,
    files: SURVEY, dataset: 'bright-wells-survey',
    skills_tested: ['pq-unpivot', 'pq-group', 'denominator'],
    context: 'Bright Wells\' trustees want to know which region\'s schools improved most since 2024, so the others can learn from it. A village only counts if it was surveyed in both 2024 and 2026.',
    prompt: 'Build on your long survey table. Keep 2024 and 2026, keep villages with figures for both years, and compare attendance rates by region (total attending ÷ total enrolled, per year).',
    questions: [
      { label: 'Region with the largest rise in attendance rate from 2024 to 2026' },
      { label: 'That rise, in percentage points', tolerance: 0.3 },
      { label: 'Villages whose 2026 attendance rate is lower than their 2024 rate' },
    ],
    answersKey: 'pq-bw-regions',
    hints: [
      'Villages that joined in 2026 have no 2024 figures. Pivot Year so each village has a 2024 and a 2026 column, and filter out the nulls.',
      'Build rates from totals: Group By Region with Sum of Enrolled and Sum of Attending for each year, then divide. An average of village rates gives a small village the same weight as a big one.',
      'For the village question, compare each village\'s two rates with a Custom Column.',
    ],
    explain: 'Highlands started lowest and gained about 18 points. One village went backwards: find out why before drawing conclusions (a local event, such as a flood or a school closure, can explain it).',
  },
  {
    id: 'pq-custom-ch', topic: 'pq-custom', type: 'numbers', title: 'The Prime Meats price audit', difficulty: 4, concept: 'pq-custom', business: 'Restaurant', minutes: 45,
    files: PRIME, dataset: 'prime-meats',
    skills_tested: ['pq-custom', 'pq-group', 'pq-append'],
    context: 'Olive & Ember\'s finance team wants a monthly price audit: any product whose average price is more than 10% above May gets flagged, and they want to know what the rises cost in August.',
    prompt: 'Combine and clean the four invoice files. Work out the weighted average price per kg (Sum of LineTotal ÷ Sum of Qty) per product for May and for August, then add the change and a flag.',
    questions: [
      { label: 'Products whose August price is more than 10% above May' },
      { label: 'Extra cost in August from those rises: August kg × (August price − May price), added up', unit: '$', tolerance: 30 },
      { label: 'Ribeye steak: price change from May to August', unit: '%', percent: true, tolerance: 0.3 },
    ],
    answersKey: 'pq-pm-audit',
    hints: [
      'Clean first, as in the invoice task: rename Quantity to Qty, trim and fix the case of Product, read UK dates Using Locale, remove the TOTAL row and the duplicated August line.',
      'Group By Product and Month with Sum of LineTotal and Sum of Qty, divide, then Pivot Month to put May and August side by side.',
      'The extra cost uses August quantities: it is how much less August would have cost at May prices.',
    ],
    explain: 'Beef mince and ribeye both rose by more than 20%, adding about $5,500 to August\'s bill, while the other products barely moved. That is a negotiation brief for the owners, not just a flag.',
  },
  {
    id: 'pq-m-ch', topic: 'pq-m', type: 'open', title: 'Make this query survive next month', difficulty: 4, concept: 'pq-robust', business: 'Retail', minutes: 30,
    skills_tested: ['pq-robust', 'm-code', 'locale'],
    context: `A colleague wrote this query for the June POS file. It has to work for July and August too, and it does not:

\`\`\`
let
    Source   = Csv.Document(File.Contents("C:\\Users\\ana\\Desktop\\POS_Summary_2026-06.csv"), [Delimiter=",", Columns=8]),
    Promoted = Table.PromoteHeaders(Source),
    Typed    = Table.TransformColumnTypes(Promoted, {{"Date", type date}, {"StoreCode", type text}, {"Units", Int64.Type}, {"NetSales", type number}}),
    Removed  = Table.RemoveColumns(Typed, {"Notes"})
in
    Removed
\`\`\`

July has two title lines and a blank line above the header, calls Units "Qty Sold" and writes dates day first. August has a Notes column, a TOTAL row and some lowercase store codes. June has no Notes column.`,
    prompt: 'List what breaks, or silently goes wrong, with each file, and how you would change each step. Write M or describe the change in words.',
    checklist: [
      { point: 'Replaces the hard-coded desktop path with a parameter or a folder source', keywords: [['parameter', 'folder', 'path']] },
      { point: 'Notices Columns=8 (a fixed column count) cuts off the extra Notes column', keywords: [['columns=8', 'columns = 8', 'column count', 'fixed number of columns', 'ninth', '9 columns']] },
      { point: 'Skips title lines by finding the header, not by a fixed count', keywords: [['skip', 'title', 'top rows', 'header row']] },
      { point: 'Renames "Qty Sold" to Units, safely when it is missing', keywords: [['qty sold', 'rename']] },
      { point: 'Reads day-first dates with a locale (en-GB)', keywords: [['locale', 'en-gb', 'culture', 'united kingdom']] },
      { point: 'Makes Remove Columns tolerate a missing Notes column (MissingField.Ignore)', keywords: [['missingfield', 'missing field', 'ignore']] },
      { point: 'Removes the TOTAL row and upper-cases the store codes', keywords: [['total'], ['upper', 'capital', 'case']] },
    ],
    model: `**What goes wrong**
- The path points at one file on Ana's desktop: nobody else can refresh it, and July is never read. Use a **FolderPath** parameter or a folder source that calls this logic for each file.
- \`Columns=8\` cuts every row to 8 columns, so August's Notes column never arrives, and \`Table.RemoveColumns(…, {"Notes"})\` then fails. In June there is no Notes column at all.
- July: the first line is a title, so **PromoteHeaders** makes the title the header and every step after it fails. The Units column is called **Qty Sold**, and the day-first dates are misread (days 1–12) or become errors.
- August: the **TOTAL** row turns into an error in Date and doubles the totals; lowercase **w02** will not match the store list.

**A robust version**
\`\`\`
let
    Source   = Csv.Document(File.Contents(FolderPath & FileName), [Delimiter = ","]),
    Skipped  = Table.Skip(Source, each [Column1] <> "Date"),
    Promoted = Table.PromoteHeaders(Skipped, [PromoteAllScalars = true]),
    Renamed  = Table.RenameColumns(Promoted, {{"Qty Sold", "Units"}}, MissingField.Ignore),
    NoNotes  = Table.RemoveColumns(Renamed, {"Notes"}, MissingField.Ignore),
    NoTotal  = Table.SelectRows(NoNotes, each [Date] <> "TOTAL" and [Date] <> ""),
    Codes    = Table.TransformColumns(NoTotal, {{"StoreCode", each Text.Upper(Text.Trim(_)), type text}}),
    Typed    = Table.TransformColumnTypes(Codes, {{"Date", type date}, {"Units", Int64.Type}, {"NetSales", type number}}, "en-GB")
in
    Typed
\`\`\`
Then check the row count and NetSales per month against the source files after every refresh.`,
    hints: ['Go through the files one by one: what does each step receive from July, and from August?', 'Look for anything hard-coded: a path, a number of columns, a column name, a date format.'],
    explain: 'Robust queries do not assume: they find the header, tolerate missing columns, name the culture of dates, and filter out summary rows. Each fix removes one way the query can fail loudly or, worse, quietly.',
  },
];
