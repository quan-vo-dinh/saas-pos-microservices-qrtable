'use client';

import { useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@einvoice/frontend-ui';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useMockStore } from '@/mocks/store';

const MOCK_TENANTS = ['Phở Tầm Anh', 'Highland Demo', 'Bar Saigon'] as const;

export function TenantSwitcherPopover() {
  const [open, setOpen] = useState(false);
  const active = useMockStore((s) => s.activeMockTenantName);
  const setName = useMockStore((s) => s.setActiveMockTenantName);

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" aria-hidden />
            </div>
            <div className="grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">{active}</span>
              <span className="truncate text-xs text-muted-foreground">Mock tenant · chọn để demo</span>
            </div>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="right" sideOffset={8}>
          <Command>
            <CommandInput placeholder="Lọc tenant…" />
            <CommandList>
              <CommandEmpty>Không thấy.</CommandEmpty>
              <CommandGroup heading="Tenant (mock)">
                {MOCK_TENANTS.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      setName(name);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{name}</span>
                    {active === name ? <Check className="ms-auto size-4 opacity-80" aria-label="Đang chọn" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}
