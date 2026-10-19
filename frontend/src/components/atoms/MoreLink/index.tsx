import { ChevronRight } from 'lucide-react';

export default function MoreLink({ label = '자세히' }: { label?: string }) {
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-primary flex-shrink-0">
      {label}
      <ChevronRight size={13} />
    </span>
  );
}
