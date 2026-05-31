<script setup lang="ts">
import type { PredictionMatch } from '../../types/domain'

definePageMeta({
  middleware: 'participant'
})

interface PredictionsResponse {
  matches: PredictionMatch[]
}

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const savingMatchId = ref<string | null>(null)

const { data, pending, refresh } = await useFetch<PredictionsResponse>('/api/predictions', {
  headers,
  credentials: 'include'
})

interface PredictionDraft {
  home: number | null
  away: number | null
  extraHome: number | null
  extraAway: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  penaltyWinner?: 'home' | 'away'
}

const draftScores = reactive<Record<string, PredictionDraft>>({})

const matches = computed(() => data.value?.matches || [])

const pendingMatches = computed(() => matches.value.filter(match => match.canPredict && !match.prediction))
const submittedMatches = computed(() => matches.value.filter(match => match.canPredict && match.prediction))
const closedMatches = computed(() => matches.value.filter(match => !match.canPredict))

const stageOrder: PredictionMatch['stage'][] = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
]

const stageLabel = (stage: PredictionMatch['stage']) => {
  const labels: Record<PredictionMatch['stage'], string> = {
    group: 'Fase de grupos',
    round_of_32: 'Dieciseisavos',
    round_of_16: 'Octavos',
    quarter_final: 'Cuartos',
    semi_final: 'Semifinal',
    third_place: 'Tercer lugar',
    final: 'Final'
  }

  return labels[stage]
}

const groupByStage = (items: PredictionMatch[]) => stageOrder
  .map(stage => ({
    stage,
    title: stageLabel(stage),
    matches: items.filter(match => match.stage === stage)
  }))
  .filter(group => group.matches.length > 0)

const groupedMatches = computed(() => [
  {
    key: 'pending',
    title: 'Pendientes',
    icon: 'i-lucide-clock-3',
    color: 'warning' as const,
    matches: pendingMatches.value,
    stages: groupByStage(pendingMatches.value)
  },
  {
    key: 'submitted',
    title: 'Realizados',
    icon: 'i-lucide-check-circle-2',
    color: 'success' as const,
    matches: submittedMatches.value,
    stages: groupByStage(submittedMatches.value)
  },
  {
    key: 'closed',
    title: 'Cerrados',
    icon: 'i-lucide-lock',
    color: 'neutral' as const,
    matches: closedMatches.value,
    stages: groupByStage(closedMatches.value)
  }
])

const ensureDraftScore = (match: PredictionMatch) => {
  if (!draftScores[match.id]) {
    draftScores[match.id] = {
      home: match.prediction?.predictedHomeGoals ?? null,
      away: match.prediction?.predictedAwayGoals ?? null,
      extraHome: match.prediction?.predictedExtraTimeHomeGoals ?? null,
      extraAway: match.prediction?.predictedExtraTimeAwayGoals ?? null,
      penaltyHome: match.prediction?.predictedPenaltyHomeGoals ?? null,
      penaltyAway: match.prediction?.predictedPenaltyAwayGoals ?? null,
      penaltyWinner: match.prediction?.predictedPenaltyWinner
    }
  }

  return draftScores[match.id] as PredictionDraft
}

watch(matches, (items) => {
  for (const match of items) {
    ensureDraftScore(match)
  }
}, { immediate: true })

const displayTeam = (match: PredictionMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.homeTeam : match.awayTeam
  const slot = side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

  return team ? team.name : slot || 'Pendiente'
}

const teamFor = (match: PredictionMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeTeam : match.awayTeam

const slotFor = (match: PredictionMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

const isKnockoutMatch = (match: PredictionMatch) => match.stage !== 'group'

const isRegularDrawDraft = (match: PredictionMatch) => {
  const draft = ensureDraftScore(match)
  return draft.home !== null && draft.away !== null && draft.home === draft.away
}

const isExtraTimeDrawDraft = (match: PredictionMatch) => {
  const draft = ensureDraftScore(match)
  return draft.extraHome !== null && draft.extraAway !== null && draft.extraHome === draft.extraAway
}

const penaltyWinnerOptions = [
  { label: 'Local', value: 'home' },
  { label: 'Visitante', value: 'away' }
]

const predictionScoreLabel = (match: PredictionMatch) => {
  const prediction = match.prediction

  if (!prediction) {
    return ''
  }

  const parts = [`90': ${prediction.predictedHomeGoals}-${prediction.predictedAwayGoals}`]

  if (prediction.predictedExtraTimeHomeGoals !== undefined && prediction.predictedExtraTimeAwayGoals !== undefined) {
    parts.push(`TE: ${prediction.predictedExtraTimeHomeGoals}-${prediction.predictedExtraTimeAwayGoals}`)
  }

  if (prediction.predictedPenaltyHomeGoals !== undefined && prediction.predictedPenaltyAwayGoals !== undefined) {
    parts.push(`Pen: ${prediction.predictedPenaltyHomeGoals}-${prediction.predictedPenaltyAwayGoals}`)
  }

  return parts.join(' · ')
}

const predictionStatusLabel = (match: PredictionMatch) => {
  if (!match.canPredict) {
    if (!match.prediction) {
      return 'Sin pronóstico'
    }

    if (match.prediction.status !== 'evaluated') {
      return 'Cerrado'
    }

    return match.prediction.totalPoints > 0 ? 'Atinado' : 'No acertado'
  }

  if (!match.prediction) {
    return 'Sin pronóstico'
  }

  return match.prediction.status === 'evaluated' ? 'Evaluado' : 'Guardado'
}

const predictionStatusColor = (match: PredictionMatch) => {
  if (!match.canPredict && match.prediction?.status === 'evaluated') {
    return match.prediction.totalPoints > 0 ? 'success' : 'error'
  }

  if (!match.canPredict) {
    return 'neutral'
  }

  return match.prediction ? 'success' : 'neutral'
}

const closedMatchClass = (match: PredictionMatch) => {
  if (match.canPredict) {
    return 'border-default'
  }

  if (match.prediction?.status !== 'evaluated') {
    return 'border-muted bg-muted/20'
  }

  return match.prediction.totalPoints > 0
    ? 'border-green-500 bg-green-50/80 dark:bg-green-950/20'
    : 'border-red-500 bg-red-50/80 dark:bg-red-950/20'
}

const savePrediction = async (match: PredictionMatch) => {
  const draft = ensureDraftScore(match)

  if (!draft || draft.home === null || draft.away === null) {
    toast.add({
      title: 'Marcador incompleto',
      description: 'Ingresa goles para ambos equipos.',
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  savingMatchId.value = match.id

  try {
    const body: Record<string, unknown> = {
      matchId: match.id,
      predictedHomeGoals: Number(draft.home),
      predictedAwayGoals: Number(draft.away)
    }

    if (isKnockoutMatch(match) && draft.home === draft.away) {
      if (draft.extraHome === null || draft.extraAway === null) {
        toast.add({
          title: 'Tiempo extra incompleto',
          description: 'Ingresa el marcador tras tiempos extra.',
          color: 'warning',
          icon: 'i-lucide-circle-alert'
        })
        return
      }

      body.predictedExtraTimeHomeGoals = Number(draft.extraHome)
      body.predictedExtraTimeAwayGoals = Number(draft.extraAway)

      if (draft.extraHome === draft.extraAway) {
        if (draft.penaltyHome === null || draft.penaltyAway === null || !draft.penaltyWinner) {
          toast.add({
            title: 'Penales incompletos',
            description: 'Ingresa marcador y ganador por penales.',
            color: 'warning',
            icon: 'i-lucide-circle-alert'
          })
          return
        }

        body.predictedPenaltyHomeGoals = Number(draft.penaltyHome)
        body.predictedPenaltyAwayGoals = Number(draft.penaltyAway)
        body.predictedPenaltyWinner = draft.penaltyWinner
      }
    }

    if (match.prediction) {
      await $fetch(`/api/predictions/${match.prediction.id}`, {
        method: 'PUT',
        body,
        credentials: 'include'
      })
    } else {
      await $fetch('/api/predictions', {
        method: 'POST',
        body,
        credentials: 'include'
      })
    }

    toast.add({
      title: 'Pronóstico guardado',
      color: 'success',
      icon: 'i-lucide-check'
    })
    await refresh()
  } catch {
    toast.add({
      title: 'No se pudo guardar',
      description: match.lockReason || 'El pronóstico no está disponible para edición.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingMatchId.value = null
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-list-checks"
          label="Participantes"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Mis pronósticos
        </h1>
      </div>

      <UCard>
        <div
          v-if="pending"
          class="py-10 text-center text-muted"
        >
          Cargando partidos...
        </div>

        <div
          v-else-if="matches.length === 0"
          class="py-10 text-center text-muted"
        >
          No hay partidos disponibles.
        </div>

        <div
          v-else
          class="space-y-8"
        >
          <section
            v-for="group in groupedMatches"
            :key="group.key"
            class="space-y-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="group.icon"
                  class="size-5 text-muted"
                />
                <h2 class="text-base font-semibold text-highlighted">
                  {{ group.title }}
                </h2>
              </div>
              <UBadge
                :label="String(group.matches.length)"
                :color="group.color"
                variant="subtle"
              />
            </div>

            <div
              v-if="group.matches.length === 0"
              class="rounded-md border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
            >
              Sin partidos en esta sección.
            </div>

            <div
              v-else
              class="space-y-5"
            >
              <section
                v-for="stageGroup in group.stages"
                :key="`${group.key}-${stageGroup.stage}`"
                class="space-y-3"
              >
                <div class="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                  <h3 class="text-sm font-semibold text-highlighted">
                    {{ stageGroup.title }}
                  </h3>
                  <UBadge
                    :label="String(stageGroup.matches.length)"
                    color="neutral"
                    variant="subtle"
                  />
                </div>

                <article
                  v-for="match in stageGroup.matches"
                  :key="match.id"
                  class="grid gap-4 rounded-md border border-l-4 px-4 py-4 lg:grid-cols-[1fr_260px_180px]"
                  :class="closedMatchClass(match)"
                >
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge
                        :label="`Partido ${match.matchNumber}`"
                        color="neutral"
                        variant="subtle"
                      />
                      <UBadge
                        v-if="match.group"
                        :label="`Grupo ${match.group}`"
                        variant="subtle"
                      />
                    </div>

                    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-lg font-semibold text-highlighted">
                      <TeamIdentity
                        :team="teamFor(match, 'home')"
                        :fallback="slotFor(match, 'home')"
                        compact
                      />
                      <span class="text-sm font-medium text-muted">vs</span>
                      <TeamIdentity
                        :team="teamFor(match, 'away')"
                        :fallback="slotFor(match, 'away')"
                        compact
                      />
                    </div>

                    <p class="text-sm text-muted">
                      {{ new Date(match.kickoffAt).toLocaleString() }}
                      <span v-if="match.stadium"> · {{ match.stadium }}</span>
                      <span v-if="match.city"> · {{ match.city }}</span>
                    </p>

                    <p
                      v-if="match.lockReason"
                      class="text-sm text-muted"
                    >
                      {{ match.lockReason }}
                    </p>
                  </div>

                  <div class="space-y-3">
                    <div>
                      <p class="mb-1 text-xs font-medium text-muted">
                        90 minutos
                      </p>
                      <div class="flex items-center gap-3">
                        <UInput
                          v-model.number="ensureDraftScore(match).home"
                          type="number"
                          min="0"
                          class="w-24"
                          :disabled="!match.canPredict"
                          :aria-label="`Goles de ${displayTeam(match, 'home')} en 90 minutos`"
                        />
                        <span class="text-muted">-</span>
                        <UInput
                          v-model.number="ensureDraftScore(match).away"
                          type="number"
                          min="0"
                          class="w-24"
                          :disabled="!match.canPredict"
                          :aria-label="`Goles de ${displayTeam(match, 'away')} en 90 minutos`"
                        />
                      </div>
                    </div>

                    <div v-if="isKnockoutMatch(match) && isRegularDrawDraft(match)">
                      <p class="mb-1 text-xs font-medium text-muted">
                        Tras tiempos extra
                      </p>
                      <div class="flex items-center gap-3">
                        <UInput
                          v-model.number="ensureDraftScore(match).extraHome"
                          type="number"
                          min="0"
                          class="w-24"
                          :disabled="!match.canPredict"
                          :aria-label="`Goles de ${displayTeam(match, 'home')} tras tiempos extra`"
                        />
                        <span class="text-muted">-</span>
                        <UInput
                          v-model.number="ensureDraftScore(match).extraAway"
                          type="number"
                          min="0"
                          class="w-24"
                          :disabled="!match.canPredict"
                          :aria-label="`Goles de ${displayTeam(match, 'away')} tras tiempos extra`"
                        />
                      </div>
                    </div>

                    <div v-if="isKnockoutMatch(match) && isRegularDrawDraft(match) && isExtraTimeDrawDraft(match)">
                      <p class="mb-1 text-xs font-medium text-muted">
                        Penales
                      </p>
                      <div class="flex flex-wrap items-center gap-3">
                        <UInput
                          v-model.number="ensureDraftScore(match).penaltyHome"
                          type="number"
                          min="0"
                          class="w-20"
                          :disabled="!match.canPredict"
                          :aria-label="`Penales de ${displayTeam(match, 'home')}`"
                        />
                        <span class="text-muted">-</span>
                        <UInput
                          v-model.number="ensureDraftScore(match).penaltyAway"
                          type="number"
                          min="0"
                          class="w-20"
                          :disabled="!match.canPredict"
                          :aria-label="`Penales de ${displayTeam(match, 'away')}`"
                        />
                        <USelect
                          v-model="ensureDraftScore(match).penaltyWinner"
                          :items="penaltyWinnerOptions"
                          placeholder="Ganador"
                          class="w-32"
                          :disabled="!match.canPredict"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-start gap-2 lg:items-end">
                    <UBadge
                      :label="predictionStatusLabel(match)"
                      :color="predictionStatusColor(match)"
                      variant="subtle"
                    />

                    <p
                      v-if="match.prediction?.status === 'evaluated'"
                      class="text-sm font-medium text-highlighted"
                    >
                      {{ match.prediction.totalPoints }} / {{ match.prediction.possiblePoints }} pts
                    </p>
                    <p
                      v-else-if="match.prediction"
                      class="text-sm text-muted"
                    >
                      {{ predictionScoreLabel(match) }}
                    </p>

                    <UButton
                      v-if="match.canPredict"
                      icon="i-lucide-save"
                      :label="match.prediction ? 'Actualizar' : 'Guardar'"
                      :loading="savingMatchId === match.id"
                      @click="savePrediction(match)"
                    />
                  </div>
                </article>
              </section>
            </div>
          </section>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
