---
applyTo: 'apps/management-app/**'
---

# Management App — Next.js 16 App Router Conventions

## Route Groups Structure

```
app/
├── (auth)/            # Login, register pages (no layout)
├── (admin)/           # Super-admin pages
├── (dashboard)/       # Main tenant dashboard
├── (pos)/             # Point-of-sale terminal view
└── (kds)/             # Kitchen Display System view
```

## Server vs Client Components

- Default to **Server Components (RSC)** — fetch data server-side
- Add `"use client"` ONLY when needing: event handlers, state, browser APIs
- Keep client components small — push data fetching to server as high as possible

## Data Fetching Pattern

```typescript
// Server Component — preferred
async function ProductList({ tenantId }: Props) {
  const products = await fetchProducts(tenantId); // direct fetch, no useEffect
  return <ProductTable data={products} />;
}

// Client Component — only when interactive
"use client"
function ProductForm() {
  const form = useForm<Schema>({ resolver: zodResolver(schema) });
}
```

## Auth (NextAuth v5)

- Session via `auth()` in server components
- `useSession()` hook in client components
- Protected routes via middleware in `middleware.ts`
- Keycloak provider configured — do NOT add other providers without approval

## State Management

- **Server state:** Next.js `fetch` with `revalidateTag` / `revalidatePath`
- **Client state:** Zustand stores in `src/stores/`
- **Forms:** react-hook-form + Zod schema validation — always validate both client and server

## Zustand Pattern

```typescript
// stores/useCartStore.ts
interface CartStore {
  items: Item[];
  addItem: (item: Item) => void;
}
export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));
```

## shadcn/ui Usage

- Style: `radix-nova`, oklch color system (same as customer-pwa)
- Components in `src/components/ui/` — local copies, do NOT share with customer-pwa
- Forms: Always use shadcn `Form` + react-hook-form integration

## Multi-Tenant

- `tenantId` resolved from subdomain in middleware
- Pass as prop to server components, never fetch in client
- API calls include `Authorization: Bearer <token>` from NextAuth session
