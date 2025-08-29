'use client';

interface OrthoIQLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  variant?: 'blue' | 'teal' | 'monochrome' | 'gold';
  circular?: boolean;
  className?: string;
}

export default function OrthoIQLogo({ 
  size = 'medium', 
  variant = 'blue', 
  circular = false,
  className = "" 
}: OrthoIQLogoProps) {
  
  const getSizeValues = () => {
    if (typeof size === 'number') {
      return { width: size / 2, height: size };
    }
    
    switch (size) {
      case 'small':
        return { width: 12, height: 24 };
      case 'medium':
        return { width: 30, height: 60 };
      case 'large':
        return { width: 60, height: 120 };
      default:
        return { width: 30, height: 60 };
    }
  };

  const getGradient = () => {
    switch (variant) {
      case 'blue':
        return 'url(#ortho-blue-gradient)';
      case 'teal':
        return 'url(#ortho-teal-gradient)';
      case 'monochrome':
        return 'url(#ortho-mono-gradient)';
      case 'gold':
        return 'url(#ortho-gold-gradient)';
      default:
        return 'url(#ortho-blue-gradient)';
    }
  };

  const { width, height } = getSizeValues();
  const holeSize = width * 0.75;
  const borderRadius = width * 0.5;

  return (
    <div className={className}>
      <svg 
        width={circular ? height : width} 
        height={circular ? height : height} 
        viewBox={`0 0 ${circular ? height : width} ${height}`}
        className={circular ? "rounded-full" : ""}
      >
        <defs>
          <linearGradient id="ortho-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          
          <linearGradient id="ortho-teal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#0e7490" />
            <stop offset="100%" stopColor="#164e63" />
          </linearGradient>
          
          <linearGradient id="ortho-mono-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          
          <linearGradient id="ortho-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          
          <linearGradient id="diagonal-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="42%" stopColor="transparent" />
            <stop offset="50%" stopColor="white" />
            <stop offset="58%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {circular && (
          <circle 
            cx={height / 2} 
            cy={height / 2} 
            r={height / 2 - 2} 
            fill={getGradient()} 
          />
        )}
        
        {!circular && (
          <rect 
            x="0" 
            y="0" 
            width={width} 
            height={height} 
            rx={borderRadius} 
            ry={borderRadius} 
            fill={getGradient()} 
          />
        )}
        
        {/* Center hole */}
        <circle 
          cx={circular ? height / 2 : width / 2} 
          cy={height / 2} 
          r={holeSize / 2} 
          fill="white" 
        />
        
        {/* 45-degree diagonal line */}
        <rect 
          x={circular ? (height - width) / 2 : 0} 
          y="0" 
          width={width} 
          height={height} 
          rx={borderRadius} 
          ry={borderRadius} 
          fill="url(#diagonal-line)" 
        />
      </svg>
    </div>
  );
}