// Capstone projects: a business situation, real data, no list of formulas. Number steps are
// checked automatically; the final report uses a checklist plus a model answer.

import { PROJECTS_EXTRA } from './projects-extra.js';
import { PROJECTS_EXTRA2 } from './projects-extra2.js';
import { evaluationSteps, criteriaForStep } from './projects-evaluation.js';

const REPORT_FIELDS = ['What did you find?', 'What caused the problem?', 'Which numbers support your conclusion?', 'What would you recommend?', 'What additional data would you request?'];

const BASE_PROJECTS = [
  {
    id: 'cap-restaurant', title: 'Olive & Ember: why did food costs rise?', business: 'Restaurant', difficulty: 4, minutes: 90,
    skills: ['SQL', 'Excel', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (joins, CTEs)',
    summary: 'Management believes food costs jumped in the last three months. Find out whether that\'s true, why, and what to do.',
    brief: `
You are the data analyst for **Olive & Ember Kitchen**, a group of three restaurants (Downtown, Riverside, Airport).

The owner writes:
> "Our food costs have gone up a lot in the last three months (June–August 2026). Profit is down and I don't know why. Menu prices haven't changed. Is it the suppliers? Waste? One of the sites? I need to know what's going on and what to do about it by Friday."

**What you have:** daily sales per dish, recipes (ingredients per portion), every supplier purchase, the weekly waste log, month-end stock counts, labour and running costs, from January 2025 to August 2026. The same data is in the **SQL Lab** (database *Olive & Ember*) and in the downloadable pack.

**Company definition:** food cost % = cost of ingredients used ÷ net sales, where ingredients used = opening stock + purchases − closing stock (stock counted on the last day of each month).

Nobody will tell you which calculations to do. Work through the steps below: each asks for a finding, not a formula.`,
    files: [{ label: 'olive_ember_capstone_pack.zip (7 files)', path: 'olive_ember_capstone_pack.zip' }], db: 'restaurant', datasets: ['olive-ember', 'restaurant-db'],
    steps: [
      { id: 's1', title: 'Is the problem real?', type: 'numbers', topics: ['sql-business', 'think-trust'], concept: 'kpi', answersKey: 'cap-restaurant',
        pick: (a) => [a.foodCostBefore, a.foodCostAfter],
        prompt: 'Measure it first. What was the group\'s food cost % for **January–May 2026**, and for **June–August 2026**?',
        questions: [{ label: 'Food cost %, Jan–May 2026', percent: true, tolerance: 0.3 }, { label: 'Food cost %, Jun–Aug 2026', percent: true, tolerance: 0.3 }],
        hints: ['Opening stock for Jan–May is the count on 2025-12-31; closing is 2026-05-31. For Jun–Aug: 2026-05-31 and 2026-08-31.', 'Sum inventory_counts.value_at_cost for those dates, purchases.line_total in the period, and daily_sales.net_sales in the period.'],
        explain: 'Food cost rose from about 25.7% to 28.1% of sales: +2.3 percentage points, roughly 9% more expensive per dollar of sales. The owner is right that something changed.' },
      { id: 's2', title: 'Is it one site or all of them?', type: 'numbers', topics: ['sql-business'], answersKey: 'cap-restaurant',
        pick: (a) => ['Olive & Ember Airport', a.byRestaurant[2][1]],
        prompt: 'Which restaurant has the **highest** food cost % in June–August 2026, and what is it?',
        questions: [{ label: 'Restaurant with the highest food cost %', accept: ['Olive & Ember Airport', 'Airport', 'AP'] }, { label: 'Its food cost % (Jun–Aug 2026)', percent: true, tolerance: 0.3 }],
        hints: ['Same calculation as step 1, grouped by restaurant.'],
        explain: 'All three sites got worse, but the Airport most of all (≈29%). "All sites up" points to something shared (supplier prices); "one site much worse" points to something local (waste, portions).' },
      { id: 's3', title: 'Did suppliers raise prices?', type: 'numbers', topics: ['sql-business', 'sql-window-lag'], concept: 'anomaly', answersKey: 'cap-restaurant',
        pick: (a) => [a.beefPct, a.riversideVsDowntownTomatoJul],
        prompt: 'Look at purchase prices. (1) By what % did the average price per kg of **Beef mince** change from May to June 2026? (2) In **July 2026**, how much more per kg did **Riverside** pay for tomatoes than **Downtown** did?',
        questions: [{ label: 'Beef mince price change May → June 2026 (%)', percent: true, tolerance: 0.8 }, { label: 'Riverside vs Downtown tomato price, July 2026 (% more)', percent: true, tolerance: 1.5 }],
        hints: ['Use weighted prices: SUM(line_total) / SUM(qty), per month (and restaurant).', 'Compare Riverside with another site in the SAME month: tomato prices move with the seasons, so comparing Riverside with its own spring would hide the change. Also check which supplier Riverside uses from June.'],
        explain: 'Prime Meats raised beef about 22–23% in June. Riverside switched produce supplier in June (GreenLeaf → QuickVeg) and pays ~18% more than Downtown for the same tomatoes. That is hidden if you only compare Riverside with its own spring, because summer tomatoes are cheaper.' },
      { id: 's4', title: 'Waste', type: 'numbers', topics: ['sql-joins', 'sql-business'], answersKey: 'cap-restaurant',
        pick: (a) => [a.topWasteJul, a.wasteJul[0][1]],
        prompt: 'Which restaurant had the **highest waste cost in July 2026**, and roughly how much? (Value waste at that restaurant\'s average July purchase price for each ingredient.)',
        questions: [{ label: 'Restaurant with the highest July waste cost', accept: ['Olive & Ember Airport', 'Airport', 'AP'] }, { label: 'Its July waste cost ($)', tolerance: 150 }],
        hints: ['waste_log has quantities, not money. Join it to a per-restaurant, per-ingredient average unit cost for July.', 'Look at the waste reasons for the Airport in July, especially around 12 July.'],
        explain: 'The Airport wasted about twice as much as Riverside in July, including a fridge failure on 12 July (equipment failure). Its waste has run at roughly 2.5× normal since June.' },
      { id: 's5', title: 'What didn\'t change?', type: 'choice', topics: ['think-trust'], answer: 2,
        prompt: 'The owner says menu prices haven\'t changed. Check it. Which statement is true?',
        options: ['Menu prices rose in spring 2026', 'Menu prices fell in 2026', 'Menu prices have not changed since October 2025, so nothing offsets the higher costs', 'Menu prices differ by restaurant'],
        explain: 'menu_price_history shows the last change on 2025-10-01. Costs rose, prices didn\'t, so margin fell.' },
      { id: 'final', title: 'Your findings for the owner', type: 'report', topics: ['think-communication', 'think-causation', 'sql-business'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write your answer to the owner. Be specific, and use numbers. Then tick the checklist points your answer covers.',
        checklist: [
          { point: 'States the size of the problem (≈25.7% → 28.1% food cost)', keywords: [['25', '28']] },
          { point: 'Names the beef price increase from Prime Meats (~22%)', keywords: [['beef', 'prime'], ['22', 'price']] },
          { point: 'Names Riverside\'s produce supplier switch (QuickVeg, ~18% dearer)', keywords: [['riverside'], ['quickveg', 'supplier', 'switch']] },
          { point: 'Names Airport waste (fridge failure, higher waste since June)', keywords: [['airport'], ['waste', 'fridge']] },
          { point: 'Notes menu prices unchanged since Oct 2025', keywords: [['menu'], ['price']] },
          { point: 'Recommends concrete actions (renegotiate or switch supplier, review menu prices, waste/portion controls at the Airport)', keywords: [['negotiat', 'renegotiat', 'switch', 'menu price', 'reprice', 'waste control', 'portion']] },
          { point: 'Asks for useful additional data (supplier contracts, portion audits, stock-take detail, sales mix)', keywords: [['contract', 'portion', 'audit', 'mix', 'additional', 'request']] },
        ],
        model: `**What I found.** Food cost rose from 25.7% of sales (Jan–May 2026) to 28.1% (Jun–Aug), at every site and worst at the Airport (≈29%).

**Causes.**
1. **Beef prices:** Prime Meats raised beef mince and ribeye about 22% from 1 June. Burgers and steak are big sellers, so this is the largest single driver across all sites.
2. **Riverside's supplier switch:** from June, Riverside buys produce from QuickVeg, about 18% dearer than GreenLeaf for the same items (hidden by cheaper summer tomatoes).
3. **Airport waste and portions:** waste has run at about 2.5× normal since June, plus a fridge failure on 12 July (salmon, prawns, dairy). The gap between actual and recipe-based cost has also grown, which suggests bigger portions.
4. **Dairy** rose ~8% in May (smaller effect).
5. **Menu prices** haven't changed since October 2025, so nothing offset these rises.

**Recommendations.** Renegotiate beef or get competing quotes; review whether Riverside's switch to QuickVeg is still needed; fix the Airport fridge and introduce daily waste logging and portion checks; consider a targeted menu price review on beef dishes.

**More data I'd ask for.** Supplier contracts and the reason for the QuickVeg switch, the Airport kitchen's staffing and ordering records, portion audits, and a count of stock by day around 12 July.`,
      },
    ],
  },
  {
    id: 'cap-retail', title: 'Cedarline: is the West region really underperforming?', business: 'Retail', difficulty: 4, minutes: 75,
    skills: ['SQL', 'Excel', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate + Excel Intermediate',
    summary: 'West missed its target and the COO wants to know why. Is it the region, the new store, or the target?',
    brief: `
You are an analyst at **Cedarline Outdoor Supply** (5 stores plus an online shop).

The COO writes:
> "West is underperforming. It missed its Q2 target badly, while the other regions are fine. We opened the Canyon store last September, so West should be flying. Figure out why and tell me what to do."

**What you have:** the Cedarline database in the **SQL Lab** (orders since 2024), and the Q2 2026 order-lines export with regional targets (in the Data library). Company rules: net revenue = quantity × unit_price × (1 − discount), completed orders only. Region = the store's region for In-Store sales, the customer's region for Online sales.`,
    files: [{ label: 'cedarline_q2_2026_order_lines.xlsx (with targets)', path: 'retail/cedarline_q2_2026_order_lines.xlsx' }], db: 'cedarline', datasets: ['cedarline-q2', 'cedarline-db'],
    steps: [
      { id: 's1', title: 'How big is the miss?', type: 'numbers', topics: ['sql-multijoins', 'xl-sumifs'], answersKey: 'cap-retail',
        pick: (a) => [a.westAttainment, Math.abs(a.westGap)],
        prompt: 'West\'s **Q2 2026 attainment** vs target (%) and **how far below target** it was (in $).',
        questions: [{ label: 'West Q2 attainment (%)', percent: true, tolerance: 0.3 }, { label: 'How far below target ($)', tolerance: 60 }],
        hints: ['Targets are on the Targets sheet of the Q2 workbook. Actuals: completed Q2 orders credited with the order-region rule.', 'In SQL, region = CASE WHEN channel = \'In-Store\' THEN store region ELSE customer region END.'],
        explain: 'West reached ~87% of target (about $14k short). The other regions were at 98–107%.' },
      { id: 's2', title: 'Store by store', type: 'numbers', topics: ['sql-joins', 'sql-business'], answersKey: 'cap-retail',
        pick: (a) => [a.summitChangePct, a.canyon2026],
        prompt: 'Compare the West stores: (1) the % change in **Summit (W01)** in-store net revenue, Jan–Aug 2026 vs Jan–Aug 2025 (negative if it fell); (2) **Canyon (W02)** in-store net revenue, Jan–Aug 2026.',
        questions: [{ label: 'Summit revenue change (%)', percent: true, tolerance: 0.6 }, { label: 'Canyon revenue Jan–Aug 2026 ($)', tolerance: 60 }],
        hints: ['Filter channel = \'In-Store\' and store_id, compare the same months of two years.'],
        explain: 'Summit fell about 30% while Canyon ramped up to ~$55k. The obvious question: is Canyon adding new customers, or taking Summit\'s?' },
      { id: 's3', title: 'Is West growing at all?', type: 'numbers', topics: ['sql-business'], answersKey: 'cap-retail',
        pick: (a) => [a.westInstoreGrowthPct],
        prompt: 'West **in-store** net revenue (Summit + Canyon), Jan–Aug 2026 vs Jan–Aug 2025: what is the growth %?',
        questions: [{ label: 'West in-store growth (%)', percent: true, tolerance: 0.6 }],
        hints: ['(Summit 2026 + Canyon 2026) ÷ Summit 2025 − 1.'],
        explain: 'West in-store grew about 37%, in line with North (+53%) and East (+39%). West is growing; it just isn\'t growing as fast as a target that assumed Canyon would add sales on top of Summit.' },
      { id: 's4', title: 'Diagnosis', type: 'choice', topics: ['think-communication', 'think-causation'], answer: 1,
        prompt: 'Which explanation fits the evidence best?',
        options: ['West customers stopped buying outdoor gear', 'The target assumed Canyon would add new sales on top of Summit, but Canyon mostly took Summit\'s customers (cannibalisation)', 'Online sales collapsed in the West', 'A data error: West revenue is missing'],
        explain: 'Summit −30%, Canyon +$55k, West total +37%: that is cannibalisation plus a target built on the wrong assumption.' },
      { id: 'final', title: 'Your answer to the COO', type: 'report', topics: ['think-communication', 'think-tools'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write your answer to the COO, then tick the checklist points you covered.',
        checklist: [
          { point: 'Quantifies the miss (≈87%, ≈$14k)', keywords: [['87', '14']] },
          { point: 'Shows West is still growing (~+37% in-store)', keywords: [['37', 'growing', 'grew']] },
          { point: 'Explains cannibalisation: Summit fell ~30% as Canyon ramped up', keywords: [['summit'], ['canyon'], ['30', 'cannibal', 'took']] },
          { point: 'Questions the target (assumed Canyon would be fully additional)', keywords: [['target'], ['assum', 'unrealistic', 'reset', 'wrong']] },
          { point: 'Recommends actions (reset target, local marketing for Canyon, review store overlap)', keywords: [['recommend', 'reset', 'marketing', 'review']] },
          { point: 'Requests more data (customer addresses/overlap, footfall, costs per store)', keywords: [['footfall', 'traffic', 'overlap', 'cost', 'address', 'survey']] },
        ],
        model: `**What I found.** West reached 87% of its Q2 target (≈$14k short); the other regions hit 98–107%.

**Cause.** It isn't falling demand: West in-store revenue grew ~37% (Jan–Aug, year on year), in line with the other regions. But Summit's revenue fell ~30% as Canyon ramped up to ~$55k: many of Canyon's customers used to shop at Summit. The target assumed Canyon would be entirely additional.

**Numbers.** Summit Jan–Aug $81k → $56k; Canyon $55k; West combined +37%.

**Recommendation.** Reset West's target on a realistic "two stores sharing one area" basis; invest in local marketing to bring *new* customers to Canyon; review the two stores' catchment overlap before planning further openings.

**More data.** Customer postcodes (how far people travel to each store), footfall, and each store's costs, to judge whether two stores are more profitable than one.`,
      },
    ],
  },
  {
    id: 'cap-hr', title: 'Brightpath: why are drivers leaving?', business: 'HR', difficulty: 4, minutes: 75,
    skills: ['SQL', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (joins, CASE, dates)',
    summary: 'Driver turnover is up sharply. Measure it, find the drivers of the drivers, and recommend a fix.',
    brief: `
You are the people-analytics analyst at **Brightpath Logistics**.

The HR director writes:
> "Transport keeps losing drivers. Recruiting them costs a fortune and deliveries are suffering. How bad is it compared with before, what's causing it, and what should we do?"

**What you have:** the Brightpath HR database in the **SQL Lab**: employees (with hire and termination dates), salary history, monthly attendance and overtime (2024 onwards), performance ratings and exit interviews.

**Definition:** voluntary turnover rate for a year = voluntary leavers that year ÷ average headcount ((1 Jan + 31 Dec) ÷ 2).`,
    files: [], db: 'hr', datasets: ['hr-db'],
    steps: [
      { id: 's1', title: 'How bad is it?', type: 'numbers', topics: ['sql-business', 'sql-case'], answersKey: 'cap-hr',
        pick: (a) => [a.transportVol2023, a.transportVol2025],
        prompt: 'Transport\'s voluntary turnover rate in **2023** and in **2025** (%).',
        questions: [{ label: 'Transport voluntary turnover 2023 (%)', percent: true, tolerance: 0.6 }, { label: 'Transport voluntary turnover 2025 (%)', percent: true, tolerance: 0.6 }],
        hints: ['Transport is department_id 2. Headcount on a date: hired on or before it, and not terminated on or before it.'],
        explain: 'It roughly tripled: from ~13% to ~39%. Big enough to matter.' },
      { id: 's2', title: 'What do leavers say?', type: 'numbers', topics: ['sql-joins'], answersKey: 'cap-hr',
        pick: (a) => [a.topReasonTransport],
        prompt: 'The **most common exit-interview reason** among Transport leavers since 2025.',
        questions: [{ label: 'Top reason', accept: ['Workload/overtime', 'Workload', 'Overtime'] }],
        hints: ['exit_interviews joins employees on employee_id; filter department 2 and exit_date >= 2025-01-01.'],
        explain: 'Workload/overtime tops the list, with pay close behind.' },
      { id: 's3', title: 'Is overtime really up?', type: 'numbers', topics: ['sql-dates', 'sql-aggregate'], answersKey: 'cap-hr',
        pick: (a) => [a.driverOT2024, a.driverOT2025],
        prompt: 'The average **monthly overtime hours** per driver (job titles containing "Driver") in **2024** and in **2025**.',
        questions: [{ label: 'Average monthly overtime per driver, 2024', tolerance: 0.6 }, { label: 'Average monthly overtime per driver, 2025', tolerance: 0.6 }],
        hints: ['attendance_monthly.month is text like \'2025-03\'; use LIKE \'2025-%\'.'],
        explain: 'Overtime more than doubled (~11 → ~27 hours per month). Fewer drivers means more overtime, which means more leavers: a vicious circle.' },
      { id: 's4', title: 'What changed in pay?', type: 'choice', topics: ['sql-joins'], answer: 1,
        prompt: 'Look at salary_history for Transport around April 2024 and April 2025. What happened?',
        options: ['Transport got larger raises than other departments', 'Transport had a pay freeze in 2024 and only a small raise in 2025', 'Transport salaries were cut', 'Nothing unusual'],
        explain: 'No annual raise in April 2024 (a freeze for Transport and Operations), then only ~1.5% in 2025, while other departments got 2–4%.' },
      { id: 'final', title: 'Your recommendation to HR', type: 'report', topics: ['think-communication', 'think-causation'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write your answer to the HR director, then tick the checklist points you covered.',
        checklist: [
          { point: 'Quantifies turnover (≈13% → ≈39%)', keywords: [['13', '39']] },
          { point: 'Links it to overtime (≈11 → ≈27 h/month) and the exit reasons', keywords: [['overtime'], ['27', 'double']] },
          { point: 'Mentions the 2024 pay freeze / small 2025 raise', keywords: [['freeze', 'pay', 'raise', 'salary']] },
          { point: 'Notes the vicious circle (fewer drivers → more overtime → more leavers)', keywords: [['circle', 'spiral', 'more overtime', 'fewer drivers', 'loop']] },
          { point: 'Recommends actions (pay review, hiring/cover to cut overtime, retention for new drivers)', keywords: [['pay review', 'raise', 'hire', 'hiring', 'retention', 'cap overtime', 'reduce overtime']] },
          { point: 'Is careful about causation (e.g. suggests testing or monitoring)', keywords: [['correlat', 'caus', 'test', 'monitor', 'pilot']] },
        ],
        model: `**What I found.** Transport's voluntary turnover rose from ~13% (2023) to ~39% (2025).

**Likely causes.** Transport had a pay freeze in April 2024 and only ~1.5% in 2025, below other departments. Average driver overtime more than doubled (~11 → ~27 h/month), and "Workload/overtime" and "Pay" are the top exit reasons. It looks like a vicious circle: leavers → more overtime for the rest → more leavers.

**Caveat.** This is correlation; the exit interviews make it plausible, but I'd confirm with a stay survey and pay benchmarks.

**Recommendations.** A market pay review for drivers; hire or contract extra cover to bring overtime back under ~15 h/month; track driver overtime and turnover monthly on one dashboard; pilot a retention bonus for drivers in their first year.

**More data.** Market pay rates for drivers, overtime by depot and shift, hiring costs per driver, and the delivery-quality impact (late deliveries), to size the business case.`,
      },
    ],
  },
  ...PROJECTS_EXTRA,
  ...PROJECTS_EXTRA2,
];

/**
 * Every project, judged on the ten criteria (content/criteria.js): each step says which criteria
 * it gives evidence of, and three short steps are added for the criteria the numbers alone cannot
 * show (projects-evaluation.js): the data, the approach, and checking the result.
 */
export const PROJECTS = BASE_PROJECTS.map((p) => {
  const added = evaluationSteps(p);
  const steps = p.steps.map((s) => Object.assign(s, { criteria: criteriaForStep(s) }));
  const fi = steps.findIndex((s) => s.id === 'final');
  const at = fi < 0 ? steps.length : fi;
  return Object.assign(p, { steps: [...added.before, ...steps.slice(0, at), ...added.beforeFinal, ...steps.slice(at)] });
});
