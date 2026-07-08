'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { isSoundEnabled, setSoundEnabled } from '@/mocks/audio';
import {
  readKdsFontPx,
  readKdsSlaCapMinutes,
  writeKdsFontPx,
  writeKdsSlaCapMinutes,
} from '@/lib/kds-station-prefs';
import type { KDSStation } from '@/mocks/kds-ticket';

type Props = {
  station: KDSStation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function StationSettingsPopover({ station, open, onOpenChange, onSaved }: Props) {
  const baseId = useId();
  const [slaMin, setSlaMin] = useState(15);
  const [fontPx, setFontPx] = useState(18);
  const [sound, setSound] = useState(true);

  const handleDialogOpenChange = (next: boolean) => {
    if (next) {
      setSlaMin(readKdsSlaCapMinutes(station));
      setFontPx(readKdsFontPx(station));
      setSound(isSoundEnabled());
    }
    onOpenChange(next);
  };

  const persist = () => {
    writeKdsSlaCapMinutes(station, slaMin);
    writeKdsFontPx(station, fontPx);
    setSoundEnabled(sound);
    onSaved?.();
    handleDialogOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent data-kds-ignore-shortcuts>
        <DialogHeader>
          <DialogTitle>Cài đặt trạm · {station === 'KITCHEN' ? 'Bếp' : 'Bar'}</DialogTitle>
          <DialogDescription>
            Ngưỡng SLA (cap phút) và cỡ chữ chỉ ảnh hưởng mock KDS; lưu theo trạm trên thiết bị này.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${baseId}-sla`}>
              Cap SLA (phút): {slaMin}
            </Label>
            <input
              id={`${baseId}-sla`}
              type="range"
              min={5}
              max={20}
              step={1}
              value={slaMin}
              className="accent-primary"
              onChange={(e) => setSlaMin(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${baseId}-font`}>
              Cỡ chữ UI: {fontPx}px
            </Label>
            <input
              id={`${baseId}-font`}
              type="range"
              min={14}
              max={22}
              step={1}
              value={fontPx}
              className="accent-primary"
              onChange={(e) => setFontPx(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
            <Checkbox id={`${baseId}-sound`} checked={sound} onCheckedChange={(v) => setSound(v === true)} />
            <Label htmlFor={`${baseId}-sound`} className="cursor-pointer">
              Âm thanh cảnh báo
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={persist}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
