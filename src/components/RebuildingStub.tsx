import { Construction } from 'lucide-react';
import { HelpButton } from '@/components/ui/HelpButton';

interface RebuildingStubProps {
  title?: string;
  message?: string;
  helpKey?: string;
}

export default function RebuildingStub({
  title = 'Section being rebuilt',
  message = 'This area is being upgraded to the new client data model and will be back online shortly.',
  helpKey,
}: RebuildingStubProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {helpKey && <HelpButton helpKey={helpKey} size="sm" />}
      </div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
