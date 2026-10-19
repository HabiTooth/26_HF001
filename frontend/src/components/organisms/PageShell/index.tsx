import type { ReactNode } from 'react';

export default function PageShell({
  children,
  className = '',
  withNav = false,
  fill = false,
  decorative = true,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
  fill?: boolean;
  decorative?: boolean;
}) {
  const inner = fill ? 'h-[calc(100svh/var(--app-zoom))] flex flex-col pb-14' : withNav ? 'pb-[104px]' : 'pb-10';

  return (
    <div
      className={`app-frame max-w-app mx-auto bg-background relative ${fill ? 'h-[calc(100svh/var(--app-zoom))] overflow-hidden' : 'min-h-[calc(100svh/var(--app-zoom))]'} ${className}`}
    >
      {decorative && <>
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
        <div className="aurora-blob-3" />
      </>}
      <div className={`relative z-10 ${inner}`}>{children}</div>
    </div>
  );
}
