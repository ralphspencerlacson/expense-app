import { formatCurrency } from '../../lib/utils'
import type { SavingsSnapshot } from '../../types/finance'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type SavingsLineChartProps = {
  snapshots: SavingsSnapshot[]
}

export function SavingsLineChart({ snapshots }: SavingsLineChartProps) {
  const data = snapshots.map((snapshot) => ({ ...snapshot, label: formatMonth(snapshot.month) }))

  return (
    <div className="h-64 sm:h-80" role="img" aria-label="Net cashflow by month">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: -14, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="savingsArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
          <YAxis axisLine={false} tickFormatter={(value: number) => `${value / 1000}k`} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ border: '1px solid #e4e4e7', borderRadius: 16, boxShadow: '0 18px 50px -28px rgba(15,23,42,.45)' }}
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
          <Area dataKey="savings" fill="url(#savingsArea)" name="Net cashflow" stroke="#10b981" strokeWidth={3} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(`${month}-01T00:00:00`))
}
