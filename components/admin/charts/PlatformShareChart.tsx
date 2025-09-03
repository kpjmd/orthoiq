'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PlatformData {
  platform: string;
  total_shares: number;
  total_clicks: number;
  avg_clicks_per_share: number;
  unique_sharers: number;
}

interface PlatformShareChartProps {
  data: PlatformData[];
  height?: number;
}

export default function PlatformShareChart({ data, height = 300 }: PlatformShareChartProps) {
  const chartData = data.map(item => ({
    platform: item.platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    shares: item.total_shares,
    clicks: item.total_clicks,
    ctr: item.total_shares > 0 ? Math.round((item.total_clicks / item.total_shares) * 100) / 100 : 0,
    sharers: item.unique_sharers
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-blue-600">Total Shares: {data?.shares?.toLocaleString()}</p>
          <p className="text-sm text-green-600">Total Clicks: {data?.clicks?.toLocaleString()}</p>
          <p className="text-sm text-purple-600">Click Rate: {data?.ctr}</p>
          <p className="text-sm text-gray-600">Unique Sharers: {data?.sharers}</p>
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
            dataKey="platform" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="shares" 
            fill="#3b82f6" 
            name="Total Shares"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}