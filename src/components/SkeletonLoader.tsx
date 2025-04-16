import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table' | 'list';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'card':
        return 'rounded-lg h-32';
      case 'table':
        return 'rounded h-8';
      case 'list':
        return 'rounded h-6';
      default:
        return 'h-4 rounded';
    }
  };
  
  const style: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };
  
  const items = [];
  
  for (let i = 0; i < count; i++) {
    items.push(
      <div
        key={i}
        className={`${baseClasses} ${getVariantClasses()} ${className}`}
        style={style}
        aria-hidden="true"
      />
    );
  }
  
  return <>{items}</>;
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index} 
          variant="text" 
          width={index === lines - 1 && lines > 1 ? '80%' : '100%'} 
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <Skeleton variant="rectangular" height={200} />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="60%" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4,
  className = '' 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="table" />
        ))}
      </div>
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="table" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
            <Skeleton variant="text" width="50%" />
            <div className="mt-2">
              <Skeleton variant="text" height={30} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Skeleton variant="text" width="30%" />
        <div className="mt-4 h-[300px]">
          <Skeleton variant="rectangular" height="100%" />
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Skeleton variant="text" width="30%" className="mb-4" />
        <SkeletonTable />
      </div>
    </div>
  );
};

export default Skeleton;