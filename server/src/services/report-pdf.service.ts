import PDFDocument from 'pdfkit'
import type { getHistory, WearableDay } from './activity.service'

type History = Awaited<ReturnType<typeof getHistory>>

const BRAND = '#0f766e'
const INK = '#0b1220'
const MUTED = '#667085'
const LINE = '#e4e8ec'
const PERIOD_TITLE = { monthly: 'Last 30 days', yearly: 'Last 12 months', historical: 'All time' } as const

/** The built-in PDF fonts only cover Latin text, so anything else is shown as "?" rather than garbled. */
const safe = (value: unknown, max = 60) =>
  String(value ?? '').replace(/[^\x20-\x7E -ÿ]/g, '?').slice(0, max)
const n = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const when = (iso: string) => iso.slice(0, 10)

interface Column { label: string; width: number; align?: 'left' | 'right'; value: (row: any) => string }

/** A PDF progress report: totals, the per-period table, recent workouts and meals, and wearable averages. */
export function buildReportPdf(history: History, who: { name?: string; email?: string }, wearables: WearableDay[] = []): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 44, info: { Title: 'Reprummble progress report', Author: 'Reprummble' } })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = doc.page.margins.left
    const width = doc.page.width - left - doc.page.margins.right
    const bottom = () => doc.page.height - doc.page.margins.bottom - 24

    const heading = (text: string) => {
      if (doc.y > bottom() - 60) doc.addPage()
      doc.moveDown(0.9).font('Helvetica-Bold').fontSize(13).fillColor(INK).text(text, left, doc.y)
      doc.moveDown(0.3)
    }

    const table = (columns: Column[], rows: any[], emptyText: string) => {
      if (rows.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(emptyText, left, doc.y)
        return
      }
      const scale = width / columns.reduce((a, c) => a + c.width, 0)
      const widths = columns.map((c) => c.width * scale)
      const drawRow = (cells: string[], bold: boolean, shade: boolean) => {
        const y = doc.y
        if (shade) doc.rect(left, y - 2, width, 17).fill('#f6f8f9')
        let x = left
        cells.forEach((cell, i) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? MUTED : INK)
            .text(cell, x + 4, y + 1, { width: widths[i] - 8, align: columns[i].align ?? 'left', lineBreak: false, ellipsis: true })
          x += widths[i]
        })
        doc.y = y + 17
      }
      const header = () => { drawRow(columns.map((c) => c.label), true, false); doc.moveTo(left, doc.y - 1).lineTo(left + width, doc.y - 1).strokeColor(LINE).stroke() }
      header()
      rows.forEach((row, i) => {
        if (doc.y > bottom()) { doc.addPage(); header() }
        drawRow(columns.map((c) => c.value(row)), false, i % 2 === 1)
      })
    }

    // Header
    doc.rect(0, 0, doc.page.width, 8).fill(BRAND)
    doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('Reprummble', left, 34, { continued: true }).fillColor(BRAND).text('  progress report')
    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    doc.text(`${PERIOD_TITLE[history.period]}${history.from ? ` (${history.from} to ${history.to})` : ''}`, left, doc.y + 4)
    if (who.name || who.email) doc.text(`Prepared for ${safe([who.name, who.email].filter(Boolean).join(' - '), 90)}`)
    doc.text(`Generated ${history.generatedAt.slice(0, 16).replace('T', ' ')} UTC`)

    // Totals
    heading('Summary')
    const t = history.totals
    const tiles: [string, string][] = [
      ['Workouts', n(t.workouts)], ['Training minutes', n(t.minutes)], ['Calories burned', n(t.burned)],
      ['Calories eaten', n(t.calories)], ['Protein (g)', n(t.protein)], ['Carbs / Fat (g)', `${n(t.carbs)} / ${n(t.fat)}`],
    ]
    const tileW = width / 3
    const startY = doc.y
    tiles.forEach(([label, value], i) => {
      const x = left + (i % 3) * tileW
      const y = startY + Math.floor(i / 3) * 44
      doc.roundedRect(x + 2, y, tileW - 6, 38, 6).strokeColor(LINE).stroke()
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label.toUpperCase(), x + 10, y + 7, { width: tileW - 20 })
      doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(value, x + 10, y + 19, { width: tileW - 20 })
    })
    doc.y = startY + 92

    // History by period
    heading(history.period === 'monthly' ? 'Day by day' : history.period === 'yearly' ? 'Month by month' : 'Year by year')
    table([
      { label: 'Period', width: 80, value: (r) => r.period },
      { label: 'Workouts', width: 55, align: 'right', value: (r) => n(r.workouts) },
      { label: 'Minutes', width: 55, align: 'right', value: (r) => n(r.minutes) },
      { label: 'Burned', width: 55, align: 'right', value: (r) => n(r.burned) },
      { label: 'Eaten kcal', width: 65, align: 'right', value: (r) => n(r.calories) },
      { label: 'Protein', width: 52, align: 'right', value: (r) => n(r.protein) },
      { label: 'Carbs', width: 52, align: 'right', value: (r) => n(r.carbs) },
      { label: 'Fat', width: 45, align: 'right', value: (r) => n(r.fat) },
    ], history.rows, 'No activity logged in this period.')

    // Wearables
    if (wearables.length > 0) {
      const avg = (pick: (d: WearableDay) => number | null) => {
        const v = wearables.map(pick).filter((x): x is number => x !== null && x > 0)
        return v.length ? n(v.reduce((a, b) => a + b, 0) / v.length) : '-'
      }
      heading(`Wearable data (average of the last ${wearables.length} synced days)`)
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(
        `Steps ${avg((d) => d.steps)}   |   Sleep ${avg((d) => d.sleepHours)} h   |   Resting heart rate ${avg((d) => d.restingHR)} bpm   |   HRV ${avg((d) => d.hrv)} ms`, left, doc.y)
    }

    heading('Recent workouts')
    table([
      { label: 'Date', width: 70, value: (r) => when(r.at) },
      { label: 'Exercise', width: 200, value: (r) => safe(r.exercise) },
      { label: 'Minutes', width: 60, align: 'right', value: (r) => n(r.minutes) },
      { label: 'Burned', width: 60, align: 'right', value: (r) => n(r.burned) },
    ], history.recentWorkouts, 'No workouts logged in this period.')

    heading('Recent meals')
    table([
      { label: 'Date', width: 70, value: (r) => when(r.at) },
      { label: 'Meal', width: 170, value: (r) => safe(r.name) },
      { label: 'kcal', width: 50, align: 'right', value: (r) => n(r.calories) },
      { label: 'Protein', width: 50, align: 'right', value: (r) => n(r.protein) },
      { label: 'Carbs', width: 50, align: 'right', value: (r) => n(r.carbs) },
      { label: 'Fat', width: 45, align: 'right', value: (r) => n(r.fat) },
    ], history.recentMeals, 'No meals logged in this period.')

    doc.moveDown(1.2).font('Helvetica').fontSize(8).fillColor(MUTED).text(
      'This report summarizes what you logged in Reprummble. It is general fitness information, not medical advice. Dates are in UTC.', left, doc.y, { width })
    doc.end()
  })
}
