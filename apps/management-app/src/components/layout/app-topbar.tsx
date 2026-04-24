'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
} from '@einvoice/frontend-ui';
import { LogOut, UserCircle2 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

import { Search } from '@/components/search';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { RouteBreadcrumb } from '@/components/layout/route-breadcrumb';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { useAuthStore } from '@/lib/auth/auth-store';
import { NotificationsPopover } from '@/components/pos/notifications-popover';
import { ROUTES } from '@/constants/routes';

type AppTopbarProps = {
  title: string;
  showGlobalSearch?: boolean;
};

export function AppTopbar({ title, showGlobalSearch = false }: AppTopbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const profile = useAuthStore((state) => state.profile);

  const displayName = session?.user?.name || profile?.email || 'QRTable User';
  const showPosNotifications = pathname.startsWith(ROUTES.POS);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger variant="outline" className="-ms-0.5" />
        <Separator orientation="vertical" className="h-6 self-center" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <RouteBreadcrumb />
        </div>

        {showGlobalSearch ? (
          <div className="hidden min-w-0 max-w-md flex-1 md:flex md:justify-end">
            <Search />
          </div>
        ) : null}

        {showPosNotifications ? <NotificationsPopover /> : null}

        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-1.5">
              <Avatar className="size-8 rounded-md">
                <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
                <AvatarFallback>QT</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle2 />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void signOut({ callbackUrl: '/login' });
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
