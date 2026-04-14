import { useState, useRef } from 'react';
import { LogOut, Camera, Pencil, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Mode } from '@/components/ModeToggle';

type DefaultTab = 'home' | 'tbr' | 'discover';
type ListDensity = 'comfortable' | 'compact';

interface AppMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  defaultTab: DefaultTab;
  onDefaultTabChange: (tab: DefaultTab) => void;
  listDensity: ListDensity;
  onListDensityChange: (density: ListDensity) => void;
}

const TAB_OPTIONS: { value: DefaultTab; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'tbr', label: 'My TBR' },
  { value: 'discover', label: 'Discover' },
];

const DENSITY_OPTIONS: { value: ListDensity; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

export function AppMenu({
  open, onOpenChange, onSignOut,
  defaultTab, onDefaultTabChange,
  listDensity, onListDensityChange,
}: AppMenuProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userMeta = user?.user_metadata;
  const currentName = userMeta?.display_name || userMeta?.full_name || '';
  const email = user?.email || '';
  const avatarUrl = userMeta?.avatar_url || '';

  const initials = (currentName || email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('');

  const startEditing = () => {
    setDisplayName(currentName);
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      // Also update profiles table
      if (user) {
        await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
      }
      toast({ title: 'Profile updated' });
    }
    setSaving(false);
    setEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    toast({ title: 'Avatar updated' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col bg-background">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        {/* Profile Section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group flex-shrink-0"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-border">
                  <span className="font-display text-lg font-bold text-primary">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </button>

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-8 text-sm font-body"
                    autoFocus
                  />
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-base font-semibold text-foreground truncate">
                    {currentName || 'Set your name'}
                  </h3>
                  <button
                    onClick={startEditing}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <p className="font-body text-xs text-muted-foreground truncate mt-0.5">{email}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Preferences */}
        <div className="p-6 space-y-5 flex-1">
          <h4 className="font-body text-xs text-muted-foreground uppercase tracking-wider">Preferences</h4>

          {/* Default tab */}
          <div className="space-y-2">
            <p className="font-body text-sm text-foreground">Default tab on open</p>
            <div className="flex gap-1.5">
              {TAB_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onDefaultTabChange(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-colors",
                    defaultTab === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* List density */}
          <div className="space-y-2">
            <p className="font-body text-sm text-foreground">List view density</p>
            <div className="flex gap-1.5">
              {DENSITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onListDensityChange(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-colors",
                    listDensity === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* About */}
        <div className="p-6 space-y-1">
          <h4 className="font-body text-xs text-muted-foreground uppercase tracking-wider">About</h4>
          <p className="font-display text-sm font-semibold text-foreground">Overdue <span className="font-body text-xs text-muted-foreground font-normal">v1.0.0</span></p>
          <p className="font-body text-xs text-muted-foreground">Your books have been waiting long enough.</p>
        </div>

        <Separator />

        {/* Sign out */}
        <div className="p-6">
          <button
            onClick={() => { onSignOut(); onOpenChange(false); }}
            className="flex items-center gap-2 font-body text-sm text-destructive/80 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
