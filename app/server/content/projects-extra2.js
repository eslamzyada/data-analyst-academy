// Capstone projects added by the content expansion: two that read the restaurant group's own
// numbers, and two built on messy platform exports (Power Query / Power BI work).
// Same shape as projects.js: a real business situation, real data, no list of formulas to follow.
import { REPORT_FIELDS } from './projects-extra.js';

export const PROJECTS_EXTRA2 = [
  // ================================================================ Restaurant: sales growth
  {
    id: 'cap-sales', title: 'Olive & Ember: is the growth real?', business: 'Restaurant', difficulty: 3, minutes: 85,
    skills: ['SQL', 'Power BI', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (GROUP BY, dates)',
    summary: 'Sales are up 10% on last year and the owner wants to open a fourth site. Find out what the 10% is actually made of.',
    brief: `
**Olive & Ember Kitchen** runs three restaurants: Downtown, Riverside and the Airport.

The owner writes:
> "We are up about 10% on last year and I want to open a fourth site. Before I sign a lease I want to understand the growth: is it more customers, or am I just charging more? Is it one site carrying the others? And I would like one page I can look at every Monday instead of the six spreadsheets I get now."

**What you have:** every day's sales, one row per dish per restaurant per day, with quantity, price, gross, discount and net, from January 2025 to August 2026. There is also a menu price history. It is all in the **SQL Lab** database *Olive & Ember*.

**Compare like with like.** 2026 stops at the end of August, so every comparison with 2025 must use **January to August** in both years. Nobody will tell you which calculations to run: each step asks for a finding.`,
    db: 'restaurant', datasets: ['restaurant-db', 'olive-ember'],
    steps: [
      {
        id: 's1', title: 'Start with the claim', type: 'numbers', topics: ['sql-groupby', 'sql-dates'], concept: 'kpi', answersKey: 'cap-sales',
        pick: (a) => [a.sales25, a.sales26],
        prompt: 'Measure the claim before you explain it. What were the group\'s **total net sales for January to August** in **2025** and in **2026**?',
        questions: [
          { label: 'Group net sales, Jan–Aug 2025', tolerance: 400 },
          { label: 'Group net sales, Jan–Aug 2026', tolerance: 400 },
        ],
        hints: [
          'One row per dish per restaurant per day: the group total is the sum of net_sales across all three restaurants.',
          'Filter the two eight-month windows separately, or build them in one query with conditional sums.',
        ],
        explain: 'About 2.877m in 2025 against 3.171m in 2026: +10.24%. The owner\'s number is right. Everything from here is about what is inside it.',
      },
      {
        id: 's2', title: 'People or prices?', type: 'numbers', topics: ['sql-groupby', 'think-metrics'], concept: 'denominator', answersKey: 'cap-sales',
        pick: (a) => [a.qty25, a.qty26],
        prompt: 'Money can grow without a single extra customer. How many **items** did the group sell in January to August **2025**, and in the same months of **2026**?',
        questions: [
          { label: 'Items sold, Jan–Aug 2025', tolerance: 0 },
          { label: 'Items sold, Jan–Aug 2026', tolerance: 0 },
        ],
        hints: [
          'Quantities are in the same table as the money.',
          'Once you have both, compare the growth in items with the growth in money you found in step 1. If they differ, look at menu_price_history for a reason.',
        ],
        explain: 'Items sold rose 6.24% (277,883 to 295,216) while money rose 10.24%. The gap is price: the menu went up about 4.1% on 1 October 2025, so the 2026 months are all priced higher than the 2025 months they are being compared with. Roughly six points of the ten are real extra trade; four are the price list.',
      },
      {
        id: 's3', title: 'Is one site carrying the others?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], answersKey: 'cap-sales',
        pick: (a) => [a.bestSite, a.bestSiteGrowthPct],
        prompt: 'Split the same like-for-like comparison by restaurant. Which site grew **fastest** in net sales, and by what percentage?',
        questions: [
          { label: 'Fastest-growing restaurant', accept: ['Olive & Ember Airport', 'Airport', 'AP'] },
          { label: 'Its net sales growth, Jan–Aug 2025 → 2026 (%)', percent: true, tolerance: 0.4 },
        ],
        hints: ['Group the two windows by restaurant, then divide one by the other.', 'Watch the direction: growth is 2026 ÷ 2025 − 1, not the other way round.'],
        explain: 'The Airport grew 12.1%, ahead of Riverside (10.0%) and Downtown (9.1%). It is also the smallest site, so a good year there moves its percentage more easily than the same money would at Downtown. Growth rates and absolute money tell different stories, and the fourth-site decision needs both.',
      },
      {
        id: 's4', title: 'What is actually selling?', type: 'numbers', topics: ['sql-joins', 'sql-groupby'], concept: 'segmentation', answersKey: 'cap-sales',
        pick: (a) => [a.topDish, a.topDishSharePct, a.mostUnitsCategory],
        prompt: 'Now look at the menu for January to August 2026. Which single **dish** brings in the most net sales, what **share of group net sales** is it, and which **category** sells the most individual items?',
        questions: [
          { label: 'Dish with the highest net sales', accept: ['Ember Burger', 'ember burger'] },
          { label: 'Its share of group net sales (%)', percent: true, tolerance: 0.3 },
          { label: 'Category selling the most items', accept: ['Drinks', 'drinks'] },
        ],
        hints: [
          'The sales table stores a menu_item_id; the names and categories live in menu_items.',
          'The last question asks about items sold, not money. They do not rank the same way.',
        ],
        explain: 'The Ember Burger is the biggest earner at about 257,000, roughly 8.1% of everything the group takes. But the category selling the most items is Drinks: 90,960 of them, which is far more than any other category and still only 11.7% of the money. A menu ranked by popularity and a menu ranked by revenue are two different menus.',
      },
      {
        id: 's5', title: 'When does the money arrive?', type: 'numbers', topics: ['sql-dates', 'sql-groupby'], answersKey: 'cap-sales',
        pick: (a) => [a.peakMonth, a.peakMonthSales, a.troughMonthSales],
        prompt: 'A new site has to survive the quiet months as well as the busy ones. Across the group in 2026, which **month** was the busiest, what did it take, and what did the **weakest** month take?',
        questions: [
          { label: 'Busiest month of 2026 (YYYY-MM)', month: true },
          { label: 'Net sales in that month', tolerance: 400 },
          { label: 'Net sales in the weakest month', tolerance: 400 },
        ],
        hints: ['Build a year-month key from the date and group by it.', 'Sorting by the total rather than by the month makes the best and worst obvious.'],
        explain: 'July took about 465,700 and February about 312,800: the best month is roughly 49% bigger than the worst. A lease, a payroll and a loan repayment are all monthly and flat. That swing is the thing a fourth site has to survive, and it is invisible in an annual total.',
      },
      {
        id: 's6', title: 'What does the growth mean?', type: 'choice', topics: ['think-causation', 'think-metrics'], answer: 2,
        prompt: 'You have found: money +10.2%, items +6.2%, and a 4.1% menu price rise in October 2025. Which statement is best supported?',
        options: [
          'Trade is up 10%, and the price rise makes no difference to that',
          'Trade is flat and the whole increase comes from the price rise',
          'Trade is up about 6%, and the rest of the increase is the price rise',
          'The price rise pushed customers away, so trade must have fallen',
        ],
        explain: 'Items sold is the closest thing here to "how much trade did we do", and it is up about 6%. Multiply 6.2% more items by 3.8% more money per item and you land almost exactly on the 10.2% headline. That is worth knowing before signing a lease: a fourth site copies the trade, not the price list.',
      },
      {
        id: 'final', title: 'The Monday page', type: 'report', topics: ['think-communication', 'pbi-visuals', 'pbi-star'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the owner a short note answering the lease question, and describe the one page you would build in Power BI for Monday mornings: what it would show, how the model behind it would be organised, and what you would deliberately leave off. Then tick the points your answer covers.',
        checklist: [
          { point: 'Separates the real growth in trade from the price rise', keywords: [['6', '6.2', 'items', 'volume'], ['4', '4.1', 'price']] },
          { point: 'Uses like-for-like months rather than comparing part of 2026 with all of 2025', keywords: [['like-for-like', 'like for like', 'jan', 'january', 'august', 'eight month', 'same months']] },
          { point: 'Names the fastest-growing site and notes it is also the smallest', keywords: [['airport'], ['small', 'smallest', 'base', '12']] },
          { point: 'Mentions the seasonal swing between the best and worst month', keywords: [['july', 'february', 'season', 'quiet month'], ['465', '312', '49', 'swing', 'gap']] },
          { point: 'Separates what sells most often from what earns most', keywords: [['drinks'], ['ember burger', 'burger', 'revenue', 'money', 'earn']] },
          { point: 'Describes a dashboard page with a small number of measures, not every column', keywords: [['dashboard', 'page', 'report', 'tile', 'card', 'visual'], ['measure', 'kpi', 'few', 'one page', 'single page']] },
          { point: 'Says something about the model behind the report (a date table, or dimensions shared by the facts)', keywords: [['date table', 'star', 'dimension', 'model', 'relationship', 'calendar']] },
          { point: 'Answers the lease question rather than only describing the data', keywords: [['lease', 'fourth site', 'fourth', 'new site', 'recommend', 'before you', 'would advise']] },
        ],
        model: `**The short answer.** The 10% is real, but only about six points of it are extra trade. The rest is the menu price rise of October 2025, which lifts every 2026 month against the 2025 month it is compared with. A fourth site inherits the trade, not the price list, so I would plan against 6%, not 10%.

**What the numbers say.** Like-for-like January to August: net sales 2.877m to 3.171m (+10.2%), items sold 277,883 to 295,216 (+6.2%), average money per item 10.35 to 10.74 (+3.8%). Those two multiply out to the headline almost exactly, which is a good sign that nothing else large is hiding in there.

**By site.** The Airport grew fastest at 12.1%, against Riverside 10.0% and Downtown 9.1%. Worth saying plainly: the Airport is the smallest site, so the same extra money shows as a bigger percentage there. In absolute terms Downtown still adds the most.

**What sells.** The Ember Burger is the single biggest earner, about 8.1% of group net sales. Drinks sell far more items than anything else (90,960) and bring 11.7% of the money. If we are choosing a menu for a fourth site, those are two different lists and we should be explicit about which one we are using.

**Seasonality.** July took about 465,700 and February about 312,800. A new site pays rent in February too. I would want the business case to survive a February, not an average month.

**The Monday page.** One page, five or six numbers, no tables of raw rows:
1. Net sales this month, with last year's same month beside it, and items sold underneath it so price and trade never get confused again.
2. A twelve-month line of net sales, so the season is visible rather than inferred.
3. Net sales by site, as a simple bar, with growth versus last year as a second measure.
4. Top ten dishes by net sales, with a toggle for items sold.
5. A site slicer and a date slicer, and nothing else clickable.

**Behind it**, the model should be a proper date table joined to the sales fact, with restaurants and menu items as their own dimension tables. That is what lets one slicer filter everything and lets "same period last year" be a measure rather than a hand-built column. I would deliberately leave off: discounts (they sit at about 1.6% at every site and have not moved), and any single-day detail, which belongs in an operational report and not on a Monday overview.

**What I would want next.** Covers or guest counts, which we do not have. Items sold is a decent proxy for trade, but a group that sells more drinks per head looks like growth when it may be the same people ordering differently.`,
      },
    ],
  },

  // ================================================================ Restaurant: site profitability
  {
    id: 'cap-profit', title: 'Olive & Ember: which site actually makes money?', business: 'Restaurant', difficulty: 4, minutes: 80,
    skills: ['SQL', 'Excel', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (CTEs) and Excel Intermediate',
    summary: 'One of the three restaurants is much less profitable than the others. Find out how much, why, and whether closing it would help.',
    brief: `
The owner of **Olive & Ember Kitchen** has had an offer to be released from one of the leases.

> "One of the three has always felt like the weak one, and I have a shrewd idea which. Before I decide, I need a proper number: what does each site actually make once everything is counted? And if it really is the problem, is walking away the answer?"

**What you have:** daily sales, every supplier purchase, month-end stock counts, daily labour by role, and the monthly running costs (rent, utilities, marketing, maintenance), in the **SQL Lab** database *Olive & Ember*. The period to use is **January to August 2026**.

**The company's definitions**, so everyone is measuring the same thing:
- **Food cost** = opening stock (31 December 2025) + purchases in the period − closing stock (31 August 2026).
- **Operating profit** = net sales − food cost − all labour − operating costs.
- **Margin** = operating profit ÷ net sales.

Work the numbers first. The last two steps are about what they mean.`,
    db: 'restaurant', datasets: ['restaurant-db', 'olive-ember'],
    steps: [
      {
        id: 's1', title: 'A number for each site', type: 'numbers', topics: ['sql-cte', 'sql-business'], concept: 'kpi', answersKey: 'cap-profit',
        pick: (a) => [a.worstSite, a.worstMargin, a.bestMargin],
        prompt: 'Build the profit and loss for January to August 2026 for each restaurant, using the company definitions above. Which site has the **lowest** operating margin, what is it, and what is the **highest** margin of the three?',
        questions: [
          { label: 'Restaurant with the lowest operating margin', accept: ['Olive & Ember Airport', 'Airport', 'AP'] },
          { label: 'Its operating margin (%)', percent: true, tolerance: 0.4 },
          { label: 'The highest margin of the three sites (%)', percent: true, tolerance: 0.4 },
        ],
        hints: [
          'Five pieces per site: net sales, stock at both dates, purchases, labour, operating costs. A CTE for each keeps it readable.',
          'The stock counts are single dates, not ranges. Purchases and labour are ranges.',
          'Operating costs are stored by month as text such as "2026-03".',
        ],
        explain: 'The Airport makes about 23.0%, against 33.9% at Riverside and 33.6% at Downtown. The owner\'s instinct is right, and the gap is nearly eleven points of margin, not a rounding difference. But "the Airport is worse" is where the analysis starts, not where it ends.',
      },
      {
        id: 's2', title: 'Where does the gap come from?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], concept: 'segmentation', answersKey: 'cap-profit',
        pick: (a) => [a.worstRent, a.worstRentPct, a.cheapestRentPct],
        prompt: 'Break the costs down as a percentage of each site\'s own sales and find the line that is most out of step. How much **rent** did the weakest site pay in the eight months, what percentage of its sales is that, and what is the same percentage at the site paying the **least** rent?',
        questions: [
          { label: 'Rent paid by the weakest site, Jan–Aug 2026', tolerance: 200 },
          { label: 'Its rent as a % of its own net sales', percent: true, tolerance: 0.3 },
          { label: 'Rent as a % of net sales at the cheapest-rent site', percent: true, tolerance: 0.3 },
        ],
        hints: [
          'Compare each cost line as a share of that site\'s sales, not in dollars: the sites are different sizes.',
          'Rent is one of the cost types in operating_costs.',
        ],
        explain: 'The Airport pays about 144,000 of rent in eight months, 16.0% of its sales. Riverside pays 88,000, 8.4% of its sales. An airport concession costs more per seat and the site has only 70 seats to earn it back with. Food cost and labour are worse there too, but nothing else is off by eight points.',
      },
      {
        id: 's3', title: 'How much of it is the rent?', type: 'numbers', topics: ['sql-business', 'xl-scenario'], concept: 'scenario', answersKey: 'cap-profit',
        pick: (a) => [a.profitOnCheapRent, a.marginOnCheapRent],
        prompt: 'Test the rent explanation. If the weakest site had paid exactly the **same rent in dollars** as the cheapest-rent site, and nothing else changed, what would its operating profit and margin have been?',
        questions: [
          { label: 'Its operating profit on the lower rent', tolerance: 300 },
          { label: 'Its margin on the lower rent (%)', percent: true, tolerance: 0.4 },
        ],
        hints: ['This is a one-line what-if: add back the rent difference and recalculate the margin.', 'Compare the result with the other two sites before you conclude anything.'],
        explain: 'It would have made about 263,000, a margin of 29.2%. That is a big improvement, and still four to five points below the other two. So rent explains roughly six of the eleven points, and the rest is elsewhere: labour runs at 29.3% of sales against about 26% at the other sites, and its food cost is the highest in the group. The rent is the biggest single reason, not the only one.',
      },
      {
        id: 's4', title: 'How much would it have to sell to break even?', type: 'numbers', topics: ['sql-business', 'xl-scenario'], concept: 'what-if', answersKey: 'cap-profit',
        pick: (a) => [a.worstBreakEven],
        prompt: 'Split the weakest site\'s costs: treat **food and non-management labour as variable** (they move with sales) and **management labour plus all operating costs as fixed**. At its current variable cost rate, what level of net sales would it need in the eight months just to break even?',
        questions: [{ label: 'Break-even net sales for the eight months', tolerance: 6000 }],
        hints: [
          'Variable cost rate = variable costs ÷ net sales. What is left of each dollar is the contribution.',
          'Break-even sales = fixed costs ÷ contribution rate.',
          'Management labour is exactly the same at all three sites, which is the clue that it is fixed.',
        ],
        explain: 'About 488,000, against actual sales of 900,000. The site covers its break-even nearly twice over. That is the fact that changes the conversation: the Airport is not losing money, it is making around 207,000 of operating profit on a thinner margin than its siblings.',
      },
      {
        id: 's5', title: 'Should the lease go?', type: 'choice', topics: ['think-causation', 'think-questions'], answer: 3,
        prompt: 'The offer is to walk away from the lease on the weakest site. Given everything you have found, which is the best-supported advice?',
        options: [
          'Close it: a 23% margin drags the group average down',
          'Close it: the rent is more than twice the rate the other sites pay',
          'Keep it and do nothing, because it is profitable',
          'Keep it, but treat the labour rate and the rent renewal as the two things to fix',
        ],
        explain: 'Closing a site that contributes about 207,000 of operating profit removes that profit; the group-wide overheads do not leave with it. A low margin is not a loss. The useful findings are the two fixable ones: a labour rate three points above the other sites, and a rent that only makes sense if the site is busy enough to carry it, which is exactly what to argue at renewal.',
      },
      {
        id: 'final', title: 'Your advice on the lease', type: 'report', topics: ['think-communication', 'think-questions'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the owner a short note: what each site really makes, why the Airport is different, and what you would do about the lease offer. Then tick the points your answer covers.',
        checklist: [
          { point: 'Gives a margin for each site, not just an opinion', keywords: [['23', '33'], ['margin', '%']] },
          { point: 'Identifies rent as the largest single difference', keywords: [['rent'], ['16', '8.4', '8.3', 'double', 'twice']] },
          { point: 'Quantifies how much of the gap the rent explains, rather than blaming it for all of it', keywords: [['29', '263'], ['still', 'remain', 'rest', 'other', 'labour', 'labor', 'food']] },
          { point: 'Notes the labour rate at the weakest site', keywords: [['labour', 'labor'], ['29', '26', 'three point', '3 point']] },
          { point: 'States that the site is profitable and well above break-even', keywords: [['break-even', 'break even', 'breakeven', '488', 'profitable'], ['207', 'twice', '1.8', 'above']] },
          { point: 'Warns that closing it removes the profit but not the shared overheads', keywords: [['overhead', 'fixed', 'head office', 'management', 'does not leave', 'stay', 'remain']] },
          { point: 'Recommends specific action (rent renewal, labour scheduling) rather than only describing', keywords: [['renew', 'negotiat', 'schedul', 'roster', 'staffing', 'recommend', 'fix']] },
        ],
        model: `**The short answer.** The Airport is the weakest site, but it is not a loss-making one, and I would not accept the offer on these numbers. I would use them at the rent renewal instead.

**What each site makes, January to August 2026.** Riverside 33.9% operating margin, Downtown 33.6%, the Airport 23.0%. In money that is roughly 358,000, 409,000 and 207,000 of operating profit, about 974,000 for the group.

**Why the Airport is different.** Its rent is 144,000 for the eight months, 16.0% of its sales. Riverside pays 88,000, or 8.4%. Put the Airport on Riverside's rent in dollars and, with nothing else changed, it would have made about 263,000 at a 29.2% margin. So the rent explains roughly six of the eleven points of the gap. The remaining four or five points are labour, which runs at 29.3% of sales against about 26% elsewhere, and a food cost that is the highest of the three.

**It is comfortably above break-even.** Treating food and hourly labour as variable and management plus running costs as fixed, the site breaks even at about 488,000 of sales in the period. It did 900,000, so it covers its own costs nearly twice over. It is also the fastest-growing of the three.

**What closing it would actually do.** It would remove around 207,000 of operating profit from the group in eight months. The costs that are genuinely shared do not disappear with the site, so the remaining two restaurants would carry them instead. "Low margin" is not "losing money", and the decision should not be made as though it were.

**What I would do.**
1. **Go into the rent renewal with these numbers.** 16% of sales against a group norm of 8–10% is the argument, and the site's growth is the reason a landlord should care about keeping us.
2. **Fix the labour rate before anything else,** because it is the part we control. Three points of sales is roughly 27,000 over eight months at current trade, which is most of the gap that is not rent.
3. **Re-test in six months** on exactly these definitions, so the comparison means something.

**What I would want next.** The lease terms themselves: length, break clauses, and any turnover-linked element. The right answer to "should we walk away" depends as much on what the contract says as on what the P&L says, and I cannot see the contract in this data.`,
      },
    ],
  },

  // ================================================================ Logistics: Swiftline
  {
    id: 'cap-swiftline', title: 'Swiftline Couriers: why are we missing delivery promises?', business: 'Logistics', difficulty: 3, minutes: 75,
    skills: ['Power Query', 'Power BI', 'Analyst Thinking'], recommendedAfter: 'Power Query Intermediate (append, merge, parameters)',
    summary: 'Four depots each send their own export in their own layout. Combine them, find who is missing the promise, and work out whether that is fair.',
    brief: `
**Swiftline Couriers** runs four depots. Every depot system drops its own quarterly export into one folder, and nobody has ever put them together.

The operations director writes:
> "Customers are complaining about late deliveries and I cannot tell you our on-time rate, because every depot reports differently. One of them is going to turn out to be the problem. I want to know which, by how much, and whether it is actually their fault before I go and shout at anyone. And I want this to refresh next quarter without me asking you again."

**What you have:** four quarterly depot exports and a depot reference list, in the **Data library** as *Swiftline Couriers: depot run exports* and downloadable below. One row per van run: parcels loaded, delivered, failed, delivered on time, distance and fuel.

**They are not the same shape.** The column order differs, one depot exports a title block above the header, one measures distance in **miles**, one leaves fuel readings blank on some runs, and one file ends with a totals row. Build the combine so that next quarter's drop works with a refresh, not a rewrite.

**The company's definition:** on-time rate = parcels delivered on time ÷ parcels delivered. Failure rate = failed ÷ parcels loaded.`,
    files: [{ label: 'swiftline_depot_exports.zip (4 CSVs + README)', path: 'swiftline_depot_exports.zip' }],
    datasets: ['swiftline-depots'],
    steps: [
      {
        id: 's1', title: 'One table out of four', type: 'numbers', topics: ['pq-append', 'pq-clean'], concept: 'dedup', answersKey: 'cap-swiftline',
        pick: (a) => [a.group.runs, a.group.parcels],
        prompt: 'Combine the four depot exports into one table, keeping the depot each row came from. How many **van runs** are there in the quarter, and how many **parcels** were loaded in total?',
        questions: [
          { label: 'Number of van runs', tolerance: 0 },
          { label: 'Parcels loaded', tolerance: 0 },
        ],
        hints: [
          'Look at each file before you combine anything. Two of them will not line up with the others as they stand.',
          'One file carries a totals line at the bottom. If it survives into your table, every figure you produce afterwards is wrong.',
          'Appending matches columns by name, so a file whose columns are in a different order is fine. A file whose header is not the first row is not.',
        ],
        explain: '1,404 runs and 188,822 parcels. If you got 1,405 runs the Easton totals row is still in there, which also adds about 19,000 phantom parcels. The depot code is in the file name, so keep it as a column while you combine: without it none of the later questions can be answered.',
      },
      {
        id: 's2', title: 'The on-time rate, and who is behind it', type: 'numbers', topics: ['pq-reshape', 'pq-custom'], concept: 'kpi', answersKey: 'cap-swiftline',
        pick: (a) => [a.group.onTimePct, a.worstOnTime, a.worstOnTimePct],
        prompt: 'Using the company definition, what is the group\'s **on-time rate** for the quarter, which **depot** is worst, and what is its on-time rate?',
        questions: [
          { label: 'Group on-time rate (%)', percent: true, tolerance: 0.3 },
          { label: 'Depot with the worst on-time rate', accept: ['Easton', 'ET', 'easton'] },
          { label: 'Its on-time rate (%)', percent: true, tolerance: 0.3 },
        ],
        hints: [
          'Build the rate from the totals, not by averaging each run\'s own rate: a run carrying 200 parcels should not count the same as one carrying 60.',
          'The depot names are in the reference list; merge it in so the answer reads as a name rather than a code.',
        ],
        explain: '93.5% across the group, and Easton is clearly worst at 86.3% against 91.6% to 95.7% elsewhere. Averaging the per-run rates instead of building the rate from the totals gives a slightly different number and a worse habit.',
      },
      {
        id: 's3', title: 'Is that a fair comparison?', type: 'numbers', topics: ['pq-merge', 'think-averages'], concept: 'denominator', answersKey: 'cap-swiftline',
        pick: (a) => [a.worstKmPerParcel, a.densestKmPerParcel, a.worstParcelsPerRun],
        prompt: 'Before blaming anyone, measure the job each depot is being asked to do. How many **kilometres per parcel** does the worst depot drive, how many does the **tightest** depot drive, and how many parcels does an average run carry at the worst depot?',
        questions: [
          { label: 'Kilometres per parcel at the worst depot', tolerance: 0.08 },
          { label: 'Kilometres per parcel at the tightest depot', tolerance: 0.08 },
          { label: 'Parcels per run at the worst depot', tolerance: 2 },
        ],
        hints: [
          'One depot reports distance in miles. If you compare that column as it stands, that depot looks far more efficient than it is.',
          'Kilometres per parcel is total distance ÷ total parcels, at depot level.',
        ],
        explain: 'Easton drives about 2.14 km for every parcel; Marlow drives 0.52 km, four times less. An Easton run carries about 81 parcels against 148 at Marlow and 157 at Harbor City. Easton is the rural depot with four vans: the same driver covers far more ground for far fewer drops. If you skipped the miles-to-kilometres conversion, Easton looked like 1.33 km per parcel and the whole comparison was quietly wrong.',
      },
      {
        id: 's4', title: 'What does that support?', type: 'choice', topics: ['think-causation', 'think-averages'], answer: 2,
        prompt: 'The depot with the worst on-time rate also drives four times as far per parcel as the tightest depot, and carries roughly half as many parcels per run. What is the best-supported reading?',
        options: [
          'Its drivers are slower than the drivers at the other depots',
          'Its on-time rate is fine, and the difference is a rounding effect',
          'It is doing a different job, so a single group-wide target measures the route, not the depot',
          'The depots cannot be compared at all, so the on-time rate should not be reported',
        ],
        explain: 'Nothing in the data separates driver performance from route density, and the density difference is large enough to explain a gap of this size on its own. The honest move is not to abandon the metric but to compare each depot with its own past, or to set a target that accounts for drops per kilometre. The data would also support asking why a rural depot has four vans for the widest area.',
      },
      {
        id: 's5', title: 'What the report says without the worst depot, and what is missing', type: 'numbers', topics: ['pq-clean', 'think-trust'], concept: 'anomaly', answersKey: 'cap-swiftline',
        pick: (a) => [a.onTimePctExcludingWorst, a.missingFuelRuns],
        prompt: 'Two last checks before you publish. What is the on-time rate for the **other three depots together**, and how many runs in the whole quarter have **no fuel reading** at all?',
        questions: [
          { label: 'On-time rate excluding the worst depot (%)', percent: true, tolerance: 0.3 },
          { label: 'Runs with no fuel reading', tolerance: 0 },
        ],
        hints: [
          'The missing fuel values are not blank in every file: one depot writes something else instead.',
          'Ask yourself what a fuel-efficiency figure would do with those rows before you put one on a dashboard.',
        ],
        explain: '94.2% without Easton, against 93.5% with it: one depot moves the group number by less than a point, because it carries only a tenth of the parcels. And 37 Easton runs record fuel as "n/a" rather than as a blank, which Power Query will happily read as text. Any fuel-per-kilometre figure built on those rows divides a short-changed total by the full distance and understates consumption.',
      },
      {
        id: 'final', title: 'Your note to the operations director', type: 'report', topics: ['think-communication', 'pbi-visuals'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the operations director a short note: the group on-time rate, who is behind and whether that is fair, and what you would put on a depot dashboard that refreshes each quarter. Then tick the points your answer covers.',
        checklist: [
          { point: 'Gives the group on-time rate from the combined data', keywords: [['93.5', '93.4', '93'], ['on-time', 'on time']] },
          { point: 'Names the worst depot with its rate', keywords: [['easton'], ['86', '86.3']] },
          { point: 'Shows the route density difference rather than asserting it', keywords: [['km per parcel', 'kilometres per parcel', 'per parcel', 'density', 'parcels per run', '2.1', '0.5', '81']] },
          { point: 'Warns against blaming the depot on the raw rate alone', keywords: [['fair', 'like for like', 'like-for-like', 'not their fault', 'compare', 'confound', 'different job', 'rural']] },
          { point: 'Mentions a data quality issue found while combining (totals row, miles, missing fuel)', keywords: [['total', 'footer', 'miles', 'mile', 'n/a', 'fuel', 'header', 'title']] },
          { point: 'Says how the combine will survive next quarter\'s files', keywords: [['refresh', 'folder', 'next quarter', 'by name', 'parameter', 'automatic', 'again']] },
          { point: 'Proposes a target or a comparison that accounts for the difference between depots', keywords: [['target', 'per depot', 'own trend', 'baseline', 'adjust', 'drops per', 'density']] },
        ],
        model: `**The headline.** Across 1,404 runs and 188,822 parcels this quarter, we delivered 93.5% of parcels on time. That number did not exist before, because the four depots each export a different shape of file.

**Who is behind.** Easton, at 86.3%, against Bayport 91.6%, Harbor City 94.5% and Marlow 95.7%. Easton also has the highest failure rate, 7.4% of parcels loaded against 3.1% to 5.0% elsewhere.

**Whether that is fair.** I do not think we should read it as a performance gap. Easton drives 2.14 km for every parcel it delivers; Marlow drives 0.52 km. An Easton run carries about 81 parcels, Marlow 148, Harbor City 157. It is the rural depot, with four vans covering the widest area, and it handles about a tenth of our parcels. Nothing in this data separates "the driver was slow" from "the drops are twenty minutes apart", and the density difference on its own is more than enough to explain the gap. Taking Easton out of the group figure moves it from 93.5% to 94.2%, which is a useful way to see how little it changes the headline and how much it changes their scorecard.

**Data quality worth knowing about.** Easton's file ends with a totals row that, left in, adds about 19,000 parcels that were never loaded. Its distances are in miles, so an unconverted comparison makes it look like the most efficient depot in the group. Marlow's export has three title lines above the header. And 37 Easton runs record fuel as "n/a" rather than leaving it blank, so any fuel-per-kilometre figure built on them understates consumption by about two litres per 100 km.

**What I would build.** One dashboard page, refreshed from the folder rather than rebuilt:
1. Group on-time rate and failure rate for the quarter, with the previous quarter beside them.
2. On-time rate by depot as a bar chart, with each depot's own previous quarter as a reference line, so a depot is compared with itself first.
3. Parcels per run and kilometres per parcel by depot, on the same page as the on-time rate, so nobody can read one without the other.
4. A trend of the group rate by week, which is where a genuine deterioration would show up first.

The combine reads the whole folder, takes the depot code from the file name, matches columns by name rather than position, converts miles to kilometres where the source uses them, and drops any row whose run ID is not a real run ID. Next quarter's four files land in the folder and the report refreshes.

**What I would want next.** Promised delivery windows and actual timestamps, rather than a pre-summarised "OnTime" count. With those we could say whether late means five minutes or five hours, which is what the complaining customers actually care about, and we could set a density-aware target instead of one number for four very different jobs.`,
      },
    ],
  },

  // ================================================================ Marketing: Harbor & Pine
  {
    id: 'cap-marketing', title: 'Harbor & Pine: which campaigns are worth repeating?', business: 'Marketing', difficulty: 3, minutes: 70,
    skills: ['Excel', 'Power Query', 'Analyst Thinking'], recommendedAfter: 'Power Query Beginner and Excel Intermediate',
    summary: 'Two ad platforms, two different export formats, and a budget sheet that does not quite match either. Work out what the quarter actually returned.',
    brief: `
**Harbor & Pine** is an online homeware shop. It spent a quarter's marketing budget across a search platform and a social platform, and the two report in completely different ways.

The marketing lead writes:
> "Next quarter's budget is due on Friday. I have one export from search, one from social, and the register we filled in at the start of the quarter. They disagree with each other and I have run out of patience. Tell me what we actually got back, what I should spend more on, and what I should stop."

**What you have:** the Q2 2026 search export, the Q2 2026 social export, and the campaign register, in the **Data library** as *Harbor & Pine: ad platform exports* and downloadable below.

**The exports do not match.** The two platforms name their columns differently, one writes money with a currency symbol, and the campaign code is buried at the front of a longer campaign name in both. The register lists a **channel, an objective and a quarterly budget** for each campaign, and it is the only place the objective is recorded.

**The company's definition:** ROAS = value of sales attributed to a campaign ÷ what that campaign cost.`,
    files: [{ label: 'harbor_pine_ads.zip (2 exports + register)', path: 'harbor_pine_ads.zip' }],
    datasets: ['harbor-pine-ads'],
    steps: [
      {
        id: 's1', title: 'What did the quarter cost and return?', type: 'numbers', topics: ['pq-append', 'pq-types'], concept: 'text-numbers', answersKey: 'cap-marketing',
        pick: (a) => [a.totalSpend, a.totalValue],
        prompt: 'Line the two exports up and stack them. Across everything that ran in Q2 2026, what did the shop **spend**, and what was the **value of the sales** attributed to it?',
        questions: [
          { label: 'Total spend, Q2 2026', tolerance: 60 },
          { label: 'Total attributed sales value, Q2 2026', tolerance: 400 },
        ],
        hints: [
          'The two files describe the same four ideas with different column names. Rename before you append, not after.',
          'One platform writes amounts with a currency symbol, which arrives as text. A total that looks far too small is the usual symptom.',
        ],
        explain: 'About 73,360 spent and 363,120 returned. If the social spend came out near zero, the "$" in that column stopped it converting to a number and it was silently skipped.',
      },
      {
        id: 's2', title: 'Which channel pays better?', type: 'numbers', topics: ['pq-merge', 'think-metrics'], concept: 'kpi', answersKey: 'cap-marketing',
        pick: (a) => [a.searchRoas, a.socialRoas],
        prompt: 'The register is the only place that says which channel a campaign belongs to, so join it on. For the campaigns **in the register**, what was the ROAS of **search** and the ROAS of **social**?',
        questions: [
          { label: 'Search ROAS (value ÷ spend)', tolerance: 0.12 },
          { label: 'Social ROAS (value ÷ spend)', tolerance: 0.12 },
        ],
        hints: [
          'The campaign code sits at the front of the campaign name, before the separator. Extract it before you join.',
          'Build each channel\'s ROAS from that channel\'s totals, not by averaging the campaigns\' own ROAS figures.',
          'Keep the join to campaigns that are in the register, as the question says. Anything that will not match is the subject of a later step.',
        ],
        explain: 'Search returns about 5.64 for every 1.00 spent; social returns about 3.62. Both are well above 1, so neither is a disaster, but the search platform is returning about 56% more per dollar. Note what this comparison cannot tell you: the two channels are not doing the same job, and neither export knows what a customer saw before they searched.',
      },
      {
        id: 's3', title: 'The campaign at the bottom', type: 'numbers', topics: ['pq-custom', 'xl-pivots'], concept: 'segmentation', answersKey: 'cap-marketing',
        pick: (a) => [a.worstCampaign, a.worstCampaignRoas, a.awarenessSpend],
        prompt: 'Rank the registered campaigns by ROAS. Which campaign is **worst**, what is its ROAS, and what did the shop spend in total on the campaigns whose registered objective is **Awareness**?',
        questions: [
          { label: 'Campaign code with the worst ROAS', accept: ['HP-F04', 'hp-f04', 'F04', 'f04'] },
          { label: 'Its ROAS', tolerance: 0.06 },
          { label: 'Total spend on Awareness campaigns', tolerance: 60 },
        ],
        hints: ['Total the spend and value per campaign code first, then divide. Dividing row by row and averaging is a different, worse number.', 'The objective is in the register, not in either export.'],
        explain: 'HP-F04 returns 0.44 for every 1.00 spent, the worst of the eleven, and HP-F03 is next at 0.92. Both are **Awareness** campaigns, and between them they account for about 8,640 of spend. That is the moment to slow down: the two worst campaigns on this measure are the two that were never bought to produce sales this quarter.',
      },
      {
        id: 's4', title: 'What would you do with them?', type: 'choice', topics: ['think-metrics', 'think-questions'], answer: 1,
        prompt: 'The two lowest-ROAS campaigns are the two whose registered objective is Awareness. What is the best-supported recommendation?',
        options: [
          'Cut both immediately: any campaign under 1.0 ROAS is losing money',
          'Judge them against what they were bought to do, and say clearly that this data cannot do that',
          'Move their budget to search, because search has the highest ROAS',
          'Ignore ROAS entirely, since it clearly does not work',
        ],
        explain: 'ROAS answers "did this campaign produce sales in the window the platform can see". An awareness campaign is bought for reach and for demand that shows up later, often through the search campaigns that then get the credit. Cutting them on this number is a decision made with the wrong measure. The honest report says so, names the figures the data cannot supply, and asks for them.',
      },
      {
        id: 's5', title: 'Does the register match reality?', type: 'numbers', topics: ['pq-merge', 'think-trust'], concept: 'anomaly', answersKey: 'cap-marketing',
        pick: (a) => [a.overBudgetCount, a.worstOverCampaign, a.worstOverAmount],
        prompt: 'Compare each campaign\'s actual spend with the quarterly budget in the register. How many campaigns **spent more than their budget**, which one overspent by the most, and by how much?',
        questions: [
          { label: 'Campaigns that spent more than their budget', tolerance: 0 },
          { label: 'Campaign code that overspent by the most', accept: ['HP-S02', 'hp-s02', 'S02', 's02'] },
          { label: 'Its overspend in dollars', tolerance: 40 },
        ],
        hints: ['One row per campaign on each side before you compare.', 'Overspend is actual minus budget, and only counts when it is positive.'],
        explain: 'Three campaigns went over: HP-S02 by about 993, HP-S04 by 624 and HP-F03 by 380. None of them is dramatic on its own, which is why nobody noticed: the register was filled in once in April and never looked at again.',
      },
      {
        id: 's6', title: 'What the join leaves behind', type: 'numbers', topics: ['pq-merge', 'sql-joins'], concept: 'anti-join', answersKey: 'cap-marketing',
        pick: (a) => [a.unregisteredSpend, a.neverRanCount],
        prompt: 'Look at what did **not** match, in both directions. How much Q2 spend belongs to a campaign that is **not in the register**, and how many registered campaigns show **no spend at all**?',
        questions: [
          { label: 'Q2 spend on campaigns missing from the register', tolerance: 40 },
          { label: 'Registered campaigns with no spend at all', tolerance: 0 },
        ],
        hints: [
          'An inner join hides both of these. Keep the unmatched rows on each side and look at them.',
          'Check the codes carefully before you conclude a campaign is missing: a case difference or a stray space is a different problem from a genuinely unregistered campaign.',
        ],
        explain: 'About 2,746 was spent on HP-F05, which is in neither the register nor anybody\'s plan, and HP-S07 sits in the register with a 2,500 budget and never ran. Both were invisible while the two tables were joined the usual way. These are the findings that make a marketing lead trust the rest of the report, because they are the ones they can check against their own memory.',
      },
      {
        id: 'final', title: 'Your recommendation for next quarter', type: 'report', topics: ['think-communication', 'think-questions'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the marketing lead a short note in time for Friday: what the quarter returned, what you would spend more and less on, and what you are not able to answer with this data. Then tick the points your answer covers.',
        checklist: [
          { point: 'States the quarter\'s spend and return, not just a ratio', keywords: [['73', '73,3'], ['363', '363,1']] },
          { point: 'Compares the two channels on ROAS', keywords: [['search'], ['social'], ['5.6', '3.6', '5.64', '3.62']] },
          { point: 'Names the worst campaigns and their objective, instead of just ranking them', keywords: [['hp-f04', 'f04', 'hp-f03', 'f03'], ['awareness', 'objective', 'brand']] },
          { point: 'Argues against cutting awareness campaigns on ROAS alone', keywords: [['awareness', 'brand'], ['wrong measure', 'not what', 'bought to', 'later', 'reach', 'attribut', 'cannot']] },
          { point: 'Reports the budget discrepancies found against the register', keywords: [['budget', 'register', 'overspend', 'over budget'], ['three', '3', '993', '992']] },
          { point: 'Reports the unmatched campaigns in both directions', keywords: [['hp-f05', 'f05', 'unregistered', 'not in the register'], ['hp-s07', 's07', 'never ran', 'no spend']] },
          { point: 'Makes a concrete budget recommendation for next quarter', keywords: [['next quarter', 'recommend', 'move', 'shift', 'increase', 'more', 'spend']] },
          { point: 'Names what the data cannot answer (attribution, the customer path)', keywords: [['attribut', 'last click', 'last-click', 'cannot tell', 'do not know', 'path', 'window', 'incremental']] },
        ],
        model: `**The quarter in one line.** We spent about 73,360 and the platforms attribute about 363,120 of sales to it, a blended return of roughly 4.95 for every 1.00 spent. That is a good quarter, and I would say so before saying anything else.

**By channel.** Search returned about 5.64, social about 3.62, for the campaigns in the register. Search is the better performer on this measure by about 56%.

**Where I would be careful.** The two lowest-ROAS campaigns, HP-F04 at 0.44 and HP-F03 at 0.92, are the two whose registered objective is **Awareness**. Between them they cost about 8,640. Judging them on ROAS is judging them on a job they were not bought to do, and some of the demand they create shows up later inside the search campaigns that then get the credit. I am not recommending we cut them on this number, and I would not let anyone else do so either.

**Housekeeping that matters.** Three campaigns spent more than their registered budget: HP-S02 by about 993, HP-S04 by 624, HP-F03 by 380. Beyond that, about 2,746 went to HP-F05, which is not in the register at all, and HP-S07 holds a 2,500 budget and never spent a cent. None of that is visible if you join the two tables the ordinary way, because an ordinary join quietly drops exactly the rows that do not match.

**What I would do with next quarter's budget.**
1. **Move money into search, but not blindly.** HP-S01 returns about 12 to 1 and did not spend its full budget; that is the first place I would add. HP-S03 and HP-S04 return under 1.6 and are where the increase should come from.
2. **Keep the awareness spend flat** until we can measure it properly, rather than cutting or growing it on a number that cannot see it.
3. **Reconcile the register before the quarter starts, and once in the middle.** Two of this quarter's surprises would have been caught by a fifteen-minute check.

**What this data cannot tell you.** It is all last-click, inside each platform's own attribution window, and each platform counts its own conversions. It cannot tell us what a customer saw before they searched, whether the two platforms are claiming the same sale, or what would have happened if we had spent nothing: some of those sales would have arrived anyway. If the Friday decision is large, the thing worth asking for is a holdout test on one campaign next quarter, which is the only way this question gets a real answer.`,
      },
    ],
  },
];
