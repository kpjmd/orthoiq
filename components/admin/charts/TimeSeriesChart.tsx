'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TimeSeriesData {
  date: string;
  prescriptions: number;
  ultra_rare_count: number;
  avg_confidence: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  height?: number;
}

export default function TimeSeriesChart({ data, height = 300 }: TimeSeriesChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
    avg_confidence: Math.round(parseFloat(item.avg_confidence.toString()) * 100)
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="prescriptions" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Total Prescriptions"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="ultra_rare_count" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            name="Ultra Rare"
            dot={{ fill: '#8b5cf6', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="avg_confidence" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Avg Confidence %"
            dot={{ fill: '#10b981', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}