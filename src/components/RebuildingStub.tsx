import { Construction } from 'lucide-react';

interface RebuildingStubProps {
  title?: string;
  message?: string;
}

export default function RebuildingStub({
  title = 'Section being rebuilt',
  message = 'This area is being upgraded to the new client data model and will be back online shortly.',
}: RebuildingStubProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
