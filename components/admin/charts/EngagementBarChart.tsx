'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EngagementData {
  rarity_type: string;
  avg_shares: string;
  avg_downloads: string;
  total_prescriptions: string;
}

interface EngagementBarChartProps {
  data: EngagementData[];
  height?: number;
}

export default function EngagementBarChart({ data, height = 300 }: EngagementBarChartProps) {
  const chartData = data.map(item => ({
    rarity: item.rarity_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    shares: Math.round(parseFloat(item.avg_shares)),
    downloads: Math.round(parseFloat(item.avg_downloads)),
    total: parseInt(item.total_prescriptions)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-blue-600">Avg Shares: {payload[0]?.value}</p>
          <p className="text-sm text-green-600">Avg Downloads: {payload[1]?.value}</p>
          <p className="text-sm text-gray-600">Total: {payload[0]?.payload?.total}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="rarity" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="shares" 
            fill="#3b82f6" 
            name="Avg Shares"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="downloads" 
            fill="#10b981" 
            name="Avg Downloads"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}