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
      <DialogContent className="border-white/10 bg-[#090b10] text-[var(--ink)]" data-kds-ignore-shortcuts>
        <DialogHeader>
          <DialogTitle>Cài đặt trạm · {station === 'KITCHEN' ? 'Bếp' : 'Bar'}</DialogTitle>
          <DialogDescription className="text-white/55">
            Ngưỡng SLA (cap phút) và cỡ chữ chỉ ảnh hưởng mock KDS; lưu theo trạm trên thiết bị này.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${baseId}-sla`} className="text-[var(--ink)]">
              Cap SLA (phút): {slaMin}
            </Label>
            <input
              id={`${baseId}-sla`}
              type="range"
              min={5}
              max={20}
              step={1}
              value={slaMin}
              className="accent-[var(--lime)]"
              onChange={(e) => setSlaMin(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${baseId}-font`} className="text-[var(--ink)]">
              Cỡ chữ UI: {fontPx}px
            </Label>
            <input
              id={`${baseId}-font`}
              type="range"
              min={14}
              max={22}
              step={1}
              value={fontPx}
              className="accent-[var(--lime)]"
              onChange={(e) => setFontPx(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2">
            <Checkbox id={`${baseId}-sound`} checked={sound} onCheckedChange={(v) => setSound(v === true)} />
            <Label htmlFor={`${baseId}-sound`} className="cursor-pointer text-[var(--ink)]">
              Âm thanh cảnh báo
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border-white/20" onClick={() => handleDialogOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" className="bg-[var(--lime)] text-black active:bg-[var(--lime)]/90" onClick={persist}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
