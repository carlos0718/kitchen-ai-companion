import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  value: string;           // "YYYY-MM-DD" string
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  warning?: boolean;       // red border when true
}

export function DatePicker({ value, onChange, placeholder = 'Selecciona una fecha', className, warning }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? parseISO(value) : undefined;
  const validDate = date && isValid(date) ? date : undefined;

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      onChange(format(selected, 'yyyy-MM-dd'));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !validDate && 'text-muted-foreground',
            warning && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {validDate
            ? format(validDate, "d 'de' MMMM 'de' yyyy", { locale: es })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validDate}
          onSelect={handleSelect}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
