'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Selector de fecha propio (día/mes/año siempre, sin depender del locale del
// navegador como pasa con <input type="date">).
export function DatePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn('w-full justify-start font-normal', className)} />}
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        {selected ? format(selected, 'dd/MM/yyyy', { locale: es }) : <span className="text-muted-foreground">Elegir fecha</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          locale={es}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
