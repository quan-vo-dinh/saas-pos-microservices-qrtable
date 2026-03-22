'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTables } from './tables-provider';

export function TablesPrimaryButtons() {
  const { setOpen } = useTables();

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen('add-area')}>
        <Plus className="mr-2 size-4" />
        Add Area
      </Button>
      <Button size="sm" onClick={() => setOpen('add-table')}>
        <Plus className="mr-2 size-4" />
        Add Table
      </Button>
    </div>
  );
}
