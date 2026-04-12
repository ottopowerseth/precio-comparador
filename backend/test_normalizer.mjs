// ── ANSI colors ─────────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', D = '\x1b[2m', X = '\x1b[0m'
let pass = 0, fail = 0

function check(label, a, b, shouldEqual = true) {
  const eq = a === b
  const ok = shouldEqual ? eq : !eq
  if (ok) { console.log(`${G}✓${X} ${label}`); pass++ }
  else {
    console.log(`${R}✗${X} ${label}`)
    console.log(`  ${D}A: "${a}"`)
    console.log(`  B: "${b}"${X}`)
    fail++
  }
}

// ════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN DEL NORMALIZADOR
// ════════════════════════════════════════════════════════════

// PASO 2: stopwords — ordenadas de más larga a más corta para evitar match parcial
const STOPWORDS = [
  'pasta de dientes', 'crema dental', 'pasta dental',
  'en barra', 'en spray', 'para cabello',
  'shampoo', 'champu', 'desodorante', 'jabon',
  'tintura', 'original', 'spray', 'barra',
]

// PASO 3: normalizaciones de marca (aplicadas ANTES de quitar chars especiales)
const BRAND_NORMS = [
  [/head\s*&\s*shoulders|head&shoulders/gi, 'head shoulders'],
  [/\bh&s\b/gi,                             'head shoulders'],
  [/l[''']oreal|loreal/gi,                  'loreal'],
  [/garnier\s+fructis/gi,                   'fructis'],
  [/aqua\s*fresh/gi,                        'aquafresh'],
  [/old\s+spice/gi,                         'oldspice'],
]

// Marcas en su forma normalizada, ordenadas de más larga a más corta
const KNOWN_BRANDS = [
  'head shoulders', 'lady speed stick', 'speed stick', 'cor intensa',
  'pantene', 'elvive', 'familand', 'fructis', 'sedal',
  'ilicit', 'nutrisse', 'excellence', 'issue',
  'axe', 'nivea', 'rexona', 'oldspice', 'dove',
  'colgate', 'pepsodent', 'aquafresh',
  'simonds', 'protex', 'loreal',
].sort((a, b) => b.length - a.length)

// PASO 1 — Limpieza base + brand norms (antes de quitar "&" etc.)
function step1(name) {
  let n = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar tildes
  for (const [pat, rep] of BRAND_NORMS) n = n.replace(pat, rep)  // brand norms con & vigente
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() // quitar especiales
  return n
}

// PASO 2 — Quitar stopwords en cualquier posición
function removeStopwords(n) {
  for (const sw of STOPWORDS) {
    const pattern = sw.replace(/\s+/g, '\\s+')
    n = n.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ')
  }
  return n.replace(/\s+/g, ' ').trim()
}

// PASO 3 — Detectar marca en string normalizado
function extractBrand(n) {
  for (const brand of KNOWN_BRANDS) {
    const pattern = brand.replace(/\s+/g, '\\s+')
    if (new RegExp(`\\b${pattern}\\b`).test(n)) return brand
  }
  return ''
}

// PASO 5 — Extraer tamaño normalizado
function extractSize(n) {
  const m = n.match(/\b(\d+)\s*(ml|gr|g|mg)\b/i)
  if (!m) return null
  let unit = m[2].toLowerCase()
  if (unit === 'gr') unit = 'g'
  return `${parseInt(m[1])}${unit}`
}

function extractSizeNum(sizeStr) {
  if (!sizeStr) return null
  const m = sizeStr.match(/^(\d+)/)
  return m ? parseInt(m[1]) : null
}

function removeTerm(n, termStr) {
  if (!termStr) return n
  const pattern = termStr.replace(/\s+/g, '\\s+')
  return n.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim()
}

function removeSizeFromName(n) {
  return n.replace(/\b\d+\s*(?:ml|gr|g|mg)\b/gi, ' ').replace(/\s+/g, ' ').trim()
}

// PASO 4 — Normalizar variantes del nombre del producto
function applyProductNorms(namePart, brand) {
  // triple accion en cualquier variante
  namePart = namePart
    .replace(/\btriple\s+accion\b/g, 'triple accion')
    .replace(/\btriple\s*acci[oó]n\b/g, 'triple accion')
    .replace(/\btripleacci[oó]n\b/g, 'triple accion')

  // "triple" solo → "triple accion" SOLO si la marca es colgate
  if (brand === 'colgate') {
    namePart = namePart.replace(/\btriple\b(?!\s+accion)/g, 'triple accion')
  }
  return namePart.replace(/\s+/g, ' ').trim()
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export function buildGroupKey(name) {
  const n1   = step1(name)            // PASO 1: clean + brand norms
  const n2   = removeStopwords(n1)    // PASO 2: quitar stopwords

  const brand   = extractBrand(n2)
  const sizeStr = extractSize(n2)
  const sizeNum = extractSizeNum(sizeStr)

  // Extraer nombre sin marca y sin tamaño
  let namePart = removeTerm(n2, brand)
  namePart     = removeSizeFromName(namePart)
  namePart     = applyProductNorms(namePart, brand)  // PASO 4

  const key = `${brand}_${namePart}_${sizeStr || 'nosize'}`
  return { brand, namePart, sizeStr, sizeNum, key }
}

// ─── LEVENSHTEIN PARA FUZZY MATCH (PASO 7) ───────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[a.length][b.length]
}

export function nameSimilarity(a, b) {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : (max - levenshtein(a, b)) / max
}

// ════════════════════════════════════════════════════════════
// DIAGNÓSTICO: claves que genera para el ejemplo del problema
// ════════════════════════════════════════════════════════════

console.log('\n══ DIAGNÓSTICO — claves generadas ══')
const EJEMPLOS = [
  'Colgate pasta dental triple acción 90ml',
  'Colgate triple acción 90ml',
  'pasta dental triple acción 90gr',
  'Colgate triple 90ml',
]
EJEMPLOS.forEach(e => {
  const { key } = buildGroupKey(e)
  console.log(`  "${e}"\n  → "${key}"\n`)
})

// ════════════════════════════════════════════════════════════
// TESTS — DEBEN AGRUPARSE
// ════════════════════════════════════════════════════════════

console.log('══ DEBEN AGRUPARSE (misma clave) ══')

check(
  'Colgate pasta dental triple acción 90ml === Colgate triple 90ml',
  buildGroupKey('Colgate pasta dental triple acción 90ml').key,
  buildGroupKey('Colgate triple 90ml').key,
)

check(
  'Head & Shoulders 375ml === Head Shoulders shampoo 375ml',
  buildGroupKey('Head & Shoulders 375ml').key,
  buildGroupKey('Head Shoulders shampoo 375ml').key,
)

check(
  'Rexona spray 150ml === Desodorante Rexona 150 ml',
  buildGroupKey('Rexona spray 150ml').key,
  buildGroupKey('Desodorante Rexona 150 ml').key,
)

check(
  'Dove jabon 90g === Jabón Dove 90gr',
  buildGroupKey('Dove jabon 90g').key,
  buildGroupKey('Jabón Dove 90gr').key,
)

// ════════════════════════════════════════════════════════════
// TESTS — NO DEBEN AGRUPARSE
// ════════════════════════════════════════════════════════════

console.log('\n══ NO DEBEN AGRUPARSE (claves distintas) ══')

check(
  'Colgate triple accion 90ml ≠ Colgate triple accion 150ml  [tamaño distinto]',
  buildGroupKey('Colgate triple accion 90ml').key,
  buildGroupKey('Colgate triple accion 150ml').key,
  false,
)

check(
  'Dove shampoo 400ml ≠ Dove jabon 90g  [producto distinto]',
  buildGroupKey('Dove shampoo 400ml').key,
  buildGroupKey('Dove jabon 90g').key,
  false,
)

check(
  'Old Spice barra 50g ≠ Old Spice spray 150ml  [formato y tamaño distinto]',
  buildGroupKey('Old Spice barra 50g').key,
  buildGroupKey('Old Spice spray 150ml').key,
  false,
)

// ════════════════════════════════════════════════════════════
// FUZZY MATCH — "pasta dental triple acción 90gr" (sin marca en nombre)
// ════════════════════════════════════════════════════════════

console.log('\n══ FUZZY MATCH — caso La Mundial sin marca ══')
const ka = buildGroupKey('Colgate triple accion 90ml')
const kb = buildGroupKey('pasta dental triple acción 90gr')
const sim = nameSimilarity(ka.namePart, kb.namePart)
const brandOk  = !ka.brand || !kb.brand || ka.brand === kb.brand
const sizeOk   = ka.sizeNum === kb.sizeNum

console.log(`  A → brand="${ka.brand}" name="${ka.namePart}" size="${ka.sizeStr}" sizeNum=${ka.sizeNum}`)
console.log(`  B → brand="${kb.brand}" name="${kb.namePart}" size="${kb.sizeStr}" sizeNum=${kb.sizeNum}`)
console.log(`  Similitud nombre : ${Math.round(sim * 100)}%`)
console.log(`  Brand OK         : ${brandOk}  (uno vacío → se permite)`)
console.log(`  SizeNum OK       : ${sizeOk}   (${ka.sizeNum} === ${kb.sizeNum})`)
const fuzzy = sim >= 0.8 && brandOk && sizeOk
console.log(`  → ${fuzzy ? G + '✓ SE FUSIONAN' : R + '✗ NO se fusionan'}${X} por fuzzy match`)

// ════════════════════════════════════════════════════════════
// RESULTADO
// ════════════════════════════════════════════════════════════

console.log(`\n${pass > 0 ? G : ''}${pass} tests OK${X}${fail > 0 ? `, ${R}${fail} FALLAS${X}` : ''}\n`)
