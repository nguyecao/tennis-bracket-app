// Download the tournament as a printable PDF: a traditional tennis draw sheet for the
// Main Draw (and Consolation), plus group tables and results. It's a snapshot of the
// bracket at the moment you tap Download. jsPDF is loaded only when needed.
import { BYE, getBrackets, roundName } from './bracket'
import { groupWord, isPoolPlay } from './groups'
import { formatDay, isDay, dayFromTimestamp } from './dates'

const PAGE = { w: 612, h: 792 } // US Letter, portrait, in points
const M = 36 // margin
const TOP = 92 // where content starts (below the page header)
const BOTTOM = 48 // room for the footer
const SECTION = 32 // draws bigger than this are split into sections of 32 lines
const INK = [27, 42, 34]
const GREY = [110, 124, 116]
const RULE = [150, 160, 154]

export async function downloadPdf(t, { name, accent }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const color = hexToRgb(accent) || [45, 106, 79]
  const b = getBrackets(t)
  const day = isDay(t.date) ? t.date : t.created ? dayFromTimestamp(t.created) : null
  const seedOf = b.drawSeeds
    ? (n) => b.drawSeeds[n] || null
    : (n) => (t.seeds ? t.seeds.indexOf(n) + 1 || null : null)

  const pages = [] // section title for each page, filled in as pages are added
  const newPage = (title) => {
    if (pages.length) doc.addPage()
    pages.push(title)
  }

  if (b.groups) {
    const stage = isPoolPlay(t.advance)
      ? 'Pool Play'
      : b.groups.length === 1 && !b.main
        ? 'Round Robin'
        : 'Group Stage'
    drawGroups(doc, b.groups, t, stage, newPage)
  }
  if (b.main) drawDraw(doc, b.main, { title: 'Main Draw', seedOf, labels: b.labels, color, newPage })
  if (b.consolation) drawDraw(doc, b.consolation, { title: 'Consolation', seedOf: () => null, color, newPage })

  // Header and footer on every page
  const saved = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  pages.forEach((title, i) => {
    doc.setPage(i + 1)
    doc.setFillColor(...color)
    doc.rect(0, 0, PAGE.w, 8, 'F')
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold').setFontSize(18)
    doc.text(fit(doc, clean(name), PAGE.w - 2 * M - 150), M, 44)
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GREY)
    if (day) doc.text(formatDay(day), M, 60)
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...color)
    doc.text(title, PAGE.w - M, 44, { align: 'right' })
    doc.setDrawColor(...color).setLineWidth(1.5)
    doc.line(M, 70, PAGE.w - M, 70)

    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY)
    doc.text(`Results as of ${saved} · TENNIS.live`, M, PAGE.h - 24)
    doc.text(`Page ${i + 1} of ${pages.length}`, PAGE.w - M, PAGE.h - 24, { align: 'right' })
  })

  doc.save(`${fileName(name)}${day ? `-${day}` : ''}.pdf`)
}

// ---------- Draw sheet ----------

// One bracket. Small draws fit on one page; bigger ones get a page per section of 32,
// then a final page that takes the section winners through to the champion.
function drawDraw(doc, rounds, { title, seedOf, labels, color, newPage }) {
  const slots = rounds[0].length * 2
  const label = (i) => labels?.[i] || null
  if (slots <= SECTION) {
    newPage(title)
    drawBlock(doc, rounds, 0, rounds.length, 0, rounds[0].length, { seedOf, label, color, number: true })
    return
  }
  const perSection = SECTION / 2 // first-round matches per section
  const sectionRounds = Math.log2(SECTION) // rounds played inside a section
  const sections = rounds[0].length / perSection
  for (let s = 0; s < sections; s++) {
    newPage(`${title} · Section ${s + 1} of ${sections}`)
    drawBlock(doc, rounds, 0, sectionRounds, s * perSection, perSection, { seedOf, label, color, number: true })
  }
  newPage(`${title} · Finals`)
  const r0 = sectionRounds
  drawBlock(doc, rounds, r0, rounds.length - r0, 0, rounds[r0].length, { seedOf, label: () => null, color })
}

// Draw `count` rounds starting at round r0, for matches [first, first + n) of round r0.
// Column 0 lists the players in those matches; each next column holds the winners,
// with the score written under the winner's line.
function drawBlock(doc, rounds, r0, count, first, n, { seedOf, label, color, number }) {
  const entries = rounds[r0].slice(first, first + n).flatMap((m) => [m.a, m.b])
  const rows = entries.length
  const height = PAGE.h - TOP - BOTTOM - 14
  const gap = Math.min(height / rows, 64) // small draws spread out, big ones pack in
  const font = Math.max(6.5, Math.min(10.5, gap * 0.48))
  const width = PAGE.w - 2 * M
  const col0 = Math.min(190, Math.max(150, width * 0.32))
  const colW = Math.min(150, (width - col0) / count)
  const x = (c) => (c === 0 ? M : M + col0 + (c - 1) * colW)
  const w = (c) => (c === 0 ? col0 : colW) - 4 // room for text
  // Lines run right up to the next column's connector (the champion's line stops short)
  const end = (c) => x(c) + (c === 0 ? col0 : colW) - (c === count ? 4 : 0)
  const top = TOP + 14

  // Round names above the columns
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...color)
  for (let c = 0; c <= count; c++) {
    const next = rounds[r0 + c]
    const head = next ? roundName(next.length) : 'Champion'
    doc.text(head.toUpperCase(), x(c), TOP + 2)
  }

  // Column 0: the players
  let ys = entries.map((_, i) => top + (i + 1) * gap - gap * 0.25)
  doc.setDrawColor(...RULE).setLineWidth(0.6)
  entries.forEach((p, i) => {
    const y = ys[i]
    doc.line(x(0), y, end(0), y)
    let textX = x(0) + 2
    if (number) {
      const pos = first * 2 + i + 1
      doc.setFont('helvetica', 'normal').setFontSize(font - 1.5).setTextColor(...GREY)
      doc.text(String(pos), textX + 12, y - 2.5, { align: 'right' })
      textX += 17
    }
    const index = first * 2 + i
    writeName(doc, p, y, textX, x(0) + w(0) - textX, font, {
      seed: p && p !== BYE ? seedOf(p) : null,
      placeholder: label(index),
    })
  })

  // Winner columns
  for (let c = 1; c <= count; c++) {
    const round = rounds[r0 + c - 1]
    const scale = 2 ** (c - 1) // each round has half as many matches as the one before
    const matches = round.slice(first / scale, (first + n) / scale)
    const next = []
    matches.forEach((m, j) => {
      const [ya, yb] = [ys[2 * j], ys[2 * j + 1]]
      const y = (ya + yb) / 2
      next.push(y)
      doc.setDrawColor(...RULE).setLineWidth(0.6)
      doc.line(x(c), ya, x(c), yb) // joins the pair
      doc.line(x(c), y, end(c), y)
      const champion = c === count && r0 + c === rounds.length
      const winner = m.winner && m.winner !== BYE ? m.winner : m.winner === BYE ? BYE : null
      // Seeds are shown in the first column only, as on a printed draw sheet
      writeName(doc, winner, y, x(c) + 3, w(c) - 4, champion ? font + 1 : font, {
        bold: champion,
        hideBye: true,
      })
      const score = m.winner && m.winner !== BYE && m.score ? scoreText(m) : ''
      if (score) {
        doc.setFont('helvetica', 'normal').setFontSize(Math.max(6, font - 1.5)).setTextColor(...GREY)
        doc.text(fit(doc, score, w(c) - 4), x(c) + 3, y + Math.max(7, font))
      }
    })
    ys = next
  }
}

function writeName(doc, p, y, x, maxW, font, { seed, placeholder, bold, hideBye }) {
  if (p === BYE) {
    if (hideBye) return
    doc.setFont('helvetica', 'italic').setFontSize(font).setTextColor(...GREY)
    doc.text('Bye', x, y - 2.5)
    return
  }
  if (!p) {
    if (!placeholder) return
    doc.setFont('helvetica', 'italic').setFontSize(font - 0.5).setTextColor(...GREY)
    doc.text(fit(doc, placeholder, maxW), x, y - 2.5)
    return
  }
  doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(font).setTextColor(...INK)
  const tag = seed ? ` (${seed})` : ''
  const nameW = maxW - (tag ? doc.getTextWidth(tag) : 0)
  const shown = fitName(doc, clean(p), nameW)
  doc.text(shown, x, y - 2.5)
  if (tag) {
    const after = x + doc.getTextWidth(shown)
    doc.setFont('helvetica', 'normal').setTextColor(...GREY)
    doc.text(tag, after, y - 2.5)
  }
}

// "6-3 4-6 7-6", written from the winner's side as on a draw sheet
function scoreText(m) {
  const flip = m.winner === m.b
  return m.score.map(([a, b]) => (flip ? `${b}-${a}` : `${a}-${b}`)).join('  ')
}

// ---------- Groups ----------

function drawGroups(doc, groups, t, stage, newPage) {
  const word = groupWord(t.advance)
  const pools = isPoolPlay(t.advance)
  const diffs = t.scoring && t.scoreTiebreak
  const colGap = 24
  const blockW = (PAGE.w - 2 * M - colGap) / 2
  const line = 12.5
  const heightOf = (g) => 22 + (g.players.length + 1) * line + 12 + g.matches.length * 11.5 + 18

  newPage(stage)
  let y = TOP
  for (let i = 0; i < groups.length; i += 2) {
    const pair = groups.slice(i, i + 2)
    const h = Math.max(...pair.map(heightOf))
    if (y + h > PAGE.h - BOTTOM && y > TOP) {
      newPage(stage)
      y = TOP
    }
    pair.forEach((g, k) => drawGroup(doc, g, M + k * (blockW + colGap), y, blockW, { word, pools, diffs, advance: t.advance, line }))
    y += h
  }
}

function drawGroup(doc, g, x, y, w, { word, pools, diffs, advance, line }) {
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK)
  doc.text(`${word} ${g.name}`, x, y + 10)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GREY)
  doc.text(g.done ? 'Complete' : `${g.played} of ${g.matches.length} played`, x + w, y + 10, { align: 'right' })

  // Standings
  // Columns on the right, each [label, width]; numbers are right-aligned at each column's edge
  const cols = diffs ? [['W', 22], ['L', 22], ['Sets', 34], ['Games', 40]] : [['W', 22], ['L', 22]]
  const rightEdges = []
  for (let k = cols.length - 1, edge = x + w; k >= 0; edge -= cols[k][1], k--) rightEdges[k] = edge
  let ty = y + 26
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GREY)
  doc.text('#', x + 2, ty)
  doc.text('PLAYER', x + 16, ty)
  cols.forEach(([label], k) => doc.text(label, rightEdges[k], ty, { align: 'right' }))
  doc.setDrawColor(...RULE).setLineWidth(0.5)
  doc.line(x, ty + 3, x + w, ty + 3)

  g.table.forEach((r, i) => {
    ty += line
    const through = g.done && !pools && i < advance
    doc.setFont('helvetica', through ? 'bold' : 'normal').setFontSize(9).setTextColor(...INK)
    doc.text(String(i + 1), x + 2, ty)
    const nameRoom = rightEdges[0] - cols[0][1] - (x + 16)
    doc.text(fitName(doc, clean(r.name), nameRoom), x + 16, ty)
    doc.setFont('helvetica', 'normal')
    const values = diffs ? [r.w, r.l, signed(r.sets), signed(r.games)] : [r.w, r.l]
    values.forEach((v, k) => doc.text(String(v), rightEdges[k], ty, { align: 'right' }))
  })
  if (g.done && !pools && advance < g.players.length) {
    ty += 10
    doc.setFont('helvetica', 'italic').setFontSize(7).setTextColor(...GREY)
    doc.text(`Top ${advance} (bold) advance`, x, ty)
  }

  // Results
  ty += 14
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GREY)
  doc.text('RESULTS', x, ty)
  doc.setFontSize(8)
  for (const m of g.matches) {
    ty += 11.5
    if (m.winner) {
      const loser = m.winner === m.a ? m.b : m.a
      const score = m.score ? scoreText(m) : ''
      const scoreW = score ? doc.getTextWidth(score) + 8 : 0
      doc.setFont('helvetica', 'normal').setTextColor(...INK)
      const text = fit(doc, `${clean(m.winner)} d. ${clean(loser)}`, w - scoreW)
      doc.text(text, x, ty)
      if (score) {
        doc.setTextColor(...GREY)
        doc.text(score, x + w, ty, { align: 'right' })
      }
    } else {
      doc.setFont('helvetica', 'normal').setTextColor(...GREY)
      doc.text(fit(doc, `${clean(m.a)} vs ${clean(m.b)}`, w), x, ty)
    }
  }
}

// ---------- Helpers ----------

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `-${-n}` : '0')

// Names that don't fit become "C. Alcaraz", then get cut short if still too long
function fitName(doc, name, maxW) {
  if (doc.getTextWidth(name) <= maxW) return name
  const parts = name.split(' ')
  if (parts.length > 1) {
    const short = `${parts[0][0]}. ${parts.slice(1).join(' ')}`
    return fit(doc, short, maxW)
  }
  return fit(doc, name, maxW)
}

// Shorten text with an ellipsis to fit the width
function fit(doc, text, maxW) {
  if (doc.getTextWidth(text) <= maxW) return text
  let s = text
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > maxW) s = s.slice(0, -1)
  return `${s.trimEnd()}...`
}

// The built-in PDF font covers Western European letters (é, ñ, ü...). Anything else
// (other scripts, emoji) would print as gibberish, so it becomes "?".
function clean(text) {
  return String(text).replace(/[^ -~ -ÿ–—‘’“”]/gu, '?')
}

function fileName(name) {
  return (
    clean(name)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'tournament'
  )
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const v = parseInt(m[1], 16)
  return [v >> 16, (v >> 8) & 255, v & 255]
}
