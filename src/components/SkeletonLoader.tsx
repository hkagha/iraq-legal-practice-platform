import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant?: 'text' | 'heading' | 'card' | 'circle' | 'rect';
  width?: string;
  height?: string;
  className?: string;
}

export default function SkeletonLoader({ variant = 'text', width, height, className }: SkeletonLoaderProps) {
  const base = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

  const variants: Record<string, string> = {
    text: 'h-4 rounded',
    heading: 'h-6 rounded',
    card: 'rounded-card',
    circle: 'rounded-avatar',
    rect: 'rounded',
  };

  return (
    <div
      className={cn(base, variants[variant], className)}
      style={{ width: width || '100%', height: height || undefined }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <SkeletonLoader variant="heading" width="280px" height="36px" />
          <SkeletonLoader variant="text" width="200px" />
        </div>
        <SkeletonLoader variant="rect" width="140px" height="40px" className="rounded-button" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonLoader key={i} variant="card" height="120px" />
        ))}
      </div>

      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SkeletonLoader variant="card" height="320px" className="lg:col-span-3" />
        <SkeletonLoader variant="card" height="320px" className="lg:col-span-2" />
      </div>

      {/* Activity skeleton */}
      <SkeletonLoader variant="card" height="240px" />

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonLoader variant="card" height="300px" />
        <SkeletonLoader variant="card" height="300px" />
      </div>
    </div>
  );
}
