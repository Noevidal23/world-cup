import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { worldCupImportSchema, type WorldCupImportInput } from '../server/validators/worldcupImport'

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const FIFA_MATCH_SCHEDULE_PDF_URL = 'https://digitalhub.fifa.com/asset/4b5d4417-3343-4732-9cdf-14b6662af407/FWC26-Match-Schedule_English.pdf'
const OUTPUT_PATH = 'data/worldcup-2026.json'

interface OpenFootballMatch {
  round: string
  date: string
  time: string
  team1: string
  team2: string
  group?: string
  ground: string
  num?: number
}

interface OpenFootballPayload {
  name: string
  matches: OpenFootballMatch[]
}

const teamByName: Record<string, { fifaCode: string, name: string }> = {
  'Mexico': { fifaCode: 'MEX', name: 'México' },
  'South Africa': { fifaCode: 'RSA', name: 'Sudáfrica' },
  'South Korea': { fifaCode: 'KOR', name: 'Corea del Sur' },
  'Czech Republic': { fifaCode: 'CZE', name: 'Chequia' },
  'Canada': { fifaCode: 'CAN', name: 'Canadá' },
  'Bosnia & Herzegovina': { fifaCode: 'BIH', name: 'Bosnia y Herzegovina' },
  'Qatar': { fifaCode: 'QAT', name: 'Qatar' },
  'Switzerland': { fifaCode: 'SUI', name: 'Suiza' },
  'Brazil': { fifaCode: 'BRA', name: 'Brasil' },
  'Morocco': { fifaCode: 'MAR', name: 'Marruecos' },
  'Haiti': { fifaCode: 'HAI', name: 'Haití' },
  'Scotland': { fifaCode: 'SCO', name: 'Escocia' },
  'USA': { fifaCode: 'USA', name: 'Estados Unidos' },
  'Paraguay': { fifaCode: 'PAR', name: 'Paraguay' },
  'Australia': { fifaCode: 'AUS', name: 'Australia' },
  'Turkey': { fifaCode: 'TUR', name: 'Turquía' },
  'Germany': { fifaCode: 'GER', name: 'Alemania' },
  'Curaçao': { fifaCode: 'CUW', name: 'Curazao' },
  'Ivory Coast': { fifaCode: 'CIV', name: 'Costa de Marfil' },
  'Ecuador': { fifaCode: 'ECU', name: 'Ecuador' },
  'Netherlands': { fifaCode: 'NED', name: 'Países Bajos' },
  'Japan': { fifaCode: 'JPN', name: 'Japón' },
  'Sweden': { fifaCode: 'SWE', name: 'Suecia' },
  'Tunisia': { fifaCode: 'TUN', name: 'Túnez' },
  'Belgium': { fifaCode: 'BEL', name: 'Bélgica' },
  'Egypt': { fifaCode: 'EGY', name: 'Egipto' },
  'Iran': { fifaCode: 'IRN', name: 'Irán' },
  'New Zealand': { fifaCode: 'NZL', name: 'Nueva Zelanda' },
  'Spain': { fifaCode: 'ESP', name: 'España' },
  'Cape Verde': { fifaCode: 'CPV', name: 'Cabo Verde' },
  'Saudi Arabia': { fifaCode: 'KSA', name: 'Arabia Saudita' },
  'Uruguay': { fifaCode: 'URU', name: 'Uruguay' },
  'France': { fifaCode: 'FRA', name: 'Francia' },
  'Senegal': { fifaCode: 'SEN', name: 'Senegal' },
  'Iraq': { fifaCode: 'IRQ', name: 'Iraq' },
  'Norway': { fifaCode: 'NOR', name: 'Noruega' },
  'Argentina': { fifaCode: 'ARG', name: 'Argentina' },
  'Algeria': { fifaCode: 'ALG', name: 'Argelia' },
  'Austria': { fifaCode: 'AUT', name: 'Austria' },
  'Jordan': { fifaCode: 'JOR', name: 'Jordania' },
  'Portugal': { fifaCode: 'POR', name: 'Portugal' },
  'DR Congo': { fifaCode: 'COD', name: 'RD Congo' },
  'Uzbekistan': { fifaCode: 'UZB', name: 'Uzbekistán' },
  'Colombia': { fifaCode: 'COL', name: 'Colombia' },
  'England': { fifaCode: 'ENG', name: 'Inglaterra' },
  'Croatia': { fifaCode: 'CRO', name: 'Croacia' },
  'Ghana': { fifaCode: 'GHA', name: 'Ghana' },
  'Panama': { fifaCode: 'PAN', name: 'Panamá' }
}

const venuesByGround: Record<string, WorldCupImportInput['venues'][number]> = {
  'Mexico City': { key: 'estadio-azteca', name: 'Estadio Azteca', stadium: 'Estadio Azteca', city: 'Ciudad de México', country: 'México' },
  'Guadalajara (Zapopan)': { key: 'estadio-akron', name: 'Estadio Akron', stadium: 'Estadio Akron', city: 'Guadalajara', country: 'México' },
  'Monterrey (Guadalupe)': { key: 'estadio-bbva', name: 'Estadio BBVA', stadium: 'Estadio BBVA', city: 'Monterrey', country: 'México' },
  'Toronto': { key: 'bmo-field', name: 'BMO Field', stadium: 'BMO Field', city: 'Toronto', country: 'Canadá' },
  'Vancouver': { key: 'bc-place', name: 'BC Place', stadium: 'BC Place', city: 'Vancouver', country: 'Canadá' },
  'Los Angeles (Inglewood)': { key: 'sofi-stadium', name: 'SoFi Stadium', stadium: 'SoFi Stadium', city: 'Los Ángeles', country: 'Estados Unidos' },
  'San Francisco Bay Area (Santa Clara)': { key: 'levis-stadium', name: 'Levi\'s Stadium', stadium: 'Levi\'s Stadium', city: 'Área de la Bahía de San Francisco', country: 'Estados Unidos' },
  'New York/New Jersey (East Rutherford)': { key: 'metlife-stadium', name: 'MetLife Stadium', stadium: 'MetLife Stadium', city: 'Nueva York/Nueva Jersey', country: 'Estados Unidos' },
  'Boston (Foxborough)': { key: 'gillette-stadium', name: 'Gillette Stadium', stadium: 'Gillette Stadium', city: 'Boston', country: 'Estados Unidos' },
  'Atlanta': { key: 'mercedes-benz-stadium', name: 'Mercedes-Benz Stadium', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'Estados Unidos' },
  'Philadelphia': { key: 'lincoln-financial-field', name: 'Lincoln Financial Field', stadium: 'Lincoln Financial Field', city: 'Filadelfia', country: 'Estados Unidos' },
  'Miami (Miami Gardens)': { key: 'hard-rock-stadium', name: 'Hard Rock Stadium', stadium: 'Hard Rock Stadium', city: 'Miami', country: 'Estados Unidos' },
  'Houston': { key: 'nrg-stadium', name: 'NRG Stadium', stadium: 'NRG Stadium', city: 'Houston', country: 'Estados Unidos' },
  'Dallas (Arlington)': { key: 'att-stadium', name: 'AT&T Stadium', stadium: 'AT&T Stadium', city: 'Dallas', country: 'Estados Unidos' },
  'Kansas City': { key: 'arrowhead-stadium', name: 'Arrowhead Stadium', stadium: 'Arrowhead Stadium', city: 'Kansas City', country: 'Estados Unidos' },
  'Seattle': { key: 'lumen-field', name: 'Lumen Field', stadium: 'Lumen Field', city: 'Seattle', country: 'Estados Unidos' }
}

const shieldByCode: Record<string, string> = {
  ALG: '/escudos/argelia.png',
  ARG: '/escudos/argentina.png',
  AUS: '/escudos/australia.png',
  AUT: '/escudos/austria.png',
  BEL: '/escudos/belgica.png',
  BIH: '/escudos/bosnia.png',
  BRA: '/escudos/brasil.png',
  CAN: '/escudos/canada.png',
  CIV: '/escudos/costa_de_marfil.png',
  COD: '/escudos/congo.png',
  COL: '/escudos/colombia.png',
  CPV: '/escudos/cabo_verde.png',
  CRO: '/escudos/croacia.png',
  CUW: '/escudos/curazao.png',
  CZE: '/escudos/republicacheca.png',
  ECU: '/escudos/ecuador.png',
  EGY: '/escudos/egipto.png',
  ENG: '/escudos/inglaterra.png',
  ESP: '/escudos/espana.png',
  FRA: '/escudos/francia.png',
  GER: '/escudos/alemania.png',
  GHA: '/escudos/ghana.png',
  HAI: '/escudos/haiti.png',
  IRN: '/escudos/iran.png',
  IRQ: '/escudos/irak.png',
  JOR: '/escudos/jordan.png',
  JPN: '/escudos/japon.png',
  KOR: '/escudos/coreadelsur.png',
  KSA: '/escudos/arabiasaudita.png',
  MAR: '/escudos/marruecos.png',
  MEX: '/escudos/mexico.png',
  NED: '/escudos/paisesbajos.png',
  NOR: '/escudos/noruega.png',
  NZL: '/escudos/nuevazelanda.png',
  PAN: '/escudos/panama.png',
  PAR: '/escudos/paraguay.png',
  POR: '/escudos/portugal.png',
  QAT: '/escudos/qatar.png',
  RSA: '/escudos/sudafrica.png',
  SCO: '/escudos/escocia.png',
  SEN: '/escudos/senegal.png',
  SUI: '/escudos/suiza.png',
  SWE: '/escudos/suecia.png',
  TUN: '/escudos/tunez.png',
  TUR: '/escudos/turquia.png',
  URU: '/escudos/uruguay.png',
  USA: '/escudos/usa.png',
  UZB: '/escudos/uzbekistan.png'
}

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: ${response.status} ${response.statusText}`)
  }

  return await response.json() as T
}

const groupMatchKey = (group: string, homeCode: string, awayCode: string) =>
  `${group}|${normalizeMetadataCode(homeCode)}|${normalizeMetadataCode(awayCode)}`

const normalizeMetadataCode = (code: string) => {
  const normalized = code.toUpperCase()

  if (normalized === 'CUR') {
    return 'CUW'
  }

  return normalized
}

const officialGroupMatchNumbers = new Map<string, number>([
  ['A|MEX|RSA', 1],
  ['A|KOR|CZE', 2],
  ['A|CZE|RSA', 25],
  ['A|MEX|KOR', 28],
  ['A|CZE|MEX', 53],
  ['A|RSA|KOR', 54],
  ['B|CAN|BIH', 3],
  ['B|QAT|SUI', 8],
  ['B|SUI|BIH', 26],
  ['B|CAN|QAT', 27],
  ['B|SUI|CAN', 51],
  ['B|BIH|QAT', 52],
  ['C|HAI|SCO', 5],
  ['C|BRA|MAR', 7],
  ['C|BRA|HAI', 29],
  ['C|SCO|MAR', 30],
  ['C|SCO|BRA', 49],
  ['C|MAR|HAI', 50],
  ['D|USA|PAR', 4],
  ['D|AUS|TUR', 6],
  ['D|TUR|PAR', 31],
  ['D|USA|AUS', 32],
  ['D|TUR|USA', 59],
  ['D|PAR|AUS', 60],
  ['E|CIV|ECU', 9],
  ['E|GER|CUW', 10],
  ['E|GER|CIV', 33],
  ['E|ECU|CUW', 34],
  ['E|CUW|CIV', 55],
  ['E|ECU|GER', 56],
  ['F|NED|JPN', 11],
  ['F|SWE|TUN', 12],
  ['F|NED|SWE', 35],
  ['F|TUN|JPN', 36],
  ['F|JPN|SWE', 57],
  ['F|TUN|NED', 58],
  ['G|BEL|EGY', 15],
  ['G|IRN|NZL', 16],
  ['G|BEL|IRN', 39],
  ['G|NZL|EGY', 40],
  ['G|EGY|IRN', 63],
  ['G|NZL|BEL', 64],
  ['H|KSA|URU', 13],
  ['H|ESP|CPV', 14],
  ['H|URU|CPV', 37],
  ['H|ESP|KSA', 38],
  ['H|CPV|KSA', 65],
  ['H|URU|ESP', 66],
  ['I|FRA|SEN', 17],
  ['I|IRQ|NOR', 18],
  ['I|NOR|SEN', 41],
  ['I|FRA|IRQ', 42],
  ['I|NOR|FRA', 61],
  ['I|SEN|IRQ', 62],
  ['J|ARG|ALG', 19],
  ['J|AUT|JOR', 20],
  ['J|ARG|AUT', 43],
  ['J|JOR|ALG', 44],
  ['J|ALG|AUT', 69],
  ['J|JOR|ARG', 70],
  ['K|POR|COD', 23],
  ['K|UZB|COL', 24],
  ['K|POR|UZB', 47],
  ['K|COL|COD', 48],
  ['K|COL|POR', 71],
  ['K|COD|UZB', 72],
  ['L|GHA|PAN', 21],
  ['L|ENG|CRO', 22],
  ['L|ENG|GHA', 45],
  ['L|PAN|CRO', 46],
  ['L|PAN|ENG', 67],
  ['L|CRO|GHA', 68]
])

const getTeam = (name: string) => {
  const team = teamByName[name]

  if (!team) {
    throw new Error(`Equipo no reconocido: ${name}`)
  }

  return team
}

const getVenue = (ground: string) => {
  const venue = venuesByGround[ground]

  if (!venue) {
    throw new Error(`Sede no reconocida: ${ground}`)
  }

  return venue
}

const parseKickoff = (date: string, time: string) => {
  const match = time.match(/^(\d{2}):(\d{2}) UTC([+-]\d{1,2})$/)

  if (!match) {
    throw new Error(`Hora no reconocida: ${time}`)
  }

  const [, hour, minute, rawOffset] = match
  const sign = rawOffset.startsWith('-') ? '-' : '+'
  const offsetHour = rawOffset.replace(/[+-]/, '').padStart(2, '0')

  return `${date}T${hour}:${minute}:00${sign}${offsetHour}:00`
}

const parseGroup = (group?: string) => {
  const parsed = group?.match(/^Group\s+([A-L])$/i)?.[1]

  return parsed?.toUpperCase()
}

const parseStage = (round: string): WorldCupImportInput['matches'][number]['stage'] => {
  if (/^matchday\s+\d+$/i.test(round)) {
    return 'group'
  }

  const normalized = round.toLowerCase()

  if (normalized === 'round of 32') {
    return 'round_of_32'
  }

  if (normalized === 'round of 16') {
    return 'round_of_16'
  }

  if (normalized === 'quarter-finals' || normalized === 'quarter-final') {
    return 'quarter_final'
  }

  if (normalized === 'semi-finals' || normalized === 'semi-final') {
    return 'semi_final'
  }

  if (normalized === 'third place' || normalized === 'match for third place') {
    return 'third_place'
  }

  if (normalized === 'final') {
    return 'final'
  }

  throw new Error(`Fase no reconocida: ${round}`)
}

const normalizeSlot = (slot: string) => {
  const groupWinner = slot.match(/^1([A-L])$/i)

  if (groupWinner?.[1]) {
    return `Ganador Grupo ${groupWinner[1].toUpperCase()}`
  }

  const runnerUp = slot.match(/^2([A-L])$/i)

  if (runnerUp?.[1]) {
    return `Segundo Grupo ${runnerUp[1].toUpperCase()}`
  }

  const bestThird = slot.match(/^3([A-L](?:\/[A-L])*)$/i)

  if (bestThird?.[1]) {
    return `Mejor tercero (${bestThird[1].toUpperCase()})`
  }

  const winner = slot.match(/^W(\d+)$/i)

  if (winner?.[1]) {
    return `Ganador Partido ${winner[1]}`
  }

  const loser = slot.match(/^L(\d+)$/i)

  if (loser?.[1]) {
    return `Perdedor Partido ${loser[1]}`
  }

  return slot
}

const knockoutNumberFor = (match: OpenFootballMatch) => {
  if (match.round === 'Third Place' || match.round === 'Match for third place') {
    return 103
  }

  if (match.round === 'Final') {
    return 104
  }

  throw new Error(`Partido eliminatorio sin numero: ${match.round} ${match.team1} vs ${match.team2}`)
}

const knockoutNumberOffsets: Partial<Record<WorldCupImportInput['matches'][number]['stage'], number>> = {
  round_of_32: 73,
  round_of_16: 89,
  quarter_final: 97,
  semi_final: 101
}

const buildPayload = (openFootball: OpenFootballPayload): WorldCupImportInput => {
  const groups = new Map<string, string[]>()
  const teams = new Map<string, WorldCupImportInput['teams'][number]>()
  const knockoutStageCounts = new Map<WorldCupImportInput['matches'][number]['stage'], number>()

  const matches = openFootball.matches.map((match) => {
    const stage = parseStage(match.round)
    const venue = getVenue(match.ground)
    const base = {
      externalId: '',
      stage,
      kickoffAt: parseKickoff(match.date, match.time),
      venue: venue.name,
      venueKey: venue.key,
      stadium: venue.stadium,
      city: venue.city,
      country: venue.country,
      scoringMode: stage === 'group' ? 'regular_time' as const : 'penalties_final' as const
    }

    if (stage === 'group') {
      const group = parseGroup(match.group)

      if (!group) {
        throw new Error(`Partido de grupo sin grupo valido: ${JSON.stringify(match)}`)
      }

      const homeTeam = getTeam(match.team1)
      const awayTeam = getTeam(match.team2)
      const matchNumber = officialGroupMatchNumbers.get(groupMatchKey(group, homeTeam.fifaCode, awayTeam.fifaCode))

      if (!matchNumber) {
        throw new Error(`No se encontro numero oficial para ${group}: ${match.team1} vs ${match.team2}`)
      }

      for (const team of [homeTeam, awayTeam]) {
        teams.set(team.fifaCode, { ...team, group, flagUrl: shieldByCode[team.fifaCode] })
      }

      const groupTeams = groups.get(group) || []
      for (const team of [homeTeam, awayTeam]) {
        if (!groupTeams.includes(team.fifaCode)) {
          groupTeams.push(team.fifaCode)
        }
      }
      groups.set(group, groupTeams)

      return {
        ...base,
        number: matchNumber,
        externalId: `wc2026-${matchNumber}`,
        group,
        homeTeam: homeTeam.fifaCode,
        awayTeam: awayTeam.fifaCode
      }
    }

    const offset = knockoutNumberOffsets[stage]
    const stageIndex = (knockoutStageCounts.get(stage) || 0)
    knockoutStageCounts.set(stage, stageIndex + 1)
    const number = offset ? offset + stageIndex : knockoutNumberFor(match)

    return {
      ...base,
      number,
      externalId: `wc2026-${number}`,
      homeSlot: normalizeSlot(match.team1),
      awaySlot: normalizeSlot(match.team2)
    }
  })

  const seenNumbers = new Set<number>()
  for (const match of matches) {
    if (seenNumbers.has(match.number)) {
      throw new Error(`Numero de partido duplicado: ${match.number}`)
    }
    seenNumbers.add(match.number)
  }

  if (matches.length !== 104) {
    throw new Error(`Se esperaban 104 partidos, se construyeron ${matches.length}`)
  }

  if (teams.size !== 48) {
    throw new Error(`Se esperaban 48 equipos, se construyeron ${teams.size}`)
  }

  const payload = {
    tournament: openFootball.name,
    sources: {
      schedule: OPENFOOTBALL_URL,
      groupMatchNumbers: FIFA_MATCH_SCHEDULE_PDF_URL
    },
    teams: [...teams.values()].sort((a, b) => a.group === b.group ? a.name.localeCompare(b.name) : (a.group || '').localeCompare(b.group || '')),
    groups: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, groupTeams]) => ({ name, teams: groupTeams })),
    venues: Object.values(venuesByGround).sort((a, b) => a.name.localeCompare(b.name)),
    knockoutSlots: [],
    matches: matches.sort((a, b) => a.number - b.number)
  }

  return worldCupImportSchema.parse(payload)
}

const run = async () => {
  const outputPath = resolve(process.argv[2] || OUTPUT_PATH)
  const openFootball = await getJson<OpenFootballPayload>(OPENFOOTBALL_URL)

  const payload = buildPayload(openFootball)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    ok: true,
    outputPath,
    teams: payload.teams.length,
    groups: payload.groups.length,
    venues: payload.venues.length,
    matches: payload.matches.length,
    sources: {
      schedule: OPENFOOTBALL_URL,
      groupMatchNumbers: FIFA_MATCH_SCHEDULE_PDF_URL
    }
  }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
