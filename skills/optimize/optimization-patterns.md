---
description: Performance optimization patterns and O(n) reduction techniques
globs:
alwaysApply: true
---

# Performance Optimization Patterns

When optimizing code, follow these patterns to reduce computational complexity and improve performance.

---

## 1. Eliminate Nested Loops — O(n²) → O(n)

### 1.1 Use Map/Set for Lookups Instead of Array.find/includes in Loops

BAD — O(n²):
```typescript
const result = orders.map(order => {
  const company = companies.find(c => c.id === order.companyId);
  return { ...order, companyName: company?.name };
});
```

GOOD — O(n):
```typescript
const companyMap = new Map(companies.map(c => [c.id, c]));
const result = orders.map(order => {
  const company = companyMap.get(order.companyId);
  return { ...order, companyName: company?.name };
});
```

### 1.2 Use Set for Existence Checks Instead of Array.includes in Loops

BAD — O(n²):
```typescript
const activeIds = activeUsers.map(u => u.id);
const filtered = allUsers.filter(u => activeIds.includes(u.id));
```

GOOD — O(n):
```typescript
const activeIdSet = new Set(activeUsers.map(u => u.id));
const filtered = allUsers.filter(u => activeIdSet.has(u.id));
```

### 1.3 Use Object Index for Grouping Instead of Repeated filter()

BAD — O(n²):
```typescript
const categories = [...new Set(items.map(i => i.category))];
const grouped = categories.map(cat => ({
  category: cat,
  items: items.filter(i => i.category === cat)
}));
```

GOOD — O(n):
```typescript
const grouped = new Map<string, typeof items>();
for (const item of items) {
  const existing = grouped.get(item.category);
  if (existing) {
    existing.push(item);
  } else {
    grouped.set(item.category, [item]);
  }
}
```

---

## 2. Database Query Optimization

### 2.1 Avoid N+1 Queries — Use Batch Fetch

BAD — N+1 queries:
```typescript
const orders = await OrderRepository.findAll();
for (const order of orders) {
  order.company = await CompanyRepository.findById(order.companyId);
}
```

GOOD — 2 queries:
```typescript
const orders = await OrderRepository.findAll();
const companyIds = [...new Set(orders.map(o => o.companyId))];
const companies = await CompanyRepository.findByIds(companyIds);
const companyMap = new Map(companies.map(c => [c.id, c]));
orders.forEach(order => {
  order.company = companyMap.get(order.companyId);
});
```

### 2.2 Use Sequelize include Instead of Manual Joins

BAD:
```typescript
const invoices = await Invoice.findAll();
for (const invoice of invoices) {
  invoice.payments = await Payment.findAll({ where: { invoiceId: invoice.id } });
}
```

GOOD:
```typescript
const invoices = await Invoice.findAll({
  include: [{ model: Payment, as: 'payments' }]
});
```

### 2.3 Use WHERE IN Instead of Multiple Queries

BAD:
```typescript
for (const id of ids) {
  const record = await Model.findByPk(id);
  results.push(record);
}
```

GOOD:
```typescript
const results = await Model.findAll({
  where: { id: { [Op.in]: ids } }
});
```

### 2.4 Select Only Needed Columns

BAD:
```typescript
const users = await User.findAll();
const names = users.map(u => u.name);
```

GOOD:
```typescript
const users = await User.findAll({ attributes: ['id', 'name'] });
const names = users.map(u => u.name);
```

---

## 3. Reduce Redundant Iterations

### 3.1 Combine Multiple Passes Into One

BAD — 3 passes over array:
```typescript
const total = items.reduce((sum, i) => sum + i.amount, 0);
const count = items.filter(i => i.status === 'active').length;
const names = items.map(i => i.name);
```

GOOD — 1 pass:
```typescript
let total = 0;
let activeCount = 0;
const names: string[] = [];
for (const item of items) {
  total += item.amount;
  if (item.status === 'active') { activeCount++; }
  names.push(item.name);
}
```

### 3.2 Use Early Return / Break to Avoid Unnecessary Iteration

BAD:
```typescript
let found = false;
for (const item of items) {
  if (item.id === targetId) {
    found = true;
  }
}
```

GOOD:
```typescript
const found = items.some(item => item.id === targetId);
```

Or with early break:
```typescript
let foundItem = null;
for (const item of items) {
  if (item.id === targetId) {
    foundItem = item;
    break;
  }
}
```

---

## 4. String and Object Operations

### 4.1 Use Array.join Instead of String Concatenation in Loops

BAD:
```typescript
let result = '';
for (const item of items) {
  result += item.name + ', ';
}
```

GOOD:
```typescript
const result = items.map(item => item.name).join(', ');
```

### 4.2 Avoid Spread in Reduce for Object Building

BAD — O(n²) due to object spread:
```typescript
const map = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
```

GOOD — O(n):
```typescript
const map: Record<string, typeof items[0]> = {};
for (const item of items) {
  map[item.id] = item;
}
```

Or:
```typescript
const map = new Map(items.map(item => [item.id, item]));
```

---

## 5. Async/Promise Optimization

### 5.1 Use Promise.all for Independent Async Operations

BAD — sequential:
```typescript
const company = await getCompany(companyId);
const ship = await getShip(shipId);
const currency = await getCurrency(currencyId);
```

GOOD — parallel:
```typescript
const [company, ship, currency] = await Promise.all([
  getCompany(companyId),
  getShip(shipId),
  getCurrency(currencyId)
]);
```

### 5.2 Batch Parallel with Controlled Concurrency

For large arrays, avoid Promise.all on thousands of items — use batching:
```typescript
const BATCH_SIZE = 10;
const results = [];
for (let index = 0; index < items.length; index += BATCH_SIZE) {
  const batch = items.slice(index, index + BATCH_SIZE);
  const batchResults = await Promise.all(batch.map(item => processItem(item)));
  results.push(...batchResults);
}
```

---

## 6. Caching Patterns

### 6.1 Cache Expensive Computations

```typescript
const cache = new Map<string, Result>();

function getExpensiveResult(key: string): Result {
  const cached = cache.get(key);
  if (cached) { return cached; }
  const result = computeExpensiveResult(key);
  cache.set(key, result);
  return result;
}
```

### 6.2 Memoize RPC Calls Within a Request

```typescript
const rpcCache = new Map<number, Company>();

async function getCompanyCached(companyId: number): Promise<Company> {
  const cached = rpcCache.get(companyId);
  if (cached) { return cached; }
  const company = await getCompanyById(companyId);
  rpcCache.set(companyId, company);
  return company;
}
```

---

## Optimization Process

When optimizing code:

1. **Identify hotspots** — Find loops within loops, repeated array scans, N+1 queries
2. **Measure complexity** — Determine current Big-O for each block
3. **Apply pattern** — Use the matching optimization pattern from above
4. **Verify correctness** — Ensure the optimized code produces the same result
5. **Report changes** — For each optimization, state:
   - Location (file:line)
   - Before complexity (e.g., O(n²))
   - After complexity (e.g., O(n))
   - What was changed

Priority order:
1. **Database queries** — N+1 and missing indexes have the biggest real-world impact
2. **Nested loops with lookups** — Map/Set conversions
3. **Redundant iterations** — Combining passes
4. **Async parallelization** — Promise.all for independent calls
5. **Object spread in reduce** — Hidden O(n²)
