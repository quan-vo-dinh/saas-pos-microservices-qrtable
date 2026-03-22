'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMenu } from './menu-provider';

export function MenuPrimaryButtons() {
  const { setOpen } = useMenu();

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen('add-category')}>
        <Plus className="mr-2 size-4" />
        Add Category
      </Button>
      <Button size="sm" onClick={() => setOpen('add-item')}>
        <Plus className="mr-2 size-4" />
        Add Item
      </Button>
    </div>
  );
}
