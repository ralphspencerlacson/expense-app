import { formatCurrency } from '../../lib/utils'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type ExpenseDonutChartProps = {
  items: Array<{
    label: string
    value: number
    color: string
  }>
}

export function ExpenseDonutChart({ items }: ExpenseDonutChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="grid gap-5 sm:grid-cols-[11rem_1fr] sm:items-center md:grid-cols-[12rem_1fr]">
      <div className="relative mx-auto h-48 w-48 sm:h-44 sm:w-44 md:h-52 md:w-52" role="img" aria-label={`Expense categories totaling ${formatCurrency(total)}`}>
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie data={items} dataKey="value" innerRadius={64} outerRadius={92} paddingAngle={3} stroke="none">
              {items.map((item) => <Cell fill={item.color} key={item.label} />)}
            </Pie>
            <Tooltip
              contentStyle={{ border: '1px solid #e4e4e7', borderRadius: 16, boxShadow: '0 18px 50px -28px rgba(15,23,42,.45)' }}
              formatter={(value) => formatCurrency(Number(value ?? 0))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-zinc-500">Expenses</p>
          <p className="text-xl font-semibold tracking-tight">{formatCurrency(total)}</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-zinc-100">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-zinc-700">{item.label}</span>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
