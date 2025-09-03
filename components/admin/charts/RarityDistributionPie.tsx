'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RarityData {
  rarity_type: string;
  count: string;
}

interface RarityDistributionPieProps {
  data: RarityData[];
  height?: number;
}

const RARITY_COLORS = {
  'common': '#6b7280',
  'uncommon': '#10b981', 
  'rare': '#3b82f6',
  'ultra-rare': '#8b5cf6'
};

const RARITY_LABELS = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'ultra-rare': 'Ultra Rare'
};

export default function RarityDistributionPie({ data, height = 300 }: RarityDistributionPieProps) {
  const chartData = data.map(item => ({
    name: RARITY_LABELS[item.rarity_type as keyof typeof RARITY_LABELS] || item.rarity_type,
    value: parseInt(item.count),
    rarity: item.rarity_type
  }));

  const totalCount = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalCount > 0 ? (data.value / totalCount * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.payload.name}</p>
          <p className="text-sm text-gray-600">Count: {data.value.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Percentage: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={RARITY_COLORS[entry.rarity as keyof typeof RARITY_COLORS] || '#6b7280'} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}