'use client';

import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { parseRoles } from '@/lib/auth/role-routing';

type Props = {
  orderId: string;
  onCancelClick: () => void;
  children: ReactNode;
};

export function OrderRowContextMenu({ orderId, onCancelClick, children }: Props) {
  const { data: session } = useSession();
  const roles = parseRoles(session?.user?.roles);
  const isManager = roles.includes('MANAGER') || roles.includes('OWNER') || roles.includes('SUPER_ADMIN');

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem
          onSelect={() => {
            void navigator.clipboard.writeText(orderId);
            toast('Đã copy mã đơn');
          }}
        >
          Copy mã đơn
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            toast('In KOT — tích hợp ở bước 2.5');
          }}
        >
          In KOT
        </ContextMenuItem>
        <ContextMenuSeparator />
        {isManager ? (
          <ContextMenuItem onSelect={() => onCancelClick()} className="text-destructive">
            Force-cancel
          </ContextMenuItem>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full text-sm text-muted-foreground" data-disabled>
                Force-cancel (khoá)
              </div>
            </TooltipTrigger>
            <TooltipContent>Chỉ Manager</TooltipContent>
          </Tooltip>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
