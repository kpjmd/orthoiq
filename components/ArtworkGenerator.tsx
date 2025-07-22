import { ArtworkConfig } from '@/lib/types';

interface ArtworkGeneratorProps {
  theme: ArtworkConfig['theme'];
  size?: number;
  className?: string;
}

export default function ArtworkGenerator({ 
  theme = 'general', 
  size = 200, 
  className = "" 
}: ArtworkGeneratorProps) {
  
  const getThemeConfig = (theme: ArtworkConfig['theme']): ArtworkConfig => {
    switch (theme) {
      case 'bone':
        return {
          theme: 'bone',
          colors: ['#f4f4f4', '#e8e8e8', '#d4d4d4'],
          elements: ['bone', 'joint', 'marrow']
        };
      case 'muscle':
        return {
          theme: 'muscle',
          colors: ['#d32f2f', '#f44336', '#ffcdd2'],
          elements: ['fiber', 'tendon', 'tissue']
        };
      case 'joint':
        return {
          theme: 'joint',
          colors: ['#1976d2', '#2196f3', '#bbdefb'],
          elements: ['cartilage', 'synovial', 'ligament']
        };
      default:
        return {
          theme: 'general',
          colors: ['#2c3e50', '#3498db', '#ecf0f1'],
          elements: ['medical', 'health', 'care']
        };
    }
  };

  const config = getThemeConfig(theme);

  return (
    <div className={`inline-block ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200"
        className="drop-shadow-md"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id={`gradient-${theme}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.colors[0]} />
            <stop offset="50%" stopColor={config.colors[1]} />
            <stop offset="100%" stopColor={config.colors[2]} />
          </radialGradient>
        </defs>
        
        <rect width="200" height="200" fill={`url(#gradient-${theme})`} rx="20" />
        
        {/* Theme-specific artwork */}
        {theme === 'bone' && (
          <g>
            {/* Bone shape */}
            <ellipse cx="100" cy="50" rx="15" ry="25" fill="#f8f8f8" />
            <rect x="85" y="50" width="30" height="100" fill="#f0f0f0" />
            <ellipse cx="100" cy="150" rx="15" ry="25" fill="#f8f8f8" />
            <circle cx="100" cy="100" r="8" fill="#e0e0e0" />
          </g>
        )}
        
        {theme === 'muscle' && (
          <g>
            {/* Muscle fibers */}
            <path d="M50 50 Q100 80 150 50 Q100 120 50 150 Q100 120 150 150" 
                  fill="none" stroke="#d32f2f" strokeWidth="6" />
            <path d="M60 60 Q100 90 140 60 Q100 130 60 160" 
                  fill="none" stroke="#f44336" strokeWidth="4" />
            <path d="M70 70 Q100 100 130 70 Q100 140 70 170" 
                  fill="none" stroke="#ff6b6b" strokeWidth="3" />
          </g>
        )}
        
        {theme === 'joint' && (
          <g>
            {/* Joint structure */}
            <circle cx="100" cy="100" r="40" fill="none" stroke="#1976d2" strokeWidth="4" />
            <circle cx="100" cy="100" r="25" fill="#bbdefb" opacity="0.7" />
            <path d="M70 100 Q100 70 130 100 Q100 130 70 100" fill="#2196f3" opacity="0.8" />
            <circle cx="100" cy="100" r="8" fill="#0d47a1" />
          </g>
        )}
        
        {theme === 'general' && (
          <g>
            {/* Medical cross */}
            <rect x="85" y="60" width="30" height="80" fill="#2c3e50" rx="5" />
            <rect x="60" y="85" width="80" height="30" fill="#2c3e50" rx="5" />
            <circle cx="100" cy="100" r="35" fill="none" stroke="#3498db" strokeWidth="3" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="#3498db" strokeWidth="2" opacity="0.5" />
          </g>
        )}
        
        {/* Medical pulse line */}
        <path 
          d="M20 180 Q40 170 50 180 T80 180 Q90 160 100 180 T130 180 Q150 170 180 180" 
          fill="none" 
          stroke={config.colors[1]} 
          strokeWidth="2" 
          opacity="0.6"
        />
      </svg>
    </div>
  );
}