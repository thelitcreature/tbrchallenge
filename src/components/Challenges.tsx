import { Trophy } from 'lucide-react';

export function Challenges() {
  return (
    <div className="text-center py-16 space-y-3">
      <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto" />
      <h3 className="font-display text-lg font-semibold text-foreground">Reading Challenges</h3>
      <p className="font-body text-muted-foreground text-sm">
        Coming soon! Set reading goals and track your progress.
      </p>
    </div>
  );
}
