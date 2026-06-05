'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMockStore } from '@/mocks/store';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RecallLogSheet({ open, onOpenChange }: Props) {
  const recallLog = useMockStore((s) => s.recallLog);
  const markRecallResolved = useMockStore((s) => s.markRecallResolved);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-l border-border bg-background text-foreground sm:max-w-lg"
        data-kds-ignore-shortcuts
      >
        <SheetHeader>
          <SheetTitle>Nhật ký recall</SheetTitle>
          <SheetDescription>Ghi nhận recall trong phiên (24 giờ gần nhất).</SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 max-h-[calc(100vh-8rem)]">
          <div className="rounded-lg border border-border pe-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[140px] text-[0.65rem]">Lúc</TableHead>
                  <TableHead className="text-[0.65rem]">Ticket</TableHead>
                  <TableHead className="text-[0.65rem]">Người</TableHead>
                  <TableHead className="text-[0.65rem]">Lý do</TableHead>
                  <TableHead className="w-[100px] text-[0.65rem]">TT</TableHead>
                  <TableHead className="w-[120px] text-[0.65rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recallLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Chưa có recall.
                    </TableCell>
                  </TableRow>
                ) : (
                  recallLog.map((e) => (
                    <TableRow key={e.id} className="border-border">
                      <TableCell className="font-mono text-[0.65rem] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">#{e.ticketId.slice(-4)}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-[0.75rem]">{e.userName}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-[0.75rem]">{e.reason}</TableCell>
                      <TableCell>
                        {e.resolved ? (
                          <Badge variant="secondary">Đã xử lý</Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/40 text-destructive">
                            Mở
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {!e.resolved ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[0.65rem]"
                            onClick={() => markRecallResolved(e.id)}
                          >
                            Đánh dấu xử lý
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
