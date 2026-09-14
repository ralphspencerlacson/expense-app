import { formatCurrency } from '../../lib/utils'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type CashflowBarChartProps = {
  items: Array<{
    label: string
    income: number
    expenses: number
  }>
}

export function CashflowBarChart({ items }: CashflowBarChartProps) {
  return (
    <div className="overflow-x-auto">
    <div className="h-72 min-w-[560px] sm:h-80" role="img" aria-label="Income received and expenses paid by month, January to December">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={items} margin={{ left: -14, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval={0} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
          <YAxis axisLine={false} tickFormatter={(value: number) => `${value / 1000}k`} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ border: '1px solid #e4e4e7', borderRadius: 16, boxShadow: '0 18px 50px -28px rgba(15,23,42,.45)' }}
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" radius={[12, 12, 0, 0]} />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[12, 12, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
  )
}
