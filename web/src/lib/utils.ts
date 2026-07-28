import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getLocalMonth(date = new Date()) {
  return formatLocalDate(date).slice(0, 7)
}

export function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-01T00:00:00`),
  )
}

export function moveMonth(month: string, direction: -1 | 1) {
  const date = new Date(`${month}-01T00:00:00`)
  date.setMonth(date.getMonth() + direction)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function defaultDateForMonth(month: string) {
  const today = formatLocalDate()
  return today.startsWith(month) ? today : `${month}-01`
}
