'use client';

import { Bell, LogOut, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { RouteBreadcrumb } from '@/components/layout/route-breadcrumb';
import { ModeToggle } from '@/components/layout/mode-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AppTopbarProps = {
  title: string;
};

export function AppTopbar({ title }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger variant="outline" />
        <Separator orientation="vertical" className="!h-6 !self-center" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <RouteBreadcrumb />
        </div>

        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <Bell />
        </Button>

        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-1.5">
              <Avatar className="size-8 rounded-md">
                <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
                <AvatarFallback>QT</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">QRTable User</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle2 />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
