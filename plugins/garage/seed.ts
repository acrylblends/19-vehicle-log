/** The garage a new install starts with: one Volvo, six cost records, four fuel entries and three reminders. */
import type { FuelEntry, GarageState, Reminder, ServiceRecord, Vehicle } from './domain.ts'
import { stampOf } from './domain.ts'
export function seed(now: Date, newId: (kind: string) => string): GarageState {
  const at = (monthsAgo: number, day: number): string => stampOf(new Date(now.getFullYear(), now.getMonth() - monthsAgo, day))
  const vehicle: Vehicle = { id: newId('vehicle'), make: 'Volvo', model: 'XC60 T5', year: 2019, registration: 'W-482LX', vinMasked: 'YV1UZK…7281', fuelType: 'Petrol', transmission: 'Automatic', odometerKm: 86420, lifetimeCost: 26790, inspectionDue: '2027-05' }
  const services: ServiceRecord[] = [
    { id: newId('service'), date: at(1, 18), odometerKm: 86420, type: 'service', provider: 'Autohaus West', description: 'Annual service · oil, filters, brake inspection', cost: 486 },
    { id: newId('service'), date: at(5, 4), odometerKm: 81210, type: 'repair', provider: 'Autohaus West', description: 'Front brake pads replaced', cost: 318 },
    { id: newId('service'), date: at(7, 11), odometerKm: 77440, type: 'tyres', provider: 'Reifen Fritz', description: 'Tyre change · summer set, balancing', cost: 142 },
    { id: newId('service'), date: at(11, 22), odometerKm: 72810, type: 'battery', provider: 'Autohaus West', description: '12V AGM battery replaced', cost: 229 },
    { id: newId('service'), date: at(3, 15), odometerKm: 84000, type: 'insurance', provider: 'Nordic Insure', description: 'Annual insurance premium', cost: 898.8 },
  ]
  const fuel: FuelEntry[] = [
    { id: newId('fuel'), date: at(0, 28), odometerKm: 83932, litres: 52.4, totalCost: 91.7 },
    { id: newId('fuel'), date: at(0, 12), odometerKm: 84780, litres: 48.1, totalCost: 78.2 },
    { id: newId('fuel'), date: at(1, 22), odometerKm: 85650, litres: 49.8, totalCost: 82.4 },
    { id: newId('fuel'), date: at(0, 2), odometerKm: 86420, litres: 51.2, totalCost: 86.9 },
  ]
  const reminders: Reminder[] = [
    { id: newId('reminder'), title: 'Oil & filter service', dueOdometerKm: 88000, status: 'open' },
    { id: newId('reminder'), title: 'Inspection §57a', dueDate: '2027-05-01', status: 'open' },
    { id: newId('reminder'), title: 'Insurance renewal', dueDate: '2027-01-15', status: 'open' },
  ]
  return { version: 1, vehicle, services, fuel, reminders }
}
