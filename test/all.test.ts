import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp, readManifest } from '../src/app.ts'
import { pinnedInstance } from '../plugins/instance/index.ts'
import { consumptionOf, Garage, GarageError, number, seed as garageSeed, yearCost } from '../plugins/garage/index.ts'
import type { GarageState } from '../plugins/garage/domain.ts'
import { memoryStore } from '../plugins/garage/store.ts'
import { NOW, noticeOf, projectRoot, withApp } from './support.ts'
const scratch = join(projectRoot, '.acrylblends', 'test')
mkdirSync(scratch, { recursive: true })
const newId = (kind: string): string => `${kind}-${Math.random().toString(36).slice(2, 8)}`

test('consumption and yearly cost are computed from the entries', () => {
  const state = garageSeed(NOW, newId)
  assert.ok(Math.abs(consumptionOf(state.fuel) - 8.1) < 0.1)
  assert.equal(yearCost(state.services, state.fuel, 2026), 2184)
  assert.equal(number(86420), '86,420')
})

async function open(): Promise<Garage> {
  let ids = 0
  return Garage.open({ store: memoryStore(), clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
}

test('a fuel entry updates the odometer and a service record is validated', async () => {
  const store = memoryStore<GarageState>()
  let ids = 0
  const garage = await Garage.open({ store, clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
  const before = garage.vehicle().odometerKm
  await garage.addFuel({ date: '2026-11-05', odometerKm: before + 500, litres: 50, totalCost: 85 })
  assert.equal(garage.vehicle().odometerKm, before + 500)
  await assert.rejects(garage.addFuel({ date: '2026-11-05', odometerKm: 1, litres: 0, totalCost: 10 }), (error: unknown) => error instanceof GarageError && /Litres/.test(error.message))
  const record = await garage.addService({ date: '2026-11-05', odometerKm: before + 500, type: 'repair', provider: 'Garage', description: 'Wiper blades', cost: 48 })
  assert.equal(record.cost, 48)
  assert.equal(store.saved, 2)
})

test('a reminder can be marked done', async () => {
  const garage = await open()
  const reminder = garage.reminders()[0]
  assert.ok(reminder !== undefined)
  const done = await garage.completeReminder(reminder.id)
  assert.equal(done.status, 'done')
  await assert.rejects(garage.completeReminder('missing'), /reminder/)
})

test('the profile, services and expenses pages render the vehicle', () =>
  withApp(async (app) => {
    const profile = await app.page('/')
    assert.equal(profile.status, 200)
    assert.match(profile.html, /Vehicle logbook/)
    assert.match(profile.html, /Volvo XC60 T5/)
    assert.match(profile.html, /W-482LX/)
    assert.match(profile.html, /COST THIS YEAR/)
    assert.match((await app.page('/services')).html, /Front brake pads/)
    assert.match((await app.page('/expenses')).html, /Running costs/)
  }))

test('the fuel and service forms save and the reminder action works', () =>
  withApp(async (app) => {
    const fuel = await app.post('/fuel', { date: '2026-11-05', odometerKm: '87000', litres: '50', totalCost: '86' })
    assert.equal(noticeOf(fuel).kind, 'ok')
    assert.equal(app.root.garage.vehicle().odometerKm, 87000)
    const service = await app.post('/services', { date: '2026-11-05', odometerKm: '87000', type: 'service', provider: 'Autohaus', description: 'Oil change', cost: '120' })
    assert.equal(noticeOf(service).kind, 'ok')
    const reminder = app.root.garage.reminders()[0]
    assert.ok(reminder !== undefined)
    const done = await app.post(`/reminders/${reminder.id}/done`, {})
    assert.equal(noticeOf(done).kind, 'ok')
  }))

test('health, 404, manifest, prefix and switch-off', async () => {
  await withApp(async (app) => {
    assert.equal((await app.page('/health')).status, 200)
    assert.equal((await app.page('/nope')).status, 404)
    assert.deepEqual(readManifest().plugins.map((row) => row.id), ['router', 'home', 'garage', 'garage-shell', 'vehicle', 'extensions', 'server', 'acryl-door'])
  })
  await withApp(async (app) => {
    const response = await app.root.router.request('/app', { headers: { accept: 'text/html' } })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /href="\/app\/services"/)
  }, { prefix: '/app' })
  const manifest = readManifest()
  const without = { ...manifest, plugins: manifest.plugins.map((row) => (row.id === 'vehicle' ? { ...row, disabled: true } : row)) }
  const home = await mkdtemp(join(scratch, 'app-test-off-'))
  let ids = 0
  const app = await createApp(pinnedInstance(home, { root: projectRoot }), { listen: false, manifest: without, overrides: { garage: { clock: () => NOW, newId: (kind: string) => `${kind}-${++ids}` } } })
  try {
    assert.equal((await app.root.router.request('/health')).status, 200)
    assert.equal((await app.root.router.request('/')).status, 404)
  } finally { await app.stop(); await rm(home, { recursive: true, force: true }) }
})
