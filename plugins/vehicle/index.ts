/** The vehicle profile, service history, expenses, the fuel form and the reminders. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { euro, GarageError, monthlyCosts, number, shortDate, sparkPath } from '../garage/index.ts'
const escape = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
export const name = 'vehicle'
export const inject = ['garage', 'shell', 'router']
export function apply(ctx: Context): void {
  const { garage, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const vehicle = garage.vehicle()
  const metrics = (): string => `<div class="metrics"><article class="metric"><small>COST THIS YEAR</small><strong>${euro(garage.costThisYear())}</strong><span>Service + fuel + insurance</span></article><article class="metric"><small>COST / KM</small><strong>€${(vehicle.lifetimeCost / vehicle.odometerKm).toFixed(2)}</strong><span>Lifetime average</span></article><article class="metric"><small>NEXT SERVICE</small><strong style="font-size:17px">${garage.nextServiceKm() === undefined ? '—' : `${number(garage.nextServiceKm() as number)} km`}</strong><span>Oil and filter change</span></article></div>`
  const hero = (): string => `<section class="hero"><div class="carart"><div class="carlabel">VEHICLE / PROFILE 001</div><div class="car"></div><div class="wheel one"></div><div class="wheel two"></div></div><div class="vehicleinfo"><small>${String(vehicle.year)} · ${escape(vehicle.fuelType).toUpperCase()} · ${escape(vehicle.transmission).toUpperCase()}</small><h2>${escape(vehicle.make)} ${escape(vehicle.model)}</h2><p>Registration: ${escape(vehicle.registration)} · VIN ${escape(vehicle.vinMasked)}</p><div class="specrow"><div><b>${number(vehicle.odometerKm)} km</b><small>ODOMETER</small></div><div><b>${garage.consumption().toFixed(1)} L/100</b><small>AVG. CONSUMPTION</small></div><div><b>${escape(vehicle.inspectionDue)}</b><small>INSPECTION DUE</small></div></div></div></section>`
  const fuelForm = (): string => `<section class="panel"><div class="ph"><div><h3>Log fuel fill-up</h3><small>Quick expense entry</small></div></div><form class="form" method="post" action="${shell.href('/fuel')}"><label>DATE<input name="date" type="date" value="${garage.today()}"></label><label>ODOMETER (KM)<input name="odometerKm" type="number" value="${String(vehicle.odometerKm)}"></label><label>LITRES<input name="litres" type="number" step="0.1" value="52.4"></label><label>TOTAL COST (€)<input name="totalCost" type="number" step="0.01" value="91.70"></label><div class="actions"><button class="primary">Save fuel entry</button></div></form></section>`
  const reminders = (): string => `<section class="panel"><div class="ph"><h3>Upcoming reminders</h3></div><div style="padding:0 15px 12px">${garage.reminders().filter((reminder) => reminder.status === 'open').map((reminder) => `<div class="bill"><span>${escape(reminder.title)}</span><b>${reminder.dueOdometerKm === undefined ? escape(reminder.dueDate ?? '') : `${number(Math.max(0, reminder.dueOdometerKm - vehicle.odometerKm))} km`}</b><form method="post" action="${shell.href(`/reminders/${encodeURIComponent(reminder.id)}/done`)}"><button style="background:none;border:0;color:#2b6d55;font-size:8px">Mark done</button></form></div>`).join('') || '<p class="empty">No open reminders.</p>'}</div></section>`
  const chart = (): string => {
    const values = garage.monthly()
    return `<section class="panel"><div class="ph"><div><h3>Running cost trend</h3><small>Monthly expenses · current year</small></div></div><div class="chart"><svg viewBox="0 0 650 150" preserveAspectRatio="none"><g stroke="#edf0f0"><path d="M0 30H650M0 70H650M0 110H650"/></g><path d="${sparkPath(values)}" fill="none" stroke="#de684b" stroke-width="2.5"/></svg><div class="chartleg"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>NOV</span></div></div></section>`
  }
  const profile = (url: string): string => {
    const entries = garage.services().slice(0, 5).map((record) => `<div class="entry"><time>${escape(shortDate(record.date))}</time><div><b>${escape(record.description.split(' · ')[0] ?? record.description)}</b><small>${escape(record.description.split(' · ').slice(1).join(' · ') || record.provider)} · ${number(record.odometerKm)} km</small></div><div class="cost">${euro(record.cost)}</div></div>`).join('')
    const main = `${shell.notice(url)}<div class="head"><div><small>GARAGE / VEHICLE PROFILE</small><h1>Vehicle logbook</h1><p>Keep service history, running costs and upcoming maintenance together.</p></div><a class="btn primary" href="${shell.href('/services')}" style="text-decoration:none">＋ Add service record</a></div>${hero()}<div class="maincols"><section>${metrics()}<section class="panel"><div class="ph"><div><h3>Service history</h3><small>Recorded work and vehicle events</small></div><a class="btn" href="${shell.href('/services')}" style="text-decoration:none">View all</a></div><div class="timeline">${entries === '' ? '<p class="empty">No service records yet.</p>' : entries}</div></section>${chart()}</section><aside>${fuelForm()}${reminders()}</aside></div>`
    return shell.page({ active: 'vehicle', title: 'Vehicle logbook', main })
  }
  const services = (url: string): string => {
    const rows = garage.services().map((record) => `<tr><td>${escape(shortDate(record.date))}</td><td><b>${escape(record.description)}</b><br><small>${escape(record.provider)}</small></td><td>${number(record.odometerKm)} km</td><td>${escape(record.type)}</td><td>${euro(record.cost)}</td></tr>`).join('')
    const main = `${shell.notice(url)}<div class="head"><div><small>GARAGE / SERVICE HISTORY</small><h1>Service history</h1><p>${String(garage.services().length)} records · ${euro(garage.costThisYear())} this year</p></div><a class="btn" href="${shell.href('/')}" style="text-decoration:none">Back to the vehicle ↗</a></div><table class="list"><thead><tr><th>DATE</th><th>WORK</th><th>ODOMETER</th><th>TYPE</th><th>COST</th></tr></thead><tbody>${rows === '' ? '<tr><td colspan="5">No service records.</td></tr>' : rows}</tbody></table><form class="form" method="post" action="${shell.href('/services')}"><h2>Add service record</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>DATE<input name="date" type="date" value="${garage.today()}"></label><label>ODOMETER (KM)<input name="odometerKm" type="number" value="${String(vehicle.odometerKm)}"></label></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>TYPE<select name="type"><option value="service">Service</option><option value="repair">Repair</option><option value="tyres">Tyres</option><option value="battery">Battery</option><option value="insurance">Insurance</option><option value="inspection">Inspection</option></select></label><label>COST (€)<input name="cost" type="number" step="0.01" placeholder="318"></label></div><label>PROVIDER<input name="provider" maxlength="80" placeholder="Autohaus West"></label><label>DESCRIPTION<input name="description" required maxlength="200" placeholder="Front brake pads replaced"></label><div class="actions"><button class="primary">Save service record</button></div></form>`
    return shell.page({ active: 'services', title: 'Service history', main })
  }
  const expenses = (url: string): string => {
    const rows = garage.fuel().map((entry) => `<tr><td>${escape(shortDate(entry.date))}</td><td>${number(entry.odometerKm)} km</td><td>${entry.litres.toFixed(1)} L</td><td>${euro(entry.totalCost)}</td></tr>`).join('')
    const main = `${shell.notice(url)}<div class="head"><div><small>GARAGE / EXPENSES</small><h1>Running costs</h1><p>Fuel, service and insurance · ${euro(garage.costThisYear())} this year</p></div><a class="btn" href="${shell.href('/')}" style="text-decoration:none">Back to the vehicle ↗</a></div>${metrics()}<table class="list"><thead><tr><th>DATE</th><th>ODOMETER</th><th>LITRES</th><th>COST</th></tr></thead><tbody>${rows === '' ? '<tr><td colspan="4">No fuel entries.</td></tr>' : rows}</tbody></table>${fuelForm()}<p style="font-size:8px;color:#87928f;margin-top:10px">Average consumption ${garage.consumption().toFixed(1)} L/100 km from the recorded fill-ups. VIN is masked; no live vehicle telemetry is used.</p>`
    return shell.page({ active: 'expenses', title: 'Running costs', main })
  }
  const app = new Acryl()
    .get('/', (c) => c.html(profile(c.req.url)))
    .get('/services', (c) => c.html(services(c.req.url)))
    .get('/expenses', (c) => c.html(expenses(c.req.url)))
    .post('/fuel', async (c) => {
      const form = await c.req.parseBody()
      try {
        await garage.addFuel({ date: form.date, odometerKm: form.odometerKm, litres: form.litres, totalCost: form.totalCost })
        return c.redirect(shell.url('/', { kind: 'ok', text: 'Fuel entry saved.' }), 303)
      } catch (error) {
        if (!(error instanceof GarageError)) throw error
        return c.redirect(shell.url('/', { kind: 'error', text: error.message }), 303)
      }
    })
    .post('/services', async (c) => {
      const form = await c.req.parseBody()
      try {
        await garage.addService({ date: form.date, odometerKm: form.odometerKm, type: String(form.type ?? 'service'), provider: String(form.provider ?? ''), description: String(form.description ?? ''), cost: form.cost })
        return c.redirect(shell.url('/services', { kind: 'ok', text: 'Service record saved.' }), 303)
      } catch (error) {
        if (!(error instanceof GarageError)) throw error
        return c.redirect(shell.url('/services', { kind: 'error', text: error.message }), 303)
      }
    })
    .post('/reminders/:id/done', async (c) => {
      try {
        await garage.completeReminder(c.req.param('id'))
        return c.redirect(shell.url('/', { kind: 'ok', text: 'Reminder marked done.' }), 303)
      } catch (error) {
        return c.redirect(shell.url('/', { kind: 'error', text: (error as Error).message }), 303)
      }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
  ctx.effect(() => shell.nav({ id: 'vehicle', label: 'My vehicles', icon: '', path: '/', order: 10 }))
  ctx.effect(() => shell.nav({ id: 'services', label: 'Maintenance', icon: '', path: '/services', order: 20 }))
  ctx.effect(() => shell.nav({ id: 'expenses', label: 'Expenses', icon: '', path: '/expenses', order: 30 }))
}
