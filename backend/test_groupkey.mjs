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

// ════════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN
// ════════════════════════════════════════════════════════════════════════════

// PASO 1 — Brand norms (se aplican ANTES de limpiar "&" y especiales)
const BRAND_NORMS = [
  [/head\s*&\s*shoulders|head&shoulders/gi, 'head shoulders'],
  [/\bh&s\b/gi,                             'head shoulders'],
  [/l[''']oreal|loreal/gi,                  'loreal'],
  [/garnier\s+fructis/gi,                   'fructis'],
  [/aqua\s*fresh/gi,                        'aquafresh'],
  [/old\s+spice/gi,                         'oldspice'],
]

// PASO 2 — Marcas conocidas, ordenadas de más larga a más corta
const KNOWN_BRANDS = [
  'head shoulders', 'lady speed stick', 'speed stick', 'cor intensa',
  'pantene', 'elvive', 'familand', 'fructis', 'sedal',
  'ilicit', 'nutrisse', 'excellence', 'issue',
  'axe', 'nivea', 'rexona', 'oldspice', 'dove',
  'colgate', 'pepsodent', 'aquafresh',
  'simonds', 'protex', 'loreal',
].sort((a, b) => b.length - a.length)

// Tipo por defecto para marcas monomorfas
const BRAND_DEFAULT_TYPE = {
  'colgate':   'pasta dental',
  'pepsodent': 'pasta dental',
  'aquafresh': 'pasta dental',
  'simonds':   'jabon',
  'protex':    'jabon',
}

// Nombres de display para tipos canónicos
const TYPE_DISPLAY = {
  'shampoo':        'Shampoo',
  'acondicionador': 'Acondicionador',
  'crema peinar':   'Crema de Peinar',
  'spray':          'Spray',
  'barra':          'Barra',
  'jabon':          'Jabón',
  'pasta dental':   'Pasta Dental',
  'tintura':        'Tintura',
  'desodorante':    'Desodorante',
}

// Nombres de display para marcas
const BRAND_DISPLAY = {
  'head shoulders':  'Head & Shoulders',
  'lady speed stick':'Lady Speed Stick',
  'speed stick':     'Speed Stick',
  'cor intensa':     'Cor Intensa',
  'oldspice':        'Old Spice',
  'loreal':          "L'Oréal",
  'aquafresh':       'Aquafresh',
  'pepsodent':       'Pepsodent',
  'colgate':         'Colgate',
  'pantene':         'Pantene',
  'elvive':          'Elvive',
  'familand':        'Familand',
  'fructis':         'Fructis',
  'sedal':           'Sedal',
  'ilicit':          'Ilicit',
  'nutrisse':        'Nutrisse',
  'excellence':      'Excellence',
  'issue':           'Issue',
  'axe':             'Axe',
  'nivea':           'Nivea',
  'rexona':          'Rexona',
  'dove':            'Dove',
  'simonds':         'Simonds',
  'protex':          'Protex',
}

// PASO 3 — Diccionario de tipos de producto
// null  = variedad/aroma, ignorar al detectar tipo (seguir buscando)
// string = tipo canónico
// Ordenados de MÁS LARGA a MÁS CORTA para detectar frases antes que palabras sueltas
const PRODUCT_TYPES_RAW = {
  // frases largas primero
  'pasta de dientes':  'pasta dental',
  'crema para peinar': 'crema peinar',
  'crema de peinar':   'crema peinar',
  'celulas madre veg': null,          // Sedal variedad — ignorar
  'rizos definidos':   null,
  'luminous uv':       null,
  'bomba argan':       null,
  'bomba coco':        null,
  'celulas madre':     null,
  'acondicionador':    'acondicionador',
  'crema dental':      'pasta dental',
  'pasta dental':      'pasta dental',
  'gel dental':        'pasta dental',
  'pan de jabon':      'jabon',
  'crema peinar':      'crema peinar',
  'coloracion':        'tintura',
  'desodorante':       null,          // genérico — spray/barra lo reemplaza
  'en barra':          'barra',
  'aerosol':           'spray',
  'shampoo':           'shampoo',
  'champu':            'shampoo',
  'tintura':           'tintura',
  'tinte':             'tintura',
  'jabon':             'jabon',
  'spray':             'spray',
  'barra':             'barra',
  'acond':             'acondicionador',
  'sh':                'shampoo',     // "Sedal sh bomba coco"
}

// Normalizar claves (quitar tildes) y ordenar descendente por longitud
const PRODUCT_TYPES_SORTED = Object.entries(PRODUCT_TYPES_RAW)
  .map(([k, v]) => [k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), v])
  .sort((a, b) => b[0].length - a[0].length)

// ─── Funciones auxiliares ─────────────────────────────────────────────────────

function clean(name) {
  let n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [pat, rep] of BRAND_NORMS) n = n.replace(pat, rep)
  return n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractBrand(n) {
  for (const brand of KNOWN_BRANDS) {
    if (new RegExp(`\\b${brand.replace(/\s+/g, '\\s+')}\\b`).test(n)) return brand
  }
  return ''
}

function extractSize(n) {
  const m = n.match(/\b(\d+)\s*(ml|gr|g|mg)\b/i)
  if (!m) return null
  let unit = m[2].toLowerCase(); if (unit === 'gr') unit = 'g'
  return `${parseInt(m[1])}${unit}`
}

// Recorre tipos de mayor a menor longitud.
// Cuando encuentra null sigue buscando (es variedad).
// Retorna el primer tipo no-null que encuentre.
function extractType(n) {
  for (const [key, value] of PRODUCT_TYPES_SORTED) {
    if (new RegExp(`\\b${key.replace(/\s+/g, '\\s+')}\\b`).test(n)) {
      if (value !== null) return value
      // null → seguir buscando el tipo real
    }
  }
  return null
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export function getGroupKey(name) {
  const n     = clean(name)
  const brand = extractBrand(n)
  const size  = extractSize(n)
  const type  = extractType(n) || BRAND_DEFAULT_TYPE[brand] || ''
  const key   = `${brand}_${type}_${size || 'nosize'}`

  // Nombre canónico: Marca + Tipo + Tamaño (para mostrar en la card)
  const brandDisp = BRAND_DISPLAY[brand] || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : '')
  const typeDisp  = TYPE_DISPLAY[type] || (type ? type.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '')
  const canonicalName = [brandDisp, typeDisp, size || ''].filter(Boolean).join(' ')

  return { brand, type, size, key, canonicalName }
}

// ════════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══ DIAGNÓSTICO — claves generadas ══')
const EJEMPLOS = [
  'Sedal shampoo rizos definidos 340ml',
  'Sedal sh bomba coco 340ml',
  'Sedal champu bomba argan 340ml',
  'Sedal Crema para Peinar Celulas Madre Veg 300ml',
  'Crema para Peinar Sedal Luminous UV 300ml',
  'Sedal Crema Peinar Cocos 300ml',
  'Colgate pasta dental triple accion 90ml',
  'Colgate triple 90ml',
  'Rexona desodorante spray 150ml',
  'Rexona aerosol 150ml',
  'Old Spice barra 50g',
  'Old Spice spray 150ml',
]
for (const e of EJEMPLOS) {
  const { brand, type, size, key, canonicalName } = getGroupKey(e)
  console.log(`  "${e}"`)
  console.log(`  → brand="${brand}" type="${type}" size="${size}"`)
  console.log(`  → key="${key}"`)
  console.log(`  → canonical="${canonicalName}"\n`)
}

// ════════════════════════════════════════════════════════════════════════════
// TAREA 5 — ASSERTS
// ════════════════════════════════════════════════════════════════════════════

console.log('══ DEBEN AGRUPARSE (misma clave) ══')

check(
  'Sedal shampoo rizos definidos 340ml === Sedal sh bomba coco 340ml',
  getGroupKey('Sedal shampoo rizos definidos 340ml').key,
  getGroupKey('Sedal sh bomba coco 340ml').key,
)

check(
  'Sedal champu bomba argan 340ml === Sedal shampoo 340ml',
  getGroupKey('Sedal champu bomba argan 340ml').key,
  getGroupKey('Sedal shampoo 340ml').key,
)

check(
  'Sedal Crema para Peinar Celulas Madre 300ml === Crema para Peinar Sedal Luminous UV 300ml',
  getGroupKey('Sedal Crema para Peinar Celulas Madre 300ml').key,
  getGroupKey('Crema para Peinar Sedal Luminous UV 300ml').key,
)

check(
  'Colgate pasta dental triple accion 90ml === Colgate triple 90ml',
  getGroupKey('Colgate pasta dental triple accion 90ml').key,
  getGroupKey('Colgate triple 90ml').key,
)

check(
  'Rexona desodorante spray 150ml === Rexona aerosol 150ml',
  getGroupKey('Rexona desodorante spray 150ml').key,
  getGroupKey('Rexona aerosol 150ml').key,
)

console.log('\n══ NO DEBEN AGRUPARSE (claves distintas) ══')

check(
  'Sedal shampoo 340ml ≠ Sedal shampoo 680ml  [tamaño distinto]',
  getGroupKey('Sedal shampoo 340ml').key,
  getGroupKey('Sedal shampoo 680ml').key,
  false,
)

check(
  'Sedal shampoo 340ml ≠ Sedal crema peinar 340ml  [tipo distinto]',
  getGroupKey('Sedal shampoo 340ml').key,
  getGroupKey('Sedal crema peinar 340ml').key,
  false,
)

check(
  'Dove shampoo 400ml ≠ Dove jabon 90g  [tipo y tamaño distintos]',
  getGroupKey('Dove shampoo 400ml').key,
  getGroupKey('Dove jabon 90g').key,
  false,
)

check(
  'Old Spice barra 50g ≠ Old Spice spray 150ml  [tipo y tamaño distintos]',
  getGroupKey('Old Spice barra 50g').key,
  getGroupKey('Old Spice spray 150ml').key,
  false,
)

console.log(`\n${pass > 0 ? G : ''}${pass} tests OK${X}${fail > 0 ? `, ${R}${fail} FALLAS${X}` : ''}\n`)
