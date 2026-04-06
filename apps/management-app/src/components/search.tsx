'use client';

import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@einvoice/frontend-ui';

export function Search() {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        className="w-48 pl-8 sm:w-64"
      />
    </div>
  );
}
