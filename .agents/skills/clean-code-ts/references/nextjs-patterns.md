# Next.js Patterns Reference

## Component Architecture — Separation of Concerns

```typescript
// ❌ Fat component doing everything
export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`http://localhost:3001/users/${userId}`) // ❌ hardcoded URL
      .then(r => r.json()).then(setUser);
  }, [userId]);
  // ... 200 lines of UI + logic mixed
}

// ✅ Separation: hook handles data, component handles UI
// hooks/use-user-profile.ts
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: () => userApi.getProfile(userId),
    staleTime: 1000 * 60 * 5,
  });
}

// user-profile.tsx
export function UserProfile({ userId }: UserProfileProps) {
  const { data: user, isLoading, error } = useUserProfile(userId);
  if (isLoading) return <UserProfileSkeleton />;
  if (error) return <ErrorState error={error} />;
  return <UserProfileView user={user} />;
}
```

## API Layer — Never Call fetch Directly in Components

```typescript
// ✅ lib/api/user.api.ts — typed, centralized
import { apiClient } from '@/lib/api/client';
import type { User, CreateUserInput, PaginatedResult } from '@/types';

export const userApi = {
  getProfile: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: CreateUserInput) => apiClient.post<User>('/users', data),
  list: (params: PaginationParams) => apiClient.get<PaginatedResult<User>>('/users', { params }),
} as const;

// ✅ lib/api/client.ts — single configured axios/fetch instance
export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  timeout: appConfig.requestTimeout,
  headers: { 'Content-Type': 'application/json' },
});
```

## Query Keys — Structured, No Magic Strings

```typescript
// ✅ lib/query-keys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params: PaginationParams) => [...queryKeys.users.lists(), params] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: string) => [...queryKeys.orders.all, 'user', userId] as const,
  },
} as const;
```

## Forms — React Hook Form + Zod, Always

```typescript
// ✅ Schema lives with the form feature
const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  displayName: z.string().max(100).optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '' },
  });
  // ...
}
```

## State Management — Zustand Slices, Not God Store

```typescript
// ❌ One massive store for everything
// ✅ Domain-scoped stores

// stores/auth.store.ts
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  actions: {
    login: (credentials: LoginInput) => Promise<void>;
    logout: () => void;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      actions: {
        login: async (credentials) => {
          const { user, token } = await authApi.login(credentials);
          set({ user, token });
        },
        logout: () => set({ user: null, token: null }),
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token }) },
  ),
);

// Consume actions separately (avoids unnecessary rerenders)
export const useAuthActions = () => useAuthStore((s) => s.actions);
```

## Route Constants — No Hardcoded Paths

```typescript
// ✅ lib/routes.ts
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
  DASHBOARD: {
    ROOT: '/dashboard',
    PROFILE: '/dashboard/profile',
    SETTINGS: '/dashboard/settings',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id: string) => `/users/${id}`,
    EDIT: (id: string) => `/users/${id}/edit`,
  },
} as const;
```

## Server Components vs Client Components

```typescript
// Rule: default to Server Component; opt-in to 'use client' only when needed
// Needs 'use client': useState, useEffect, event handlers, browser APIs, Zustand

// ✅ Server Component (default) — data fetching at the server
// app/users/[id]/page.tsx
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await userService.getProfile(params.id); // direct service call, no fetch overhead
  return <UserProfile user={user} />;
}

// ✅ Client Component — only for interactivity
// features/user-profile/components/follow-button.tsx
'use client';
export function FollowButton({ userId }: { userId: string }) {
  const { mutate: follow, isPending } = useFollowUser(userId);
  return <Button onClick={() => follow()} disabled={isPending}>Follow</Button>;
}
```
