// Extra Excel files (content expansion).
//   - Harbor & Pine daily KPIs, January to June 2026: a normal online shop with a marketing calendar,
//     plus four problems that look like business events but are not (a duplicated import, a card
//     payment outage, a refund spike and bot traffic). Built for anomaly detection.
import path from 'node:path';
import { FILES, makeRng, round2, iso, ymd, eachDay, writeWorkbook } from '../lib.js';

export const HP_EVENTS = [
  { from: '2026-02-14', to: '2026-02-14', name: 'Valentine\'s Day email', sessions: 1.25, cr: 1.05 },
  { from: '2026-04-01', to: '2026-04-03', name: 'Spring Sale', sessions: 1.8, cr: 1.3 },
  { from: '2026-05-08', to: '2026-05-08', name: 'Website release 4.2', sessions: 1, cr: 1 },
  { from: '2026-06-01', to: '2026-06-03', name: 'Summer lookbook campaign', sessions: 1.6, cr: 1.05 },
];
export const HP_PROBLEMS = {
  duplicateImport: '2026-02-11',
  cardOutage: '2026-03-19',
  refundSpike: '2026-05-27',
  botTraffic: '2026-06-15',
};

export async function buildHarborPineDaily() {
  const R = makeRng(26093004);
  const WEEK = [0.9, 1.0, 1.02, 1.0, 0.97, 0.86, 0.95]; // Sun..Sat
  const days = [];
  let t = 0;
  for (const day of eachDay(ymd(2026, 1, 1), ymd(2026, 6, 30))) {
    const d = iso(day);
    const ev = HP_EVENTS.find((e) => d >= e.from && d <= e.to);
    let sessions = Math.round(4200 * (1 + 0.08 * t / 180) * WEEK[day.getUTCDay()] * R.uniform(0.92, 1.08) * (ev ? ev.sessions : 1));
    const cr = R.normal(0.024, 0.0012) * (ev ? ev.cr : 1);
    let orders = Math.round(sessions * cr);
    let card = Math.round(orders * R.uniform(0.69, 0.75));
    let paypal = orders - card;
    const aov = R.normal(86, 4);
    let refunds = R.poisson(orders * 0.035);
    let refundValue = round2(refunds * R.normal(78, 5));
    if (d === HP_PROBLEMS.duplicateImport) { card *= 2; paypal *= 2; }
    if (d === HP_PROBLEMS.cardOutage) { card = Math.round(card * 0.12); paypal = Math.round(paypal * 1.4); }
    if (d === HP_PROBLEMS.refundSpike) { refunds *= 6; refundValue = round2(refundValue * 6); }
    if (d === HP_PROBLEMS.botTraffic) sessions = Math.round(sessions * 3.2);
    orders = card + paypal;
    const revenue = round2(orders * aov);
    days.push({ date: d, day, sessions, orders, revenue, card, paypal, refunds, refundValue, event: ev ? ev.name : null });
    t++;
  }
  const file = path.join(FILES, 'excel', 'harbor_pine_daily_kpis_2026.xlsx');
  await writeWorkbook(file, [
    {
      name: 'Daily', freeze: true,
      columns: [{ header: 'Date', width: 12 }, { header: 'Sessions', width: 10 }, { header: 'Orders', width: 9 }, { header: 'Revenue', width: 11, numFmt: '#,##0.00' },
        { header: 'Card Orders', width: 12 }, { header: 'PayPal Orders', width: 13 }, { header: 'Refunds', width: 9 }, { header: 'Refund Value', width: 13, numFmt: '#,##0.00' }],
      rows: days.map((x) => [x.day, x.sessions, x.orders, x.revenue, x.card, x.paypal, x.refunds, x.refundValue]),
    },
    {
      name: 'Calendar',
      columns: [{ header: 'From', width: 12 }, { header: 'To', width: 12 }, { header: 'Event', width: 30 }],
      rows: HP_EVENTS.map((e) => [new Date(`${e.from}T00:00:00Z`), new Date(`${e.to}T00:00:00Z`), e.name]),
    },
  ]);
  return { days, file };
}

export async function buildExcelExtraFiles() {
  return { hpDaily: await buildHarborPineDaily() };
}
