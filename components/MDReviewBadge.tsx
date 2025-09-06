'use client';

interface MDReviewBadgeProps {
  reviewerName?: string;
  reviewedAt?: Date;
  size?: 'small' | 'medium' | 'large';
}

export default function MDReviewBadge({ 
  reviewerName = 'Dr. KPJMD', 
  reviewedAt,
  size = 'medium' 
}: MDReviewBadgeProps) {
  const sizeClasses = {
    small: 'w-12 h-12 text-xs',
    medium: 'w-16 h-16 text-sm',
    large: 'w-20 h-20 text-base'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="flex flex-col items-center">
      {/* Circular Badge */}
      <div className={`
        ${sizeClasses[size]} 
        bg-gradient-to-br from-green-400 to-emerald-600 
        rounded-full 
        flex flex-col items-center justify-center 
        text-white font-bold
        shadow-lg
        border-4 border-white
        relative
        transform hover:scale-110 transition-transform duration-200
      `}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-300 to-emerald-500 opacity-20"></div>
        <span className={`${textSizeClasses[size]} font-bold relative z-10`}>MD</span>
        <span className={`text-xs font-semibold relative z-10 ${size === 'small' ? 'text-[8px]' : ''}`}>
          REVIEWED
        </span>
      </div>
      
      {/* Badge Details */}
      {size !== 'small' && (
        <div className="mt-2 text-center">
          <p className="text-sm font-semibold text-green-800">{reviewerName}</p>
          {reviewedAt && (
            <p className="text-xs text-green-600">
              {reviewedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}