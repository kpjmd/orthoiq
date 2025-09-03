'use client';

interface ViralCoefficientGaugeProps {
  coefficient: number;
  height?: number;
}

export default function ViralCoefficientGauge({ coefficient, height = 200 }: ViralCoefficientGaugeProps) {
  const percentage = Math.min(coefficient * 100, 100);
  const rotation = (percentage / 100) * 180 - 90;

  const getStatusColor = (coeff: number) => {
    if (coeff >= 1.0) return { color: '#10b981', status: 'Viral Growth' };
    if (coeff >= 0.5) return { color: '#f59e0b', status: 'Growing' };
    if (coeff >= 0.2) return { color: '#3b82f6', status: 'Steady' };
    return { color: '#ef4444', status: 'Needs Improvement' };
  };

  const { color, status } = getStatusColor(coefficient);

  return (
    <div className="flex flex-col items-center justify-center" style={{ height }}>
      <div className="relative">
        <svg width="150" height="100" viewBox="0 0 150 100">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#f59e0b" />
              <stop offset="66%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          
          <path
            d="M 20 80 A 55 55 0 0 1 130 80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          <path
            d="M 20 80 A 55 55 0 0 1 130 80"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 173} 173`}
          />
          
          <g transform={`translate(75, 80)`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-45"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${rotation})`}
            />
            <circle cx="0" cy="0" r="4" fill={color} />
          </g>
          
          <text x="75" y="95" textAnchor="middle" className="text-xs fill-gray-600">
            {coefficient.toFixed(2)}
          </text>
        </svg>
      </div>
      
      <div className="text-center mt-2">
        <p className="text-sm font-medium" style={{ color }}>
          {status}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Viral Coefficient: {coefficient >= 1 ? 'Exponential' : coefficient >= 0.5 ? 'Linear' : 'Declining'}
        </p>
      </div>
    </div>
  );
}