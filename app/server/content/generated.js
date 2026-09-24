// Questions generated from a seed, so a quiz can show fresh numbers each time.
//
// The id carries everything needed to rebuild the question ("g.<generator>.<seed>"), so the
// server can always re-derive the exact prompt and answer. Nothing is stored, and the answer
// is never sent to the browser before it is checked.
//
// Rules every generator follows: whole numbers or two decimals only, no ties where the question
// depends on order, no division by zero, and a worked explanation that shows the arithmetic.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;
const money = (x) => x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (R, lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function distinct(R, n, lo, hi) {
  const out = new Set();
  while (out.size < n) out.add(int(R, lo, hi));
  return [...out];
}
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;

const REGIONS = ['North', 'South', 'East', 'West'];
const PRODUCTS = ['Tent', 'Boots', 'Stove', 'Lamp', 'Jacket', 'Socks', 'Rucksack', 'Mug'];
const DISHES = ['Risotto', 'Burger', 'Salmon', 'Pizza', 'Salad', 'Curry'];

export const GENERATORS = {
  // ------------------------------------------------------------------ Excel
  vat: {
    topics: ['xl-basics'], concept: 'cell-refs', difficulty: 1, style: 'calculation',
    build(R) {
      const price = int(R, 12, 480);
      const rate = pick(R, [5, 10, 12.5, 20]);
      const ans = r2(price * (1 + rate / 100));
      return {
        prompt: `A product costs **£${price}** before VAT. The VAT rate in G1 is **${rate}%**. What does \`=B2*(1+$G$1)\` return? (to 2 decimal places)`,
        answer: ans, tolerance: 0.01,
        explain: `${price} × (1 + ${rate / 100}) = ${price} × ${1 + rate / 100} = **${money(ans)}**. Adding the percentage means multiplying by 1 plus the rate.`,
      };
    },
  },
  margin: {
    topics: ['xl-basics', 'think-metrics'], concept: 'denominator', difficulty: 2, style: 'calculation',
    build(R) {
      const price = int(R, 20, 200);
      const cost = int(R, Math.round(price * 0.3), Math.round(price * 0.8));
      const ans = r1(((price - cost) / price) * 100);
      return {
        prompt: `A dish sells for **£${price}** and its ingredients cost **£${cost}**. What is the gross margin as a percentage of the selling price? (1 decimal place, number only)`,
        answer: ans, tolerance: 0.1,
        explain: `Margin = (price − cost) ÷ price = (${price} − ${cost}) ÷ ${price} = ${price - cost} ÷ ${price} = **${ans}%**. Dividing by the cost instead gives the mark-up, which is a different number.`,
      };
    },
  },
  sumif: {
    topics: ['xl-countif', 'xl-sumifs'], concept: 'countif-sumif', difficulty: 2, style: 'practical',
    build(R) {
      const target = pick(R, REGIONS);
      const rows = Array.from({ length: 7 }, (_, i) => [PRODUCTS[i], i < 2 ? target : pick(R, REGIONS), int(R, 10, 900)]);
      const ans = rows.filter((r) => r[1] === target).reduce((a, r) => a + r[2], 0);
      return {
        prompt: `Using this table (Product in A, Region in B, Amount in C, rows 2 to 8), what does \`=SUMIF(B2:B8,"${target}",C2:C8)\` return?\n\n${table(['Product', 'Region', 'Amount'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `Add the amounts on the ${target} rows only: ${rows.filter((r) => r[1] === target).map((r) => r[2]).join(' + ')} = **${ans}**.`,
      };
    },
  },
  countifs: {
    topics: ['xl-sumifs', 'xl-countif'], concept: 'sumifs', difficulty: 2, style: 'practical',
    build(R) {
      const target = pick(R, REGIONS);
      const limit = pick(R, [100, 200, 250, 300]);
      // no amount equals the limit, so ">" versus ">=" can never make the question ambiguous
      const amounts = distinct(R, 8, 20, 600).map((x) => (x === limit ? x + 1 : x));
      const rows = amounts.map((a, i) => [`SO-${1001 + i}`, i < 3 ? target : pick(R, REGIONS), a]);
      const ans = rows.filter((r) => r[1] === target && r[2] > limit).length;
      return {
        prompt: `How many rows does \`=COUNTIFS(B2:B9,"${target}",C2:C9,">${limit}")\` count?\n\n${table(['Order', 'Region', 'Amount'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `Both conditions must hold: region is ${target} **and** amount is above ${limit}. Matching rows: ${rows.filter((r) => r[1] === target && r[2] > limit).map((r) => r[0]).join(', ') || 'none'}, so **${ans}**.`,
      };
    },
  },
  wavg: {
    topics: ['xl-advformulas', 'xl-pivots', 'think-metrics'], concept: 'weighted-avg', difficulty: 3, style: 'calculation',
    build(R) {
      const items = [0, 1, 2].map((i) => ({ name: PRODUCTS[i + 2], units: int(R, 5, 400), price: int(R, 4, 250) }));
      const rev = items.reduce((a, x) => a + x.units * x.price, 0);
      const units = items.reduce((a, x) => a + x.units, 0);
      const ans = r2(rev / units);
      const simple = r2(items.reduce((a, x) => a + x.price, 0) / 3);
      return {
        prompt: `What is the **weighted** average selling price across these three products? (2 decimal places)\n\n${table(['Product', 'Units sold', 'Price'], items.map((x) => [x.name, x.units, `£${x.price}`]))}`,
        answer: ans, tolerance: 0.01,
        explain: `Total revenue ÷ total units = (${items.map((x) => `${x.units}×${x.price}`).join(' + ')}) ÷ ${units} = ${rev} ÷ ${units} = **£${money(ans)}**. The simple average of the prices, £${money(simple)}, ignores how much of each product was sold.`,
      };
    },
  },
  aov: {
    topics: ['xl-advformulas', 'think-metrics'], concept: 'weighted-avg', difficulty: 3, style: 'calculation',
    build(R) {
      const a = { orders: int(R, 50, 400), aov: int(R, 30, 150) };
      const b = { orders: int(R, 10, 120), aov: int(R, 160, 600) };
      const rev = a.orders * a.aov + b.orders * b.aov;
      const ans = r2(rev / (a.orders + b.orders));
      return {
        prompt: `Region A had **${a.orders}** orders averaging **£${a.aov}**. Region B had **${b.orders}** orders averaging **£${b.aov}**. What is the average order value across both regions? (2 decimal places)`,
        answer: ans, tolerance: 0.01,
        explain: `Rebuild the total first: ${a.orders}×${a.aov} + ${b.orders}×${b.aov} = £${rev} over ${a.orders + b.orders} orders = **£${money(ans)}**. Averaging £${a.aov} and £${b.aov} would give £${money((a.aov + b.aov) / 2)}, which treats the two regions as the same size.`,
      };
    },
  },
  days: {
    topics: ['xl-textdates'], concept: 'dates', difficulty: 2, style: 'calculation',
    build(R) {
      const start = new Date(Date.UTC(2026, int(R, 0, 5), int(R, 1, 28)));
      const gap = int(R, 3, 120);
      const end = new Date(start.getTime() + gap * 86400000);
      const iso = (d) => d.toISOString().slice(0, 10);
      return {
        prompt: `A2 holds the date **${iso(start)}** and B2 holds **${iso(end)}**. What does \`=B2-A2\` return, formatted as a number?`,
        answer: gap, tolerance: 0,
        explain: `Dates are stored as day numbers, so subtracting them gives the days in between: **${gap}**. If the answer shows as a date, the cell format is wrong, not the formula.`,
      };
    },
  },

  // ------------------------------------------------------------------ SQL
  sqlcount: {
    topics: ['sql-where', 'sql-aggregate'], concept: 'where-logic', difficulty: 2, style: 'practical',
    build(R) {
      const limit = pick(R, [50, 100, 150]);
      const amounts = distinct(R, 8, 10, 300).map((x) => (x === limit ? x + 1 : x));
      const rows = amounts.map((a, i) => [100 + i, pick(R, ['completed', 'completed', 'cancelled', 'pending']), a]);
      const ans = rows.filter((r) => r[1] === 'completed' && r[2] > limit).length;
      return {
        prompt: `Given this \`orders\` table, what number does the query return?\n\n\`\`\`sql\nSELECT COUNT(*) FROM orders\nWHERE status = 'completed' AND amount > ${limit};\n\`\`\`\n\n${table(['order_id', 'status', 'amount'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `Keep rows that are completed **and** above ${limit}: ${rows.filter((r) => r[1] === 'completed' && r[2] > limit).map((r) => r[0]).join(', ') || 'none'}. That is **${ans}**.`,
      };
    },
  },
  having: {
    topics: ['sql-groupby'], concept: 'having', difficulty: 2, style: 'practical',
    build(R) {
      const custs = ['C1', 'C2', 'C3', 'C4', 'C5'];
      const rows = Array.from({ length: 9 }, (_, i) => [200 + i, pick(R, custs)]);
      const min = pick(R, [2, 3]);
      const counts = {};
      for (const r of rows) counts[r[1]] = (counts[r[1]] || 0) + 1;
      const ans = Object.values(counts).filter((c) => c >= min).length;
      return {
        prompt: `How many rows does this query return?\n\n\`\`\`sql\nSELECT customer_id, COUNT(*)\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(*) >= ${min};\n\`\`\`\n\n${table(['order_id', 'customer_id'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `Orders per customer: ${Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join(', ')}. Customers with at least ${min}: **${ans}**. One output row per qualifying group.`,
      };
    },
  },
  leftjoin: {
    topics: ['sql-joins', 'sql-multijoins'], concept: 'left-join', difficulty: 3, style: 'practical',
    build(R) {
      const custs = ['Ana', 'Ben', 'Cai', 'Dee', 'Eli'];
      const orders = Array.from({ length: int(R, 3, 8) }, (_, i) => [300 + i, pick(R, custs.slice(0, 4))]);
      const per = Object.fromEntries(custs.map((c) => [c, orders.filter((o) => o[1] === c).length]));
      const ans = custs.reduce((a, c) => a + Math.max(1, per[c]), 0);
      return {
        prompt: `The \`customers\` table has 5 rows: ${custs.join(', ')}. Here is \`orders\`. How many rows does \`customers c LEFT JOIN orders o ON o.customer = c.name\` produce?\n\n${table(['order_id', 'customer'], orders)}`,
        answer: ans, tolerance: 0,
        explain: `Each customer appears once per matching order, and at least once even with no orders: ${custs.map((c) => `${c} ${Math.max(1, per[c])}`).join(', ')}. Total **${ans}**. A customer with three orders appears three times, which is why sums after a join need care.`,
      };
    },
  },
  rank: {
    topics: ['sql-window-rank'], concept: 'window-rank', difficulty: 3, style: 'practical',
    build(R) {
      const vals = distinct(R, 4, 100, 900);
      const tie = vals[1];
      const rows = [['Tent', vals[0]], ['Boots', tie], ['Stove', tie], ['Lamp', vals[2]], ['Mug', vals[3]]];
      const fn = pick(R, ['RANK', 'DENSE_RANK']);
      const target = pick(R, rows.filter((r) => r[1] !== tie));
      const sorted = [...new Set(rows.map((r) => r[1]))].sort((a, b) => b - a);
      const ans = fn === 'RANK' ? rows.filter((r) => r[1] > target[1]).length + 1 : sorted.indexOf(target[1]) + 1;
      return {
        prompt: `What does \`${fn}() OVER (ORDER BY revenue DESC)\` return for **${target[0]}**? (Boots and Stove are tied.)\n\n${table(['product', 'revenue'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `${fn === 'RANK' ? `RANK counts how many rows are strictly higher and adds 1, leaving a gap after ties: ${rows.filter((r) => r[1] > target[1]).length} higher, so **${ans}**.` : `DENSE_RANK numbers the distinct values without gaps: ${sorted.join(' > ')}. ${target[1]} is value number **${ans}**.`}`,
      };
    },
  },
  runtotal: {
    topics: ['sql-window-lag'], concept: 'running-total', difficulty: 3, style: 'practical',
    build(R) {
      const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
      const rows = months.map((m) => [m, int(R, 100, 900)]);
      const k = int(R, 2, 4);
      const ans = rows.slice(0, k + 1).reduce((a, r) => a + r[1], 0);
      return {
        prompt: `What is \`SUM(revenue) OVER (ORDER BY month)\` on the **${months[k]}** row?\n\n${table(['month', 'revenue'], rows)}`,
        answer: ans, tolerance: 0,
        explain: `A running total adds every row up to and including the current one: ${rows.slice(0, k + 1).map((r) => r[1]).join(' + ')} = **${ans}**.`,
      };
    },
  },
  growth: {
    topics: ['sql-window-lag', 'think-metrics', 'pbi-time'], concept: 'lag-lead', difficulty: 2, style: 'calculation',
    build(R) {
      const prev = int(R, 200, 5000);
      let cur = int(R, Math.round(prev * 0.6), Math.round(prev * 1.6));
      if (cur === prev) cur += 1;
      const ans = r1(((cur - prev) / prev) * 100);
      return {
        prompt: `Revenue was **${prev}** last month and **${cur}** this month. What is the month-on-month growth in percent? (1 decimal place; use a minus sign for a fall)`,
        answer: ans, tolerance: 0.1,
        explain: `(this − last) ÷ last = (${cur} − ${prev}) ÷ ${prev} = ${cur - prev} ÷ ${prev} = **${ans}%**. Always divide by the earlier value.`,
      };
    },
  },
  pctpoints: {
    topics: ['think-metrics'], concept: 'pct-points', difficulty: 2, style: 'interpretation',
    build(R) {
      const a = int(R, 5, 40);
      let b = int(R, 5, 40);
      if (b === a) b += 3;
      return {
        prompt: `A conversion rate moved from **${a}%** to **${b}%**. By how many **percentage points** did it change? (use a minus sign for a fall)`,
        answer: b - a, tolerance: 0,
        explain: `Percentage points are the plain difference: ${b} − ${a} = **${b - a}**. In relative terms that is ${r1(((b - a) / a) * 100)}%, which is a different statement. Reports should say which one they mean.`,
      };
    },
  },
  returnrate: {
    topics: ['sql-aggregate', 'think-metrics'], concept: 'integer-division', difficulty: 2, style: 'calculation',
    build(R) {
      const lines = int(R, 200, 3000);
      const rets = int(R, 5, Math.round(lines * 0.2));
      const ans = r2((rets / lines) * 100);
      return {
        prompt: `${lines} order lines were sold and ${rets} were returned. In SQLite, \`SELECT ${rets} / ${lines} * 100\` returns 0. What is the **real** return rate as a percentage? (2 decimal places)`,
        answer: ans, tolerance: 0.01,
        explain: `Integers divided by integers are truncated in SQLite, so ${rets}/${lines} becomes 0 before it is multiplied. Write \`${rets} * 100.0 / ${lines}\` to get **${ans}**.`,
      };
    },
  },

  // ------------------------------------------------------------------ Power Query / Power BI
  unpivot: {
    topics: ['pq-reshape'], concept: 'pq-unpivot', difficulty: 2, style: 'interpretation',
    build(R) {
      const products = int(R, 3, 40);
      const months = int(R, 3, 12);
      return {
        prompt: `A sheet has one row per product (**${products}** products), a Product column and a Category column, then **${months}** month columns. You select Product and Category and choose **Unpivot Other Columns**. How many rows does the result have?`,
        answer: products * months, tolerance: 0,
        explain: `Each product becomes one row per month column: ${products} × ${months} = **${products * months}**. The two identifier columns are repeated on every row; the month headers become values in an Attribute column.`,
      };
    },
  },
  append: {
    topics: ['pq-append'], concept: 'pq-append', difficulty: 2, style: 'interpretation',
    build(R) {
      const n = [int(R, 100, 900), int(R, 100, 900), int(R, 100, 900)];
      const dup = pick(R, [0, 1, 2]);
      const ans = n[0] + n[1] + n[2] + n[dup];
      return {
        prompt: `A folder holds January (**${n[0]}** rows), February (**${n[1]}**) and March (**${n[2]}**). Someone also saved a copy of ${['January', 'February', 'March'][dup]} as "copy.xlsx" in the same folder. How many rows does the folder import produce?`,
        answer: ans, tolerance: 0,
        explain: `Append stacks every file it finds and never removes duplicates, so the copy is counted too: ${n[0]} + ${n[1]} + ${n[2]} + ${n[dup]} = **${ans}**. Filtering the file list before combining prevents this.`,
      };
    },
  },
  divide: {
    topics: ['pbi-dax'], concept: 'dax-basics', difficulty: 2, style: 'calculation',
    build(R) {
      const rows = [0, 1, 2].map((i) => ({ dish: DISHES[i], rev: int(R, 800, 9000), marginPct: int(R, 15, 70) }));
      rows.forEach((x) => { x.margin = Math.round((x.rev * x.marginPct) / 100); });
      const rev = rows.reduce((a, x) => a + x.rev, 0);
      const mar = rows.reduce((a, x) => a + x.margin, 0);
      const ans = r1((mar / rev) * 100);
      return {
        prompt: `A measure is written as \`DIVIDE(SUM(Sales[Margin]), SUM(Sales[Revenue]))\`. What does it show on the total row, as a percentage? (1 decimal place)\n\n${table(['Dish', 'Revenue', 'Margin'], rows.map((x) => [x.dish, x.rev, x.margin]))}`,
        answer: ans, tolerance: 0.1,
        explain: `The measure is evaluated from scratch on the total row: ${mar} ÷ ${rev} = **${ans}%**. Averaging the three dish percentages would give a different, unweighted number.`,
      };
    },
  },
};

const ID = /^g\.([a-z]+)\.(\d{1,9})$/;

/** Rebuild a generated question from its id, or null if the id is not one of ours. */
export function resolveGenerated(id, topicMap) {
  const m = ID.exec(String(id));
  if (!m) return null;
  const gen = GENERATORS[m[1]];
  if (!gen) return null;
  const seed = Number(m[2]);
  const topicId = gen.topics[seed % gen.topics.length];
  const topic = topicMap[topicId];
  const built = gen.build(rng(seed));
  return {
    id, type: 'number', difficulty: gen.difficulty, concept: gen.concept, style: gen.style,
    topicId, skill: topic ? topic.skill : null, source: 'quiz', generated: true, ...built,
  };
}

/** Generator names that can produce questions for this topic. */
export function generatorsFor(topicId) {
  return Object.entries(GENERATORS).filter(([, g]) => g.topics.includes(topicId)).map(([name]) => name);
}

/**
 * A fresh generated question for this topic. The seed is chosen so the rebuilt question
 * lands on the same topic (resolveGenerated picks the topic from the seed).
 */
export function newGeneratedId(name, topicId, random = Math.random) {
  const gen = GENERATORS[name];
  const k = gen.topics.indexOf(topicId);
  const base = Math.floor(random() * 50_000_000);
  const seed = base - (base % gen.topics.length) + Math.max(0, k);
  return `g.${name}.${seed}`;
}
