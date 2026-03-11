import { useRef, useEffect } from 'react'
import { STATS_CONFIG } from '../lib/constants.js'

// Stat order for the radar (7 evenly spaced)
const RADAR_ORDER = ['mind', 'fitness', 'nutrition', 'social', 'sleep', 'nature', 'hygiene']

function getStatConfig(key) {
  return STATS_CONFIG.find(s => s.key === key)
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function makeSvgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  return el
}

export default function RadarChart({ stats }) {
  const svgRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Cancel any in-progress animation
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }

    const svg = svgRef.current

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const VW = 340
    const VH = 310
    const cx = 170
    const cy = 158
    const maxR = 108
    const labelR = 137
    const n = RADAR_ORDER.length
    const angleStep = 360 / n

    // ── Defs (gradient) ──────────────────────────────────────
    const defs = makeSvgEl('defs', {})

    const grad = makeSvgEl('radialGradient', {
      id: 'radarFill',
      cx: '50%',
      cy: '50%',
      r: '50%',
    })
    const stop1 = makeSvgEl('stop', {
      offset: '30%',
      'stop-color': 'rgba(255,255,255,0.30)',
    })
    const stop2 = makeSvgEl('stop', {
      offset: '100%',
      'stop-color': 'rgba(255,255,255,0.04)',
    })
    grad.appendChild(stop1)
    grad.appendChild(stop2)
    defs.appendChild(grad)
    svg.appendChild(defs)

    // ── Grid rings ───────────────────────────────────────────
    const rings = [25, 50, 75, 100]
    rings.forEach(pct => {
      const r = (pct / 100) * maxR
      const circle = makeSvgEl('circle', {
        cx,
        cy,
        r,
        fill: 'none',
        stroke: 'rgba(255,255,255,0.12)',
        'stroke-width': '1',
      })
      svg.appendChild(circle)
    })

    // ── Axis spokes ──────────────────────────────────────────
    RADAR_ORDER.forEach((_, i) => {
      const angle = i * angleStep
      const outer = polarToCartesian(cx, cy, maxR, angle)
      const line = makeSvgEl('line', {
        x1: cx,
        y1: cy,
        x2: outer.x,
        y2: outer.y,
        stroke: 'rgba(255,255,255,0.15)',
        'stroke-width': '1',
      })
      svg.appendChild(line)
    })

    // ── Pre-compute target points ────────────────────────────
    const targetPoints = RADAR_ORDER.map((key, i) => {
      const val = stats?.[key] ?? 50
      const pct = val / 100
      const angle = i * angleStep
      return polarToCartesian(cx, cy, maxR * pct, angle)
    })

    // ── Fill polygon (animated) ──────────────────────────────
    const fillPoly = makeSvgEl('polygon', {
      fill: 'url(#radarFill)',
      stroke: 'rgba(255,255,255,0.55)',
      'stroke-width': '1.5',
      points: Array(n).fill(`${cx},${cy}`).join(' '),
    })
    svg.appendChild(fillPoly)

    // ── Vertex dots (animated) ───────────────────────────────
    const dots = RADAR_ORDER.map((key, i) => {
      const cfg = getStatConfig(key)
      const dot = makeSvgEl('circle', {
        cx,
        cy,
        r: '4',
        fill: cfg?.color || '#fff',
        stroke: 'rgba(255,255,255,0.8)',
        'stroke-width': '1.5',
      })
      svg.appendChild(dot)
      return dot
    })

    // ── Labels ───────────────────────────────────────────────
    RADAR_ORDER.forEach((key, i) => {
      const cfg = getStatConfig(key)
      const angle = i * angleStep
      const lp = polarToCartesian(cx, cy, labelR, angle)
      const lx = lp.x
      const ly = lp.y

      // Emoji
      const emojiEl = makeSvgEl('text', {
        x: lx,
        y: ly - 9,
        'text-anchor': 'middle',
        'font-size': '14',
        'dominant-baseline': 'middle',
      })
      emojiEl.textContent = cfg?.emoji || ''
      svg.appendChild(emojiEl)

      // Stat name
      const nameEl = makeSvgEl('text', {
        x: lx,
        y: ly + 5,
        'text-anchor': 'middle',
        'font-size': '7',
        fill: 'rgba(255,255,255,0.6)',
        'font-family': "'Space Grotesk', sans-serif",
        'font-weight': '700',
        'letter-spacing': '0.5',
        'text-transform': 'uppercase',
      })
      nameEl.textContent = (cfg?.label || key).toUpperCase()
      svg.appendChild(nameEl)

      // Percentage
      const val = stats?.[key] ?? 50
      const pctEl = makeSvgEl('text', {
        x: lx,
        y: ly + 17,
        'text-anchor': 'middle',
        'font-size': '9',
        fill: 'rgba(255,255,255,0.9)',
        'font-family': "'Space Grotesk', sans-serif",
        'font-weight': '700',
      })
      pctEl.textContent = `${Math.round(val)}%`
      svg.appendChild(pctEl)
    })

    // ── Animation ────────────────────────────────────────────
    const DURATION = 1300
    const start = performance.now()

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3)
    }

    function animate(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / DURATION, 1)
      const eased = easeOutCubic(progress)

      // Interpolate polygon points from centre to target
      const pts = targetPoints.map(tp => {
        const x = cx + (tp.x - cx) * eased
        const y = cy + (tp.y - cy) * eased
        return `${x},${y}`
      })
      fillPoly.setAttribute('points', pts.join(' '))

      // Move dots
      targetPoints.forEach((tp, i) => {
        const x = cx + (tp.x - cx) * eased
        const y = cy + (tp.y - cy) * eased
        dots[i].setAttribute('cx', x)
        dots[i].setAttribute('cy', y)
      })

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        animRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
    }
  }, [stats])

  return (
    <svg
      ref={svgRef}
      className="hero-radar-svg"
      viewBox="0 0 340 310"
      xmlns="http://www.w3.org/2000/svg"
    />
  )
}
