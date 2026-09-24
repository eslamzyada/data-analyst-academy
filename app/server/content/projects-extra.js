// More capstone projects, built on the same practice databases. Same shape as projects.js:
// a real business situation, real data, no list of formulas to follow.
export const REPORT_FIELDS = ['What did you find?', 'What caused the problem?', 'Which numbers support your conclusion?', 'What would you recommend?', 'What additional data would you request?'];

export const PROJECTS_EXTRA = [
  // ================================================================ Inventory & waste
  {
    id: 'cap-waste', title: 'Olive & Ember: where is the food going?', business: 'Restaurant', difficulty: 3, minutes: 60,
    skills: ['SQL', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (joins, CTEs)',
    summary: 'Three kitchens throw away very different amounts of food. Find out how much, where, and what is actually causing it.',
    brief: `
The operations manager at **Olive & Ember Kitchen** has been told that "waste is under control because we log it every week".

She writes:
> "We log waste religiously. But I have no idea whether 2% is good or 6% is terrible, or whether the sites are even comparable. One kitchen is much busier than the others. Can you tell me where we are actually losing money, and whether it is a people problem or an equipment problem?"

**What you have:** the weekly waste log (quantity, ingredient, reason, site), every supplier purchase with prices, month-end stock counts and daily sales, in the **SQL Lab** database *Olive & Ember*.

**The catch:** the waste log records **quantities**, not money. A kilo of potatoes and a kilo of prawns are not the same loss. You will have to value the waste yourself, and you will have to decide what to compare it against so that a busy site is not automatically the worst one.`,
    db: 'restaurant', datasets: ['restaurant-db'],
    steps: [
      {
        id: 's1', title: 'Put a price on it', type: 'numbers', topics: ['sql-multijoins', 'sql-business'], concept: 'fan-out', answersKey: 'cap-waste',
        pick: (a) => [a.worstSite, a.worstSitePct],
        prompt: 'Value the waste for **June to August 2026** and express it as a percentage of what each site spent on purchases in the same period. Which site is worst, and what is its percentage?',
        questions: [
          { label: 'Site with the highest waste as a % of purchases', accept: ['Olive & Ember Airport', 'Airport', 'AP'] },
          { label: 'Its waste as a % of purchases', percent: true, tolerance: 0.4 },
        ],
        hints: [
          'The waste log has quantities. Where can you get a price per unit for the same ingredient at the same site?',
          'Build a per-site, per-ingredient average unit cost from the purchases in that period, then join the waste log to it.',
          'Comparing raw waste cost would just tell you which site is biggest. Dividing by that site\'s purchases makes them comparable.',
        ],
        explain: 'The Airport wastes about 6% of everything it buys, against roughly 2.5% at the other two sites. That is not a rounding difference: it is more than twice the loss rate, on a site that buys less than either of the others.',
      },
      {
        id: 's2', title: 'Why is it being thrown away?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], answersKey: 'cap-waste',
        pick: (a) => [a.topReason, a.topReasonCost],
        prompt: 'Across the whole group in 2026, which waste **reason** costs the most money, and roughly how much?',
        questions: [
          { label: 'Most expensive waste reason', accept: ['Expired', 'expired'] },
          { label: 'Its cost in 2026 ($)', tolerance: 600 },
        ],
        hints: ['Same valuation approach as step 1, grouped by reason instead of site.', 'Note the difference between the number of events and their cost: they do not rank the same way.'],
        explain: 'Expired stock is the biggest single cost, ahead of over-preparation. That matters because the two have completely different fixes: expiry is an ordering and rotation problem, over-preparation is a forecasting and portioning problem.',
      },
      {
        id: 's3', title: 'Which ingredients hurt most?', type: 'numbers', topics: ['sql-business'], answersKey: 'cap-waste',
        pick: (a) => [a.topIngredient],
        prompt: 'Which single **ingredient** costs the group the most in waste in 2026?',
        questions: [{ label: 'Most expensive wasted ingredient', accept: ['Mozzarella', 'mozzarella'] }],
        hints: ['Group your valued waste by ingredient rather than by site or reason.'],
        explain: 'Mozzarella tops the list, followed by beef mince, salmon and prawns. Notice that these are not the items wasted most **often**: they are the expensive, perishable ones. A list ranked by quantity would have sent you after potatoes.',
      },
      {
        id: 's4', title: 'Equipment or people?', type: 'choice', topics: ['think-causation'], answer: 1,
        prompt: 'You find 7 equipment-failure waste events in 2026 costing around $560 in total, against roughly $23,000 of waste overall. What does that support?',
        options: [
          'Equipment failure is the main cause and the fridges should be replaced',
          'Equipment failure is real but small; the money is in expiry and over-preparation, which are process problems',
          'The equipment data must be wrong',
          'Nothing can be concluded',
        ],
        explain: 'A dramatic cause is not the same as an expensive one. The fridge failure at the Airport was a genuine incident and worth preventing, but it is about 2% of the waste bill. Recommending a capital purchase on the back of it would be the wrong call.',
      },
      {
        id: 'final', title: 'Your recommendation', type: 'report', topics: ['think-communication', 'sql-business'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the operations manager a short note: how much is being lost, where, why, and what you would do about it. Then tick the points your answer covers.',
        checklist: [
          { point: 'Gives waste as a share of purchases, not just a cash figure', keywords: [['%', 'percent', 'share', 'of purchases']] },
          { point: 'Identifies the Airport as the outlier at roughly twice the rate', keywords: [['airport'], ['twice', 'double', '6', 'highest']] },
          { point: 'Names expiry and over-preparation as the largest costs', keywords: [['expir'], ['over-prep', 'over prep', 'prepared']] },
          { point: 'Notes that the expensive waste is perishable, high-value stock, not the most frequently wasted items', keywords: [['mozzarella', 'salmon', 'prawn', 'perishable', 'expensive']] },
          { point: 'Puts the equipment failure in proportion rather than leading with it', keywords: [['equipment', 'fridge'], ['small', 'proportion', 'minor', 'not the main']] },
          { point: 'Recommends specific actions tied to the causes (ordering and rotation, prep forecasting, portion control at the Airport)', keywords: [['order', 'rotation', 'fifo', 'prep', 'forecast', 'portion', 'training']] },
          { point: 'Asks for data that would sharpen the answer (delivery frequency, prep sheets, covers by day part, shelf-life by item)', keywords: [['delivery', 'prep sheet', 'covers', 'shelf life', 'shelf-life', 'additional', 'request']] },
        ],
        model: `**How much.** Between June and August the group threw away roughly 3.5% of everything it bought. Airport is the outlier at about 6%, against 2.5% at Downtown and Riverside. Airport buys less than either of them, so this is a rate problem, not a size problem.

**Why.** Across 2026, expired stock is the single largest cost (about $10.0k), then over-preparation (about $7.6k) and spoilage (about $5.3k). Equipment failure appears in the log seven times and costs about $560 in total. By ingredient, the money is in mozzarella, beef mince, salmon and prawns: expensive and perishable, not the items wasted most often.

**What I would do.**
1. **Airport first.** It is the only site materially off the pattern, and closing half the gap is worth roughly $3k a quarter on its own. I would start with a week of observed prep and stock rotation rather than assuming the cause.
2. **Ordering and rotation** for the high-value perishables. Expiry being the top reason points at ordering too much, too early, or not using oldest stock first.
3. **Prep forecasting** against covers by day part, which is where the over-preparation cost lives.
4. **Not** a fridge replacement programme. The equipment failure was real and the Airport unit is worth fixing, but it is about 2% of the waste bill and would be the wrong headline.

**What I would want next.** Delivery frequency by site (more frequent smaller deliveries reduce expiry), prep sheets against actual covers, and supplier shelf-life by item. I would also like to know whether the Airport's waste log is simply more honest than the others', because a site that records diligently can look worse than one that does not.`,
      },
    ],
  },

  // ================================================================ Customer retention
  {
    id: 'cap-retention', title: 'Cedarline: is customer retention falling off a cliff?', business: 'Retail', difficulty: 4, minutes: 75,
    skills: ['SQL', 'Analyst Thinking'], recommendedAfter: 'SQL Advanced (cohorts, window functions)',
    summary: 'The board has seen a chart showing repeat purchase rates collapsing. Find out whether it is true.',
    brief: `
**Cedarline Outdoor Supply**'s commercial director sends you a chart from a board pack:

> "Repeat purchase rate by signup year: 2023 78%, 2024 74%, 2025 65%, 2026 33%. We are losing customers faster every year. I want to know what changed in the business and whether it is the Paid Social customers dragging us down. The board meets on Thursday."

**What you have:** every customer with their signup date and acquisition channel, and every order, in the **SQL Lab** database *Cedarline Outdoor Supply*. The data ends on **31 August 2026**.

Before you explain the decline, make sure there is one.`,
    db: 'cedarline', datasets: ['cedarline-db'],
    steps: [
      {
        id: 's1', title: 'Reproduce the chart', type: 'numbers', topics: ['sql-groupby', 'sql-cohorts'], answersKey: 'cap-retention',
        pick: (a) => [a.naiveFirst, a.naiveLast],
        prompt: 'First reproduce what the board was shown: for customers grouped by the **year they signed up**, what percentage placed more than one completed order, ever? Give the figure for the 2023 cohort and for the 2026 cohort.',
        questions: [
          { label: 'Repeat rate, 2023 signups (%)', percent: true, tolerance: 1.5 },
          { label: 'Repeat rate, 2026 signups (%)', percent: true, tolerance: 1.5 },
        ],
        hints: ['Count completed orders per customer, then group the customers by the year of their signup_date.', 'A customer "repeats" if they have more than one completed order.'],
        explain: 'You should get about 78% and 33%, which matches the chart. The numbers are not wrong. The question is whether they mean what the board thinks they mean.',
      },
      {
        id: 's2', title: 'How long has each cohort had?', type: 'choice', topics: ['sql-cohorts', 'think-trust'], concept: 'cohort', answer: 2,
        prompt: 'The data ends on 31 August 2026. What is the problem with comparing the 2023 cohort\'s lifetime repeat rate against the 2026 cohort\'s?',
        options: [
          'There is no problem, both are measured the same way',
          'The 2023 cohort is smaller, so its percentage is less reliable',
          'The 2023 cohort has had up to three and a half years to place a second order; some 2026 customers have had a few weeks',
          'Signup dates are unreliable',
        ],
        explain: 'This is the heart of the project. "Ever repeated" is not a fair measure across cohorts of different ages: it measures opportunity as much as loyalty. A 2026 customer who buys again in 2027 is counted as a non-repeater today.',
      },
      {
        id: 's3', title: 'Compare like with like', type: 'numbers', topics: ['sql-cohorts', 'sql-window-lag'], concept: 'cohort', answersKey: 'cap-retention',
        pick: (a) => [a.mature2024, a.mature2026],
        prompt: 'Measure each cohort at the **same age**: of customers whose first completed order was in a given year, what percentage placed another completed order **within 90 days** of that first order? Include only customers whose first order was at least 90 days before 31 August 2026. Give the 2024 and 2026 figures.',
        questions: [
          { label: '90-day repeat rate, 2024 first-order cohort (%)', percent: true, tolerance: 1.5 },
          { label: '90-day repeat rate, 2026 first-order cohort (%)', percent: true, tolerance: 1.5 },
        ],
        hints: [
          'Find each customer\'s first completed order date, then look for a later order within 90 days of it.',
          'Exclude customers who have not yet had 90 days in which to repeat, or you rebuild the same bias you are trying to remove.',
          'julianday() turns a date into a number, so julianday(b) - julianday(a) gives days.',
        ],
        explain: 'Measured fairly, the rate is about 32.5% for 2024, 32.2% for 2025 and 34.1% for 2026. Retention is flat, and the most recent cohort is marginally the best. The "collapse" in the board chart is an artefact of how long each cohort has been a customer.',
      },
      {
        id: 's4', title: 'Is Paid Social the problem?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], concept: 'segmentation', answersKey: 'cap-retention',
        pick: (a) => [a.bestChannel, a.bestChannelPct],
        prompt: 'The director suspects Paid Social customers. Check every acquisition channel: which channel has the **highest** lifetime repeat rate, and what is it?',
        questions: [
          { label: 'Channel with the highest repeat rate', accept: ['Referral', 'referral'] },
          { label: 'Its repeat rate (%)', percent: true, tolerance: 1.5 },
        ],
        hints: ['Group the per-customer order counts by acquisition_channel.', 'Watch out for customers whose channel is not recorded: decide what to do with them and say so.'],
        explain: 'Referral leads at about 68%, well ahead of everything else. Paid Social sits around 59%, essentially level with Organic Search and In-Store, so it is not the villain. Note also that around 200 customers have no channel recorded at all, which is worth flagging.',
      },
      {
        id: 's5', title: 'One more data quality check', type: 'choice', topics: ['think-trust'], concept: 'dedup', answer: 1,
        prompt: 'You find 68 email addresses that appear on more than one customer record. What does that do to the retention numbers?',
        options: [
          'Nothing, duplicates cancel out',
          'It understates retention: one person\'s two accounts each look like a single-purchase customer',
          'It overstates retention',
          'It only affects the customer count',
        ],
        explain: 'A duplicated customer splits one person\'s history in two, so a genuine repeat buyer can appear as two non-repeaters. The effect is small here but it runs in one direction, and it is the kind of thing you should mention before someone else finds it.',
      },
      {
        id: 'final', title: 'Your note to the board', type: 'report', topics: ['think-communication', 'think-causation', 'sql-cohorts'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'The director believes retention is collapsing and wants to know why. Write the note. Then tick the points your answer covers.',
        checklist: [
          { point: 'States plainly that the apparent decline is a measurement artefact, not a business change', keywords: [['artefact', 'artifact', 'not real', 'measurement', 'misleading', 'not actually', 'appears']] },
          { point: 'Explains cohort maturity: older cohorts have had years to repeat', keywords: [['time', 'mature', 'older', 'longer', 'years', 'opportunity', 'age']] },
          { point: 'Gives the like-for-like figures (about 32-34% at 90 days, flat)', keywords: [['32', '34', '90'], ['flat', 'stable', 'unchanged', 'similar']] },
          { point: 'Clears Paid Social, with the channel numbers', keywords: [['paid social'], ['not', 'similar', '59', 'clear']] },
          { point: 'Notes Referral as the strongest channel', keywords: [['referral'], ['68', 'best', 'highest', 'strongest']] },
          { point: 'Mentions the data quality issues (duplicate emails, missing channel)', keywords: [['duplicate', 'missing', 'not recorded', 'data quality']] },
          { point: 'Recommends replacing the metric in the board pack with a cohort-aged one', keywords: [['replace', 'change the', 'report', 'cohort', 'same age', 'going forward', 'recommend']] },
        ],
        model: `**The headline.** Retention is not collapsing. The chart in the board pack compares cohorts that have had very different amounts of time to buy again, so it measures how long someone has been a customer at least as much as how loyal they are.

**What the numbers actually show.** Measured like for like, as the share of customers who place a second order within 90 days of their first, the rate is 32.5% for 2024, 32.2% for 2025 and 34.1% for 2026. That is flat, with the most recent cohort marginally ahead. The 33% figure for 2026 signups in the board chart is not wrong, it is simply incomplete: many of those customers have had only a few weeks.

**On Paid Social.** It is not the problem. Paid Social customers repeat at about 59%, level with Organic Search (59.5%) and In-Store (58.8%). The genuinely interesting channel is Referral at 68.2%, the only one clearly ahead of the pack, on a base of 390 customers.

**Two caveats.** 68 email addresses appear on more than one customer record, which splits some people's history and slightly understates retention. About 200 customers have no acquisition channel recorded, so the channel comparison excludes them.

**What I recommend.** Replace the lifetime repeat rate in the board pack with a fixed-window cohort measure, so the chart cannot drift again. Then look properly at Referral: if it really does produce customers who repeat nine points more often, the question worth asking on Thursday is how to get more of them, not what went wrong.

**What I would want next.** Marketing spend by channel, so repeat rate can be set against acquisition cost, and a rule for merging duplicate customer records.`,
      },
    ],
  },

  // ================================================================ E-commerce returns
  {
    id: 'cap-returns', title: 'Cedarline: what are online returns really costing us?', business: 'E-commerce', difficulty: 3, minutes: 60,
    skills: ['SQL', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (joins)',
    summary: 'Online returns run at double the in-store rate. Find which products and reasons drive it, and what to do.',
    brief: `
The head of e-commerce at **Cedarline Outdoor Supply** writes:

> "Finance say returns are eating our online margin. I get a monthly number and it means nothing to me. Which products? Is it a delivery problem, a quality problem, or something about the website? I would rather fix a cause than run another discount."

**What you have:** every order (with its channel), every order line, the product catalogue and the returns table, with a reason and refund amount for each return, in the **SQL Lab** database *Cedarline Outdoor Supply*.

**One definition to settle first:** a return rate is returns divided by *something*. Decide what the denominator should be and be able to defend it.`,
    db: 'cedarline', datasets: ['cedarline-db'],
    steps: [
      {
        id: 's1', title: 'Size the gap', type: 'numbers', topics: ['sql-joins', 'sql-business'], concept: 'left-join', answersKey: 'cap-returns',
        pick: (a) => [a.onlinePct, a.inStorePct],
        prompt: 'For **completed** orders, what percentage of order lines were returned, online and in store?',
        questions: [
          { label: 'Online return rate (% of lines)', percent: true, tolerance: 0.5 },
          { label: 'In-store return rate (% of lines)', percent: true, tolerance: 0.5 },
        ],
        hints: [
          'Every order line either has a return or it does not, so you need a join that keeps the lines with no return.',
          'A line can be returned more than once, so count distinct returns and distinct lines.',
        ],
        explain: 'Online runs at about 10.3% of lines against 5.2% in store: almost exactly double. That gap is the thing worth explaining, and it is far more useful to the head of e-commerce than a single monthly number.',
      },
      {
        id: 's2', title: 'Which categories?', type: 'numbers', topics: ['sql-groupby'], answersKey: 'cap-returns',
        pick: (a) => [a.topCategory, a.topCategoryPct],
        prompt: 'Which product **category** has the highest return rate, and what is it?',
        questions: [
          { label: 'Category with the highest return rate', accept: ['Footwear', 'footwear'] },
          { label: 'Its return rate (%)', percent: true, tolerance: 0.6 },
        ],
        hints: ['Same calculation, grouped by the product category.'],
        explain: 'Footwear at about 13.3%, then Apparel at 10.6%. Everything else is 6.6% or below. Two categories account for most of the problem, which immediately narrows what you need to investigate.',
      },
      {
        id: 's3', title: 'Why are they coming back?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], answersKey: 'cap-returns',
        pick: (a) => [a.topReason, a.topReasonShare],
        prompt: 'What is the most common return **reason**, and what share of all returns is it?',
        questions: [
          { label: 'Most common reason', accept: ['Wrong size', 'wrong size', 'size'] },
          { label: 'Its share of all returns (%)', percent: true, tolerance: 1.5 },
        ],
        hints: ['Group the returns table by reason and count.', 'Then check which categories that reason appears in. It is not spread evenly.'],
        explain: '"Wrong size" is about 36% of all returns, and it appears only in Apparel and Footwear: exactly the two categories with the worst rates. That is a coherent story rather than a coincidence, and it points somewhere specific.',
      },
      {
        id: 's4', title: 'What is it worth?', type: 'numbers', topics: ['sql-business'], concept: 'kpi', answersKey: 'cap-returns',
        pick: (a) => [a.onlineRefundPctOfRevenue, a.worstProduct],
        prompt: 'Put a number on it, and find the worst offender. (1) Refunds on online orders as a percentage of online revenue. (2) The product with the highest return rate among products with at least 80 order lines.',
        questions: [
          { label: 'Online refunds as % of online revenue', percent: true, tolerance: 0.8 },
          { label: 'Worst product by return rate (80+ lines)', accept: ["Kids' Hiking Boot", 'Kids Hiking Boot', 'Kids Hiking Boots'] },
        ],
        hints: [
          'Revenue per line is quantity x unit_price x (1 - discount_pct).',
          'The minimum-lines threshold matters: without it, a product with 3 sales and 1 return tops the list at 33%.',
        ],
        explain: 'Around 9.9% of online revenue goes back out as refunds, and the Kids\' Hiking Boot is worst at 16.3%. The 80-line threshold is doing real work here: without it the list is dominated by products with too few sales to mean anything.',
      },
      {
        id: 's5', title: 'What does the evidence support?', type: 'choice', topics: ['think-causation'], answer: 2,
        prompt: 'Online returns are double in-store, "wrong size" is the top reason, and it is concentrated in the two categories people have to judge the fit of. Which conclusion does the evidence best support?',
        options: [
          'Delivery damage is the main problem',
          'Product quality in one of the categories is poor',
          'Customers buying things they would normally try on cannot judge fit online, so the size information on those pages is the first thing to investigate',
          'Customers are abusing the returns policy',
        ],
        explain: 'In-store customers can try things on; online customers cannot. That single difference explains the channel gap, the category concentration and the top reason at once. "Damaged in transit" exists in the data but is the smallest reason, so a delivery explanation does not fit.',
      },
      {
        id: 'final', title: 'Your recommendation', type: 'report', topics: ['think-communication', 'think-causation', 'sql-business'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write to the head of e-commerce: what returns cost, what drives them, and what you would do first. Then tick the points your answer covers.',
        checklist: [
          { point: 'Quantifies the channel gap (about 10% online against 5% in store)', keywords: [['10', '5', 'double', 'twice']] },
          { point: 'Puts a money figure on it (roughly 10% of online revenue refunded)', keywords: [['revenue', 'refund'], ['9', '10', 'cost']] },
          { point: 'Names Footwear and Apparel as the concentration', keywords: [['footwear'], ['apparel']] },
          { point: 'Identifies wrong size as the dominant reason and links it to those categories', keywords: [['size'], ['36', 'most', 'top', 'dominant', 'main']] },
          { point: 'Reasons from the in-store comparison to fit, rather than blaming quality or delivery', keywords: [['try', 'fit', 'cannot judge', 'in store', 'in-store', 'sizing']] },
          { point: 'Recommends specific, testable fixes (size guides, fit reviews, measurements on the page, worst products first)', keywords: [['size guide', 'sizing', 'measurement', 'fit', 'review', 'photo', 'test', 'pilot']] },
          { point: 'Names the products or categories to start with', keywords: [['boot', 'kids', 'water shoe', 'start with', 'first']] },
        ],
        model: `**What it costs.** About 9.9% of online revenue comes back out as refunds, roughly $105k across the period. Online lines are returned at 10.3% against 5.2% in store: almost exactly double.

**Where it is concentrated.** Footwear (13.3%) and Apparel (10.6%) are far above everything else; no other category exceeds 6.6%. The worst individual product is the Kids' Hiking Boot at 16.3%, followed by the Water Shoe and the Approach Shoe.

**What is driving it.** "Wrong size" is about 36% of all returns, and it appears **only** in Apparel and Footwear. That one fact ties the three findings together: the categories that are worst are the ones where fit matters, and the channel that is worst is the one where the customer cannot try the item on. "Damaged in transit" is the smallest reason in the data, so this is not a delivery problem, and the quality reasons are spread across categories rather than concentrated in footwear.

**What I would do.**
1. Start with the ten worst products by return rate, which are almost all footwear. Add real measurements, fit guidance ("runs small"), and customer fit feedback to those pages first.
2. Measure it as a test rather than a rollout: the return rate on those products before and after, against the rest of the footwear range as a control.
3. Leave the returns policy alone. Nothing in the data suggests abuse, and tightening it would cost sales without touching the cause.

**What I would want next.** Size-level data on the order lines, which we do not currently capture and without which we cannot tell whether customers are systematically ordering a size too small. I would also want to know how often a return is followed by a repurchase of the same product in a different size, because those are customers the current numbers count purely as a cost.`,
      },
    ],
  },

  // ================================================================ Supplier performance
  {
    id: 'cap-supplier', title: 'Olive & Ember: are we buying well?', business: 'Supply chain', difficulty: 3, minutes: 55,
    skills: ['SQL', 'Analyst Thinking'], recommendedAfter: 'SQL Intermediate (joins, grouping)',
    summary: 'Seven suppliers, no contract review in two years. Work out where the money goes and where it is being lost.',
    brief: `
The finance director at **Olive & Ember Kitchen** is preparing for supplier negotiations.

> "We have never really reviewed our suppliers. I want to walk into these meetings knowing who we depend on, who has put prices up, and whether we are paying over the odds anywhere. Give me something I can put in front of them."

**What you have:** every supplier invoice line, with quantity, unit cost and delivery date, plus the ingredient and supplier tables, in the **SQL Lab** database *Olive & Ember*.

**A warning about prices:** food prices move with the seasons. Comparing a supplier's summer prices with its own spring prices will tell you about tomatoes, not about the supplier.`,
    db: 'restaurant', datasets: ['restaurant-db'],
    steps: [
      {
        id: 's1', title: 'Where does the money go?', type: 'numbers', topics: ['sql-groupby', 'sql-business'], answersKey: 'cap-supplier',
        pick: (a) => [a.topSupplier, a.topSupplierShare],
        prompt: 'For January to August 2026, which supplier takes the largest share of total purchase spend, and what percentage of the total is it?',
        questions: [
          { label: 'Largest supplier by spend', accept: ['Prime Meats Co.', 'Prime Meats', 'Prime Meats Co'] },
          { label: 'Its share of total spend (%)', percent: true, tolerance: 1.5 },
        ],
        hints: ['Total the invoice lines per supplier, then work out each one as a share of the overall total.'],
        explain: 'Prime Meats takes about a third of all spend. Concentration like that is not automatically bad, but it is the first thing to know before a negotiation: it is leverage for both sides.',
      },
      {
        id: 's2', title: 'Who has raised prices?', type: 'numbers', topics: ['sql-window-lag', 'sql-business'], concept: 'anomaly', answersKey: 'cap-supplier',
        pick: (a) => [a.biggestRiser, a.biggestRiserPct],
        prompt: 'Compare each supplier\'s unit prices in **August 2026** against **May 2026**, averaged across the items they supply. Which supplier has raised prices most, and by how much?',
        questions: [
          { label: 'Supplier with the largest price rise', accept: ['Prime Meats Co.', 'Prime Meats', 'Prime Meats Co'] },
          { label: 'Its average price rise (%)', percent: true, tolerance: 1.5 },
        ],
        hints: [
          'Unit price is line_total / qty. Work it out per supplier, per ingredient, per month.',
          'Compare the same ingredient with itself across the two months, then average across ingredients. Comparing total spend would just measure how much you bought.',
        ],
        explain: 'Prime Meats is up about 12.7% while every other supplier is essentially flat (0.1% to 0.6%). One supplier moving alone, in a period when nothing else moved, is a negotiating fact rather than a market fact.',
      },
      {
        id: 's3', title: 'Are we overpaying anywhere?', type: 'numbers', topics: ['sql-multijoins', 'sql-business'], concept: 'anomaly', answersKey: 'cap-supplier',
        pick: (a) => [a.quickVegPremiumPct],
        prompt: 'Two suppliers deliver produce: GreenLeaf Farms and QuickVeg Wholesale. Comparing the **same ingredients in the same months** (June to August 2026), how much more per unit does QuickVeg charge?',
        questions: [{ label: 'QuickVeg premium over GreenLeaf (%)', percent: true, tolerance: 2 }],
        hints: [
          'Restrict the comparison to ingredients both suppliers actually delivered in that period.',
          'Comparing across different months would let seasonal price movements contaminate the answer.',
        ],
        explain: 'QuickVeg is about 18% dearer, and remarkably consistently: every common item sits between 17.6% and 18.5%. A uniform premium across an entire range is a pricing decision, not a series of coincidences.',
      },
      {
        id: 's4', title: 'How much is that worth?', type: 'choice', topics: ['think-metrics'], answer: 1,
        prompt: 'QuickVeg is about 18% dearer and Olive & Ember spent roughly $20,300 with them in 2026. Which is the most defensible estimate of the saving from moving that spend to GreenLeaf?',
        options: [
          'About $20,300, the whole spend',
          'About $3,100, because $20,300 at an 18% premium implies roughly $17,200 of equivalent goods',
          'About $3,700, which is 18% of $20,300',
          'Nothing can be estimated',
        ],
        explain: 'The premium sits on top of the base price, so you divide rather than multiply: 20,300 / 1.18 is about 17,200, and the difference is roughly $3,100. Taking 18% of the higher figure overstates it by a few hundred dollars. Small here, but the same reasoning error on a large contract is expensive, and a supplier will spot it.',
      },
      {
        id: 'final', title: 'Your negotiation brief', type: 'report', topics: ['think-communication', 'sql-business'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'Write the finance director a one-page brief for the supplier meetings. Then tick the points your answer covers.',
        checklist: [
          { point: 'States the spend concentration (Prime Meats about a third)', keywords: [['prime meats'], ['third', '32', '33', 'concentrat', 'share']] },
          { point: 'Identifies Prime Meats as the only supplier to raise prices materially', keywords: [['12', '13', 'rise', 'increase'], ['only', 'alone', 'others', 'rest', 'flat']] },
          { point: 'Quantifies the QuickVeg premium on a like-for-like basis', keywords: [['quickveg'], ['18', 'premium', 'dearer']] },
          { point: 'Explains why like-for-like comparison matters (seasonality)', keywords: [['season', 'same month', 'like for like', 'like-for-like', 'compare']] },
          { point: 'Gives a defensible estimate of the saving available', keywords: [['3,1', '3100', '3.1', 'saving', 'estimate']] },
          { point: 'Recommends concrete negotiating positions, not just observations', keywords: [['negotiat', 'switch', 'tender', 'second supplier', 'terms', 'recommend']] },
          { point: 'Notes the risk of depending heavily on one supplier', keywords: [['risk', 'depend', 'concentrat', 'single', 'leverage']] },
        ],
        model: `**Where the money goes.** Of roughly $850k spent from January to August 2026, Prime Meats takes about a third ($278k), then Dairy Valley ($183k) and Harbor Seafood ($129k). The top three are about 70% of spend.

**Who has moved on price.** Comparing August against May on the same items, Prime Meats is up about 12.7%. Every other supplier is between 0.1% and 0.6%, which is flat. It is worth being precise about this in the meeting: the increase is not the market, because nobody else moved.

**Where we are paying over the odds.** We use two produce suppliers. Comparing only the items both delivered, in the same months, QuickVeg is about 18% dearer than GreenLeaf, and the premium is almost identical on every item (17.6% to 18.5%). That consistency matters: it is a price list, not a run of bad luck on individual orders. Comparing QuickVeg's summer prices against its own spring prices would have hidden this entirely, because produce is cheaper in summer.

**What it is worth.** We spent about $20.3k with QuickVeg this year. At an 18% premium that is roughly $17.2k of equivalent goods, so about **$3.1k** of avoidable cost. Modest, but it is a clean saving with a known cause.

**What I would go in with.**
1. **Prime Meats:** ask them to justify a 12.7% increase when no other supplier moved, and ask for it to be staged or partly reversed. We are a third of their business by value here, and that is leverage. It is also a risk: we should quote a second meat supplier before the meeting, not after.
2. **Produce:** move Riverside's produce back to GreenLeaf, or get QuickVeg to match. There is no quality argument in the data either way, which is worth saying out loud, and is the obvious thing they will raise.
3. **Terms:** payment terms range from Net 7 to Net 30 with no obvious logic. Worth aligning.

**What I would want next.** Delivery reliability and quality-rejection records, which we do not appear to hold. Price is only one dimension of supplier performance, and I would not move a supplier on price alone without knowing whether the cheaper one turns up on time.`,
      },
    ],
  },

  // ================================================================ NGO donations & programmes
  {
    id: 'cap-ngo', title: 'Bright Wells: how safe is our funding?', business: 'NGO', difficulty: 3, minutes: 60,
    skills: ['Excel', 'Analyst Thinking'], recommendedAfter: 'Excel Intermediate (PivotTables, SUMIFS)',
    summary: 'A small charity raised more than ever last year. The trustees want to know how fragile that income is.',
    brief: `
You volunteer as the analyst for **Bright Wells**, a small international charity running four programmes.

The chair of trustees writes:
> "2025 was our best year. But our treasurer is nervous and I do not really understand why. She keeps saying our income is 'concentrated'. We are about to commit to a three-year school building programme. Before we sign, I want to know: how reliable is this money, and what would happen if a couple of donors stopped giving?"

**What you have:** every gift received in 2025, one row per gift, with the donor, programme, region, channel, amount, and whether it was a recurring gift. It is in the **Data library** as *NGO donations 2025*, and downloadable below.

**Use whatever you like.** Everything is in one workbook. The interesting questions are not about the total: they are about how that total is made up.`,
    files: [{ label: 'ngo_donations_2025.xlsx', path: 'excel/ngo_donations_2025.xlsx' }],
    datasets: ['ngo-donations'],
    steps: [
      {
        id: 's1', title: 'The headline', type: 'numbers', topics: ['xl-pivots', 'xl-countif'], answersKey: 'cap-ngo',
        pick: (a) => [a.total, a.donors, a.topProgram],
        prompt: 'Start with the basics the trustees already think they know: total raised in 2025, the number of distinct donors, and the programme that received the most.',
        questions: [
          { label: 'Total raised in 2025', tolerance: 60 },
          { label: 'Number of distinct donors', tolerance: 0 },
          { label: 'Programme receiving the most', accept: ['Clean Water', 'clean water'] },
        ],
        hints: [
          'A PivotTable on the Donations sheet answers all three faster than formulas will.',
          'Distinct donors is not the number of rows: several gifts come from the same donor. Count unique Donor IDs.',
        ],
        explain: 'About £141,200 from 260 donors across 1,144 gifts, with Clean Water the largest programme. Note that the four programmes are actually fairly close together (£29k to £38k), so "Clean Water is our biggest programme" is true but not a very interesting fact.',
      },
      {
        id: 's2', title: 'How concentrated is it?', type: 'numbers', topics: ['xl-pivots', 'think-metrics'], concept: 'segmentation', answersKey: 'cap-ngo',
        pick: (a) => [a.top10Share, a.topDonorTotal],
        prompt: 'This is what the treasurer means. What share of total income came from the **top 10 donors**, and how much did the single largest donor give?',
        questions: [
          { label: 'Share of total income from the top 10 donors (%)', percent: true, tolerance: 1.5 },
          { label: 'Amount given by the largest single donor', tolerance: 60 },
        ],
        hints: [
          'Total the gifts per donor first, then sort that list descending.',
          'The share is the sum of the top 10 donor totals divided by the overall total.',
        ],
        explain: 'The top 10 donors gave about 52% of everything, and the largest alone gave roughly £15,900, more than 11% of total income. Ten people leaving would halve the charity. That is the concentration the treasurer is worried about, and it is invisible in the headline total.',
      },
      {
        id: 's3', title: 'How much of it is dependable?', type: 'numbers', topics: ['xl-sumifs', 'think-metrics'], concept: 'denominator', answersKey: 'cap-ngo',
        pick: (a) => [a.recurringShare, a.recurringDonorShare],
        prompt: 'Recurring gifts are the predictable part. What percentage of the **money** came from recurring gifts, and what percentage of **donors** are recurring givers?',
        questions: [
          { label: 'Recurring gifts as % of total income', percent: true, tolerance: 1 },
          { label: 'Recurring givers as % of all donors', percent: true, tolerance: 1.5 },
        ],
        hints: [
          'The Recurring column is Y or N. SUMIF and COUNTIF will both be useful.',
          'Careful with the donor percentage: count distinct donors, not gifts. Recurring donors give twelve times each, so counting rows would badly overstate them.',
        ],
        explain: 'About 27% of donors are recurring givers, but they provide only 16% of the income. The two percentages point in opposite directions, and the gap is the finding: recurring gifts average about £27 while one-off gifts average about £377.',
      },
      {
        id: 's4', title: 'What the average hides', type: 'choice', topics: ['think-metrics'], concept: 'mean-median', answer: 2,
        prompt: 'A trustee suggests reporting "average gift: £123" in the annual report. What is the strongest objection?',
        options: [
          'The figure is wrong',
          'It should be rounded',
          'Gifts range from £5 to several thousand and the distribution is heavily skewed, so no typical donor gives anything like £123',
          'Averages cannot be used for donations',
        ],
        explain: 'The arithmetic is fine; the communication is not. With a handful of very large gifts pulling the mean upward, an "average" implies a typical donor who does not exist. The median gift, and the split between recurring and one-off, tell the reader far more.',
      },
      {
        id: 's5', title: 'Is the money arriving evenly?', type: 'numbers', topics: ['xl-pivots', 'xl-textdates'], answersKey: 'cap-ngo',
        pick: (a) => [a.byQuarter[2][1], a.byQuarter[0][1]],
        prompt: 'Group the gifts by quarter. How much came in during the **strongest** quarter, and how much in the **weakest**?',
        questions: [
          { label: 'Income in the strongest quarter', tolerance: 400 },
          { label: 'Income in the weakest quarter', tolerance: 400 },
        ],
        hints: [
          'Group the Date field by quarters in a PivotTable, or build a quarter column with a formula.',
          'If the dates will not group, they are probably text rather than real dates.',
        ],
        explain: 'Q3 brought in about £45,400 and Q1 about £28,400: a 60% difference between the best and worst quarters. For a charity committing to a fixed three-year payment schedule, that swing matters as much as the annual total does.',
      },
      {
        id: 'final', title: 'Your advice to the trustees', type: 'report', topics: ['think-communication', 'think-metrics'], concept: 'communication',
        fields: REPORT_FIELDS,
        prompt: 'The trustees are about to commit to a three-year programme. Write them a short note on how dependable the 2025 income really is. Then tick the points your answer covers.',
        checklist: [
          { point: 'States the concentration clearly (top 10 donors are about half of income)', keywords: [['top 10', 'top ten'], ['52', 'half', 'concentrat']] },
          { point: 'Notes how much the single largest donor represents', keywords: [['largest', 'biggest', 'top donor', 'one donor'], ['11', '15,8', '15.9', '15,9']] },
          { point: 'Separates the number of recurring donors from the money they give', keywords: [['27', '26'], ['16', '15.7', '15.7%']] },
          { point: 'Points out the gap between average recurring and one-off gifts', keywords: [['27', '377', '376'], ['average', 'recurring', 'one-off']] },
          { point: 'Mentions the seasonal swing between quarters', keywords: [['quarter', 'q1', 'q3', 'season'], ['28', '45', 'swing', 'uneven']] },
          { point: 'Draws a conclusion about the three-year commitment, rather than only describing the data', keywords: [['commit', 'three-year', '3 year', 'risk', 'cautio', 'recommend', 'before']] },
          { point: 'Recommends specific action (grow recurring giving, donor stewardship, reserves)', keywords: [['recurring', 'regular giving', 'steward', 'reserve', 'diversif', 'grow']] },
        ],
        model: `**The short answer.** 2025 was a record year, and the income behind it is more fragile than the total suggests. I would not treat £141k as a number we can count on repeating.

**Why.** Just ten donors provided about 52% of all income, and the single largest gave around £15,900, over 11% on their own. If two or three of those people stop giving, or simply give less, the charity loses more than a whole programme's budget, and nothing in our data would have warned us in advance.

**The dependable part is small.** Recurring givers are about 27% of our donors but provide only about 16% of the money: roughly £22k a year. The reason is the gift size: recurring gifts average about £27, one-off gifts about £377. The predictable income is genuinely predictable, there is just not very much of it.

**The timing is uneven too.** Q3 brought in about £45,400 and Q1 about £28,400. A three-year commitment with fixed quarterly payments would be comfortably covered in the autumn and tight in the first quarter of each year.

**What I would advise.**
1. **Do not size the commitment against 2025 income.** Size it against the recurring base plus a conservative view of one-off giving, and hold reserves for the Q1 gap.
2. **Grow recurring giving deliberately.** Moving even fifty mid-sized one-off donors onto monthly gifts would do more for stability than a record year does.
3. **Look after the top ten properly,** and know who they are. Concentration is not automatically bad, but unmanaged concentration is.

**What I would want next.** The same data for 2023 and 2024, so I can see whether the big donors are the same people each year or a rotating cast, and whether the Q1 dip is seasonal or was specific to 2025. I would also like to know our committed costs by quarter, because the risk is the gap between the two, not the income on its own.`,
      },
    ],
  },
];
