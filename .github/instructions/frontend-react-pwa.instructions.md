---
applyTo: 'apps/customer-pwa/**'
---

# Customer PWA — React 19 + Vite Conventions

## App Structure

```
src/
├── features/          # Feature-based folders (PRIMARY ORGANIZATION)
│   ├── cart/
│   ├── menu/
│   ├── order/
│   ├── payment/
│   └── session/
├── components/
│   └── ui/            # shadcn/ui components (local copies)
├── lib/               # Utilities, api clients
└── routes/            # React Router v7 route definitions
```

## State Management

- **Server state:** TanStack Query (`@tanstack/react-query`) — use for all API calls
- **Local/UI state:** React `useState` / `useReducer`
- No Redux. No Zustand in this app.

## TanStack Query Pattern

```typescript
// Query
const { data, isPending } = useQuery({
  queryKey: ['menu', tenantId],
  queryFn: () => fetchMenu(tenantId),
});

// Mutation
const mutation = useMutation({
  mutationFn: addToCart,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
});
```

## shadcn/ui Usage

- Style: `radix-nova`, color system: oklch CSS variables
- Tailwind CSS v4 — use CSS variable utilities, not hardcoded colors
- Components live in `src/components/ui/` — do NOT import from management-app
- Add new shadcn components: `npx shadcn add <component>` inside `apps/customer-pwa/`

## Routing (React Router v7)

- Use `createBrowserRouter` with file-based routes
- Lazy-load feature route components for performance
- QR code session param: `/:tenantSlug/:tableId`

## API Communication

- All requests go to BFF at port 3000
- Include `X-Tenant-ID` header on all requests
- Use TanStack Query's `queryClient` for cache invalidation

## Performance Rules

- Lazy-load feature components with `React.lazy()`
- Memoize expensive list renders with `React.memo`
- Use TanStack Query's `staleTime` appropriately (menu data: 5min, cart: 0)
