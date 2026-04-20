import { useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listSavedViews,
  createSavedView,
  deleteSavedView,
  SavedView,
  SavedViewEntity,
} from '@/lib/savedViews';
import { toast } from 'sonner';

interface Props {
  entityType: SavedViewEntity;
  currentFilters: Record<string, unknown>;
  currentSort?: Record<string, unknown>;
  currentColumns?: string[];
  onApply: (view: SavedView) => void;
}

export default function SavedViewsMenu({
  entityType,
  currentFilters,
  currentSort,
  currentColumns,
  onApply,
}: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [views, setViews] = useState<SavedView[]>([]);
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');

  async function refresh() {
    if (!profile) return;
    try {
      setViews(await listSavedViews(entityType));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    refresh();
  }, [profile?.id, entityType]);

  async function handleSave() {
    if (!profile || !name.trim()) return;
    try {
      await createSavedView({
        organization_id: profile.organization_id!,
        user_id: profile.id,
        entity_type: entityType,
        name: name.trim(),
        filters: currentFilters,
        sort: currentSort,
        columns: currentColumns,
      });
      toast.success(isEN ? 'View saved' : 'تم حفظ العرض');
      setName('');
      setSaveOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSavedView(id);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            {isEN ? 'Views' : 'العروض'}
            {views.length > 0 && (
              <span className="ms-1 text-xs text-muted-foreground">({views.length})</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          <DropdownMenuLabel>{isEN ? 'Saved Views' : 'العروض المحفوظة'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              {isEN ? 'No saved views yet' : 'لا توجد عروض محفوظة'}
            </div>
          ) : (
            views.map((v) => (
              <DropdownMenuItem
                key={v.id}
                className="flex items-center justify-between gap-2 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  onApply(v);
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Check className="h-3.5 w-3.5 opacity-0" />
                  <span className="truncate">{v.name}</span>
                  {v.is_shared && (
                    <span className="text-[10px] text-accent">{isEN ? 'shared' : 'مشترك'}</span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={isEN ? 'Delete view' : 'حذف العرض'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSaveOpen(true);
              setOpen(false);
            }}
            className="gap-2 cursor-pointer"
          >
            <BookmarkPlus className="h-4 w-4" />
            {isEN ? 'Save current view…' : 'حفظ العرض الحالي…'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{isEN ? 'Save view' : 'حفظ العرض'}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={isEN ? 'View name' : 'اسم العرض'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {isEN ? 'Cancel' : 'إلغاء'}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isEN ? 'Save' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
