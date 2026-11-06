/** Vehicle Log's types and pure rules: the vehicle, service records, fuel entries and reminders. */
export interface Vehicle { readonly id: string; readonly make: string; readonly model: string; readonly year: number; readonly registration: string; readonly vinMasked: string; readonly fuelType: string; readonly transmission: string; readonly odometerKm: number; readonly lifetimeCost: number; readonly inspectionDue: string }
export interface ServiceRecord { readonly id: string; readonly date: string; readonly odometerKm: number; readonly type: 'service' | 'repair' | 'tyres' | 'battery' | 'insurance' | 'inspection'; readonly provider: string; readonly description: string; readonly cost: number }
export interface FuelEntry { readonly id: string; readonly date: string; readonly odometerKm: number; readonly litres: number; readonly totalCost: number }
export interface Reminder { readonly id: string; readonly title: string; readonly dueDate?: string; readonly dueOdometerKm?: number; readonly status: 'open' | 'done' }
export interface GarageState { readonly version: 1; vehicle: Vehicle; services: ServiceRecord[]; fuel: FuelEntry[]; reminders: Reminder[] }
export type GarageErrorCode = 'invalid' | 'not-found'
export class GarageError extends Error { readonly code: GarageErrorCode; constructor(code: GarageErrorCode, message: string) { super(message); this.code = code; this.name = 'GarageError' } }
const pad = (n: number): string => String(n).padStart(2, '0')
export const dayOf = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const stampOf = (date: Date): string => `${dayOf(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
export function shortDate(day: string): string { return new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() }
export function euro(value: number): string { return `€${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100)}` }
export function number(value: number, digits = 0): string { return new Intl.NumberFormat('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) }
export function cleanPositive(value: unknown, field: string): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) throw new GarageError('invalid', `${field} must be a positive number.`)
  return numberValue
}
export function cleanDay(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new GarageError('invalid', `${field} is a date like 2026-11-06.`)
  return value
}
/** The average consumption from the fuel entries: litres per 100 km over the odometer span. */
export function consumptionOf(fuel: readonly FuelEntry[]): number {
  if (fuel.length < 2) return 0
  const sorted = [...fuel].sort((a, b) => a.odometerKm - b.odometerKm)
  const first = sorted[0] as FuelEntry
  const last = sorted[sorted.length - 1] as FuelEntry
  const litres = sorted.reduce((sum, entry) => sum + entry.litres, 0)
  const km = last.odometerKm - first.odometerKm
  return km === 0 ? 0 : (litres / km) * 100
}
export function yearCost(services: readonly ServiceRecord[], fuel: readonly FuelEntry[], year: number): number {
  const prefix = String(year)
  return services.filter((record) => record.date.startsWith(prefix)).reduce((sum, record) => sum + record.cost, 0) + fuel.filter((entry) => entry.date.startsWith(prefix)).reduce((sum, entry) => sum + entry.totalCost, 0)
}
export function monthlyCosts(services: readonly ServiceRecord[], fuel: readonly FuelEntry[], year: number): number[] {
  const totals = Array.from({ length: 12 }, () => 0)
  for (const record of services) if (record.date.startsWith(String(year))) totals[Number(record.date.slice(5, 7)) - 1] = (totals[Number(record.date.slice(5, 7)) - 1] ?? 0) + record.cost
  for (const entry of fuel) if (entry.date.startsWith(String(year))) totals[Number(entry.date.slice(5, 7)) - 1] = (totals[Number(entry.date.slice(5, 7)) - 1] ?? 0) + entry.totalCost
  return totals
}
export function sparkPath(values: readonly number[], width = 650, height = 130): string {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${((index / Math.max(1, values.length - 1)) * width).toFixed(0)} ${(height - (value / max) * height).toFixed(0)}`).join(' ')
}
