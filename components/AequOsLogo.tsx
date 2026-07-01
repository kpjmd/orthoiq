'use client';

interface AequOsLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  variant?: 'blue' | 'teal' | 'monochrome' | 'gold';
  circular?: boolean;
  className?: string;
}

export default function AequOsLogo({ 
  size = 'medium', 
  variant = 'blue', 
  circular = false,
  className = "" 
}: AequOsLogoProps) {
  
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
        return 'url(#aequos-blue-gradient)';
      case 'teal':
        return 'url(#aequos-teal-gradient)';
      case 'monochrome':
        return 'url(#aequos-mono-gradient)';
      case 'gold':
        return 'url(#aequos-gold-gradient)';
      default:
        return 'url(#aequos-blue-gradient)';
    }
  };

  const { width, height } = getSizeValues();
  const borderRadius = width * 0.5;
  // Level beam + pivot circle — "equipoise as balance achieved" (Concept C, locked brand refresh)
  const beamHeight = height * 0.075;
  const beamY = height * 0.4625;
  const circleR = height * 0.125;

  return (
    <div className={className}>
      <svg
        width={circular ? height : width}
        height={circular ? height : height}
        viewBox={`0 0 ${circular ? height : width} ${height}`}
        className={circular ? "rounded-full" : ""}
      >
        <defs>
          <linearGradient id="aequos-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="55%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="aequos-teal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#0e7490" />
            <stop offset="100%" stopColor="#164e63" />
          </linearGradient>

          <linearGradient id="aequos-mono-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          <linearGradient id="aequos-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="aequos-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
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

        {/* Level beam — the diagonal "shine" reinterpreted as a fulcrum beam achieving balance */}
        <rect
          x={circular ? (height - width) / 2 : 0}
          y={beamY}
          width={width}
          height={beamHeight}
          fill="url(#aequos-beam-gradient)"
        />

        {/* Pivot circle resting on the beam */}
        <circle
          cx={circular ? height / 2 : width / 2}
          cy={height / 2}
          r={circleR}
          fill="white"
        />
      </svg>
    </div>
  );
}