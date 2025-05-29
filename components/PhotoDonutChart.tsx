'use client'

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer
} from 'recharts'

type Props = {
  taken: number
  total: number
}

export default function PhotoDonutChart({ taken, total }: Props) {
  const percent = total > 0 ? Math.round((taken / total) * 100) : 0

  const data = [
    {
      name: 'progress',
      value: percent,
      fill: '#ec4899'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center h-full">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Progression globale</h3>
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="80%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={90 + (360 * percent) / 100} // Ajustement dynamique de l'angle
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-gray-800">{percent}%</span>
          <span className="text-xs text-gray-500">{taken} / {total}</span>
        </div>
      </div>
    </div>
  )
}