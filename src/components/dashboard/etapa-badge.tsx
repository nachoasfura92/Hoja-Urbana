import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Etapa } from '@/lib/greenhouse/types';

const STYLES: Record<Etapa, string> = {
  plantines: 'bg-[#E6F1FB] text-[#0C447C] dark:bg-blue-500/15 dark:text-blue-300',
  engorda: 'bg-[#FAEEDA] text-[#633806] dark:bg-amber-500/15 dark:text-amber-300',
  adulto: 'bg-[#E1F5EE] text-[#085041] dark:bg-teal-500/15 dark:text-teal-300',
  cosechado: 'bg-muted text-muted-foreground',
};

export function EtapaBadge({ etapa, className }: { etapa: Etapa; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium capitalize', STYLES[etapa], className)}>
      {etapa}
    </Badge>
  );
}
