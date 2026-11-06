/** The garage: the vehicle, its service history, fuel entries and reminders. */
import { cleanDay, cleanPositive, consumptionOf, dayOf, type FuelEntry, type GarageState, GarageError, monthlyCosts, type Reminder, type ServiceRecord, stampOf, type Vehicle, yearCost } from './domain.ts'
import { seed } from './seed.ts'
import type { Store } from './store.ts'
export interface GarageAdapters { readonly store: Store<GarageState>; readonly clock: () => Date; readonly newId: (kind: string) => string }
export class Garage {
  private state: GarageState
  private readonly adapters: GarageAdapters
  private constructor(state: GarageState, adapters: GarageAdapters) { this.state = state; this.adapters = adapters }
  static async open(adapters: GarageAdapters): Promise<Garage> { const saved = await adapters.store.load(); return new Garage(saved ?? seed(adapters.clock(), adapters.newId), adapters) }
  get now(): Date { return this.adapters.clock() }
  vehicle(): Vehicle { return this.state.vehicle }
  services(): readonly ServiceRecord[] { return [...this.state.services].sort((a, b) => b.date.localeCompare(a.date)) }
  fuel(): readonly FuelEntry[] { return [...this.state.fuel].sort((a, b) => b.odometerKm - a.odometerKm) }
  reminders(): readonly Reminder[] { return this.state.reminders }
  consumption(): number { return consumptionOf(this.state.fuel) }
  costThisYear(): number { return yearCost(this.state.services, this.state.fuel, this.adapters.clock().getFullYear()) }
  monthly(): number[] { return monthlyCosts(this.state.services, this.state.fuel, this.adapters.clock().getFullYear()) }
  nextServiceKm(): number | undefined { const reminder = this.state.reminders.find((item) => item.dueOdometerKm !== undefined && item.status === 'open'); return reminder?.dueOdometerKm === undefined ? undefined : Math.max(0, reminder.dueOdometerKm - this.state.vehicle.odometerKm) }
  async addService(input: { date: unknown; odometerKm: unknown; type: string; provider: string; description: string; cost: unknown }): Promise<ServiceRecord> {
    const record: ServiceRecord = { id: this.adapters.newId('service'), date: cleanDay(input.date, 'Date'), odometerKm: cleanPositive(input.odometerKm, 'Odometer'), type: (['service', 'repair', 'tyres', 'battery', 'insurance', 'inspection'].includes(input.type) ? input.type : 'service') as ServiceRecord['type'], provider: input.provider.trim().slice(0, 80) || 'Not recorded', description: input.description.trim().slice(0, 200) || 'Service', cost: cleanPositive(input.cost, 'Cost') }
    this.state.services.push(record)
    await this.save()
    return record
  }
  async addFuel(input: { date: unknown; odometerKm: unknown; litres: unknown; totalCost: unknown }): Promise<FuelEntry> {
    const entry: FuelEntry = { id: this.adapters.newId('fuel'), date: cleanDay(input.date, 'Date'), odometerKm: cleanPositive(input.odometerKm, 'Odometer'), litres: cleanPositive(input.litres, 'Litres'), totalCost: cleanPositive(input.totalCost, 'Total cost') }
    this.state.fuel.push(entry)
    if (entry.odometerKm > this.state.vehicle.odometerKm) this.state.vehicle = { ...this.state.vehicle, odometerKm: entry.odometerKm }
    await this.save()
    return entry
  }
  async completeReminder(id: string): Promise<Reminder> {
    const reminder = this.state.reminders.find((item) => item.id === id)
    if (reminder === undefined) throw new GarageError('not-found', 'That reminder no longer exists.')
    const next = { ...reminder, status: 'done' as const }
    this.state.reminders = this.state.reminders.map((item) => (item.id === id ? next : item))
    await this.save()
    return next
  }
  today(): string { return dayOf(this.now) }
  private async save(): Promise<void> { this.state = { ...this.state, vehicle: { ...this.state.vehicle }, services: [...this.state.services], fuel: [...this.state.fuel], reminders: [...this.state.reminders] }; await this.adapters.store.save(this.state) }
}
