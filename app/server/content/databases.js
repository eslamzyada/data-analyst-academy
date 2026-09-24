// Practice databases shown in the SQL Lab (built by tools/build-data.js).
export const DATABASES = [
  {
    id: 'cedarline', title: 'Cedarline Outdoor Supply', business: 'Retail',
    description: 'An outdoor-gear retailer with 5 stores and an online shop. Orders from Jan 2024 to Aug 2026.',
    notes: [
      'Net revenue = quantity x unit_price x (1 - discount_pct), for orders with status = \'completed\'.',
      'Order region: In-Store orders use the store\'s region; Online orders use the customer\'s region.',
      'customer_id is NULL for anonymous walk-in store sales.',
      'Dates are text in YYYY-MM-DD format. Use strftime(\'%Y-%m\', order_date) for the month.',
    ],
    tables: {
      stores: { description: 'One row per store.', columns: { store_id: 'Store code, e.g. W02', store_name: 'Store name', region: 'North / South / East / West', opened_on: 'Opening date' } },
      employees: { description: 'Store and head-office staff.', columns: { manager_id: 'employee_id of their manager (NULL for the head)', store_id: 'NULL for head-office staff' } },
      customers: { description: 'Registered customers (some people were registered twice).', columns: { region: 'Home region, can be NULL', acquisition_channel: 'How they found Cedarline, can be NULL' } },
      products: { description: 'Product catalogue.', columns: { list_price: 'CURRENT price (historic prices are in order_items.unit_price)', is_active: '1 = normal range, 0 = being phased out' } },
      orders: { description: 'One row per order (the header).', columns: { customer_id: 'NULL = walk-in', channel: 'Online or In-Store', store_id: 'NULL for Online', status: 'completed, cancelled or pending', shipping_fee: 'Charged once per order (Online only)' } },
      order_items: { description: 'One row per product line on an order.', columns: { unit_price: 'Price charged per unit, before discount', discount_pct: 'Fraction: 0.15 = 15% off' } },
      returns: { description: 'One row per return event (a line can be returned twice).', columns: { refund_amount: 'Money refunded' } },
    },
  },
  {
    id: 'restaurant', title: 'Olive & Ember Kitchen', business: 'Restaurant',
    description: 'A group of 3 restaurants (Downtown, Riverside, Airport). Daily sales, recipes, supplier purchases, waste, stock counts, labour and running costs, Jan 2025 to Aug 2026.',
    notes: [
      'Food cost % = cost of ingredients used / net sales. Ingredients used = opening stock + purchases - closing stock.',
      'Stock is counted on the last day of each month (inventory_counts).',
      'A recipe says how much of each ingredient one portion uses (qty_per_portion, in the ingredient\'s unit).',
      'Dates are text in YYYY-MM-DD format.',
    ],
    tables: {
      restaurants: { description: 'The 3 sites.', columns: {} },
      suppliers: { description: 'Who we buy from.', columns: {} },
      ingredients: { description: 'Everything the kitchens buy.', columns: { unit: 'kg, l or each' } },
      menu_items: { description: 'Dishes and drinks on the menu.', columns: { current_price: 'Price today' } },
      menu_price_history: { description: 'When menu prices changed.', columns: {} },
      recipes: { description: 'Ingredients per portion of each dish.', columns: { qty_per_portion: 'In the ingredient\'s unit' } },
      daily_sales: { description: 'One row per restaurant, day and dish.', columns: { net_sales: 'gross_sales - discount_amount' } },
      purchases: { description: 'Supplier invoice lines (what we paid).', columns: { line_total: 'qty x unit_cost' } },
      waste_log: { description: 'Food thrown away, logged weekly (and one-off incidents).', columns: {} },
      inventory_counts: { description: 'Month-end stock counts.', columns: { value_at_cost: 'Stock valued at the last price paid' } },
      labor_daily: { description: 'Staff hours and cost per day and role.', columns: {} },
      operating_costs: { description: 'Monthly rent, utilities, marketing and maintenance.', columns: { month: 'YYYY-MM' } },
    },
  },
  {
    id: 'hr', title: 'Brightpath Logistics', business: 'HR',
    description: 'A logistics company: employees, departments, salary changes, monthly attendance, performance ratings and exit interviews (2012 to Aug 2026).',
    notes: [
      'An employee has left when termination_date is not NULL.',
      'Voluntary turnover rate = voluntary leavers in a year / average headcount that year.',
      'attendance_monthly.month is text in YYYY-MM format.',
    ],
    tables: {
      departments: { description: 'Departments.', columns: {} },
      employees: { description: 'Everyone who has worked here, current and former.', columns: { manager_id: 'employee_id of their manager', termination_type: 'Voluntary / Involuntary / NULL', current_salary: 'Latest salary' } },
      salary_history: { description: 'Every salary change.', columns: { change_reason: 'Hire, Annual raise or Promotion' } },
      attendance_monthly: { description: 'Absence and overtime per person per month (2024 onwards).', columns: {} },
      performance_reviews: { description: 'Yearly rating 1 (poor) to 5 (excellent).', columns: {} },
      exit_interviews: { description: 'Why voluntary leavers left (2022 onwards).', columns: {} },
    },
  },
];
