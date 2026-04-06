---
description: Anti-patterns and good patterns reference for code analysis
globs:
alwaysApply: false
---

# Analysis Pattern Reference

Use these patterns to identify issues and strengths in code during analysis. Each pattern has a severity level, detection heuristic, and example.

---

## CRITICAL Patterns (Must Fix)

### C1. N+1 Query — await in Loop
**Detect:** `await` call to a database/RPC function inside `for`, `forEach`, `map`, or `while`
**Complexity:** O(n) database calls where 1-2 would suffice
**Impact:** Linear growth in query count — 100 items = 100 DB round-trips

```typescript
// BAD — N+1
for (const order of orders) {
  order.company = await CompanyRepository.findById(order.companyId); // N queries
}
```

### C2. Nested Loop with Lookup — O(n²)
**Detect:** `Array.find()`, `Array.filter()`, `Array.includes()`, or `Array.indexOf()` called inside `.map()`, `.forEach()`, `for`, or `.filter()`
**Complexity:** O(n*m) where n and m are array sizes — effectively O(n²) if same magnitude
**Impact:** 1000 items × 1000 lookups = 1,000,000 operations

```typescript
// BAD — O(n²)
const result = orders.map(order => {
  const company = companies.find(c => c.id === order.companyId);
  return { ...order, companyName: company?.name };
});
```

### C3. Unbounded Data Fetch
**Detect:** `findAll()` or `SELECT *` with no `limit`, `where`, or pagination on a table that can grow indefinitely
**Complexity:** O(n) memory + O(n) transfer for entire table
**Impact:** Table grows to 100K rows → response takes seconds, may OOM

```typescript
// BAD — unbounded
const allInvoices = await Invoice.findAll(); // could be 500K rows
```

### C4. Memory Leak — Growing Cache Without Eviction
**Detect:** `Map` or object used as cache at module level with `.set()` but never `.delete()` or `.clear()`, and no size limit
**Complexity:** O(n) memory growth over application lifetime
**Impact:** Memory usage grows indefinitely, eventually OOM or GC pressure

```typescript
// BAD — never cleared
const cache = new Map();
function getCached(id) {
  if (!cache.has(id)) { cache.set(id, fetchData(id)); }
  return cache.get(id);
}
```

### C5. Quadratic String Building
**Detect:** String `+=` or template literal concatenation inside a loop over a large/unbounded collection
**Complexity:** O(n²) due to string immutability — each `+=` creates a new string copy
**Impact:** 10K iterations with growing string = ~50M character copies

```typescript
// BAD — O(n²) string building
let html = '';
for (const row of rows) {
  html += `<tr><td>${row.name}</td></tr>`;
}
```

---

## ISSUE Patterns (Should Fix)

### I1. Sequential Awaits That Could Be Parallel
**Detect:** Multiple consecutive `await` calls where no call depends on a previous call's result
**Complexity:** Total time = sum of all call durations (instead of max)
**Impact:** 3 RPC calls × 100ms each = 300ms sequential vs 100ms parallel

```typescript
// BAD — sequential
const company = await getCompany(companyId);
const ship = await getShip(shipId);
const currency = await getCurrency(currencyId);
```

### I2. Object Spread in Reduce — Hidden O(n²)
**Detect:** `.reduce()` with `{ ...acc }` or `[...acc]` in the callback
**Complexity:** O(n²) — each iteration copies the entire accumulator
**Impact:** 1000 items → ~500K object property copies

```typescript
// BAD — O(n²)
const map = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
```

### I3. Multiple Passes Over Same Array
**Detect:** Same array variable appears in 3+ chained operations (`.map`, `.filter`, `.reduce`, `.find`, `.some`, `.every`) that could be combined into a single `for` loop
**Complexity:** O(k*n) where k = number of passes — not catastrophic but wasteful
**Impact:** Large arrays with many passes waste CPU and create intermediate garbage

```typescript
// BAD — 3 passes
const total = items.reduce((s, i) => s + i.amount, 0);
const active = items.filter(i => i.status === 'active');
const names = items.map(i => i.name);
```

### I4. SELECT * When Few Fields Needed
**Detect:** `findAll()` or `findOne()` without `attributes` parameter, where the result is immediately mapped to a subset of fields
**Complexity:** O(n) extra data transferred over network
**Impact:** Fetching 50 columns when only 3 needed — wasted bandwidth and memory

```typescript
// BAD — fetches all columns
const users = await User.findAll();
const emails = users.map(u => u.email); // only needed email
```

### I5. Manual Join Instead of Sequelize Include
**Detect:** Two separate queries where the second fetches related records by IDs from the first, and a Sequelize association exists
**Complexity:** 2 queries instead of 1 with JOIN
**Impact:** Extra round-trip, no DB-level optimization

```typescript
// BAD — manual join
const invoices = await Invoice.findAll();
const paymentIds = invoices.map(i => i.paymentId);
const payments = await Payment.findAll({ where: { id: paymentIds } });
```

### I6. Synchronous Heavy Computation on Event Loop
**Detect:** CPU-intensive loop (>1000 iterations with computation) in a request handler without `setImmediate` or worker thread
**Complexity:** Blocks event loop for O(n) time
**Impact:** All other requests wait while this computation runs

### I7. No Error Boundary on External Calls
**Detect:** RPC/HTTP/DB call without try-catch or `.catch()` in a function that should handle failures gracefully
**Complexity:** N/A — reliability issue
**Impact:** One failed call crashes the entire request

---

## WARNING Patterns (Low Priority)

### W1. Missing Early Return / Break
**Detect:** Full array iteration (`for`, `forEach`, `filter`) when only the first match or existence check is needed — could use `Array.find`, `Array.some`, or `break`
**Complexity:** O(n) instead of O(1) average case

### W2. Small-Array Lookup in Loop
**Detect:** Same as C2 (Array.find in loop) but the lookup array is provably small (<20 items from a constant, enum, or bounded query)
**Note:** Flag as WARNING, not CRITICAL — the O(n²) is bounded and negligible

### W3. Unnecessary Intermediate Array
**Detect:** `.map().filter()` or `.filter().map()` that creates a throwaway intermediate array — could be a single `for` loop or `.flatMap()`
**Complexity:** O(n) extra memory for intermediate array

### W4. Redundant Null Check After Required Field
**Detect:** Checking `if (x != null)` on a field that is NOT NULL in the database schema or is already validated upstream
**Note:** Not a performance issue but adds noise — flag as code cleanliness

### W5. Large Object Clone
**Detect:** `JSON.parse(JSON.stringify(obj))` or spread `{ ...deepObj }` on objects with many nested levels
**Complexity:** O(n) where n = total number of properties in the object tree

---

## GOOD Patterns (Strengths to Highlight)

### G1. Map/Set for Lookups
**Detect:** `new Map(array.map(...))` or `new Set(array.map(...))` created before a loop that needs lookups
**Why good:** Converts O(n²) lookup-in-loop to O(n)

### G2. Promise.all for Parallel Async
**Detect:** `Promise.all([...])` or `Promise.allSettled([...])` with independent async calls
**Why good:** Parallel execution — total time = max(individual times) instead of sum

### G3. Sequelize Include / Association
**Detect:** `findAll({ include: [...] })` or `findOne({ include: [...] })` for related data
**Why good:** Single query with JOIN instead of multiple round-trips

### G4. Batch Database Operations
**Detect:** `bulkCreate`, `WHERE IN`, or `Op.in` for batch operations instead of loop-of-single-queries
**Why good:** 1 query instead of N

### G5. Early Return / Guard Clause
**Detect:** `if (!condition) { return; }` at the top of a function or `break` in a loop after finding the target
**Why good:** Avoids unnecessary computation

### G6. Column Selection
**Detect:** `attributes: [...]` in Sequelize queries to select only needed columns
**Why good:** Reduces data transfer and memory usage

### G7. Proper Pagination
**Detect:** `limit` + `offset` or cursor-based pagination on list endpoints
**Why good:** Bounds response size regardless of table growth

### G8. Controlled Concurrency / Batching
**Detect:** Processing large arrays in batches (`BATCH_SIZE`, chunked `Promise.all`)
**Why good:** Prevents overwhelming the database or exceeding connection pool

### G9. Request-Scoped Caching
**Detect:** Cache (Map/object) created inside a request handler and used to deduplicate repeated lookups within the same request
**Why good:** Reduces redundant calls without memory leak risk

### G10. Proper Error Boundaries
**Detect:** try-catch around external calls (DB, RPC, HTTP) with meaningful error handling or fallback
**Why good:** Fault isolation — one failure doesn't crash everything

---

## Complexity Quick Reference

| Pattern | Time | Flag |
|---------|------|------|
| Simple loop | O(n) | OK |
| Nested loop with lookup | O(n²) | CRITICAL |
| Loop with Map/Set lookup | O(n) | GOOD |
| Array.find in loop | O(n²) | CRITICAL |
| Reduce with spread | O(n²) | ISSUE |
| Reduce with mutation | O(n) | OK |
| Multiple array passes (k passes) | O(kn) | ISSUE if k>2 |
| String concat in loop | O(n²) | CRITICAL |
| Array.join | O(n) | GOOD |
| Await in loop (DB) | N+1 queries | CRITICAL |
| Promise.all | Parallel | GOOD |
| Sequential awaits (independent) | Sum of times | ISSUE |
| findAll() no limit | Unbounded | CRITICAL |
| findAll() with limit + offset | Bounded | GOOD |
