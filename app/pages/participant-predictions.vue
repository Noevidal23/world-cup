<script setup lang="ts">
import type { AdminMatch, ParticipantPrediction } from '../../types/domain'

definePageMeta({
  middleware: 'participant'
})

interface SharedPredictionRow {
  participant: {
    id: string
    name: string
    username: string
  }
  prediction: ParticipantPrediction
}

interface SharedPredictionMatch {
  match: AdminMatch
  predictions: SharedPredictionRow[]
}

interface SharedPredictionsResponse {
  matches: SharedPredictionMatch[]
}

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const { data, pending } = await useFetch<SharedPredictionsResponse>('/api/predictions/shared', {
  headers,
  credentials: 'include'
})

const matches = computed(() => data.value?.matches || [])

const stageOrder: AdminMatch['stage'][] = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
]

const stageLabel = (stage: AdminMatch['stage']) => {
  const labels: Record<AdminMatch['stage'], string> = {
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

const groupedMatches = computed(() => stageOrder
  .map(stage => ({
    stage,
    title: stageLabel(stage),
    matches: matches.value
      .filter(item => item.match.stage === stage)
      .map(item => ({
        ...item,
        value: item.match.id,
        label: `Partido ${item.match.matchNumber}`
      }))
  }))
  .filter(group => group.matches.length > 0)
)

const teamFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeTeam : match.awayTeam

const slotFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

const predictionScoreLabel = (prediction: ParticipantPrediction) => {
  const parts = [`90': ${prediction.predictedHomeGoals}-${prediction.predictedAwayGoals}`]

  if (prediction.predictedExtraTimeHomeGoals !== undefined && prediction.predictedExtraTimeAwayGoals !== undefined) {
    parts.push(`TE: ${prediction.predictedExtraTimeHomeGoals}-${prediction.predictedExtraTimeAwayGoals}`)
  }

  if (prediction.predictedPenaltyHomeGoals !== undefined && prediction.predictedPenaltyAwayGoals !== undefined) {
    parts.push(`Pen: ${prediction.predictedPenaltyHomeGoals}-${prediction.predictedPenaltyAwayGoals}`)
  }

  return parts.join(' · ')
}

const pointsLabel = (prediction: ParticipantPrediction) =>
  prediction.status === 'evaluated'
    ? `${prediction.totalPoints} / ${prediction.possiblePoints} pts`
    : 'Pendiente'
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-users-round"
          label="Participantes"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Pronósticos de otros participantes
        </h1>
        <p class="max-w-2xl text-sm text-muted">
          Solo se muestran pronósticos de partidos cerrados o ya iniciados para mantener justa la competencia.
        </p>
      </div>

      <div
        v-if="pending"
        class="py-10 text-center text-muted"
      >
        Cargando pronósticos...
      </div>

      <div
        v-else-if="matches.length === 0"
        class="rounded-md border border-dashed border-default px-4 py-10 text-center text-muted"
      >
        Aún no hay pronósticos visibles de otros participantes.
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <section
          v-for="group in groupedMatches"
          :key="group.stage"
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ group.title }}
            </h2>
            <UBadge
              :label="String(group.matches.length)"
              variant="subtle"
            />
          </div>

          <UAccordion
            :items="group.matches"
            type="multiple"
            :unmount-on-hide="false"
            :ui="{
              root: 'space-y-3',
              item: 'overflow-hidden rounded-md border border-default bg-default',
              header: 'px-4',
              trigger: 'py-4 hover:no-underline',
              body: 'border-t border-default px-4 py-4'
            }"
          >
            <template #default="{ item, open }">
              <div class="flex min-w-0 flex-1 flex-col gap-3 text-left lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      :label="`Partido ${item.match.matchNumber}`"
                      color="neutral"
                      variant="subtle"
                    />
                    <UBadge
                      v-if="item.match.group"
                      :label="`Grupo ${item.match.group}`"
                      variant="subtle"
                    />
                    <UBadge
                      :label="`${item.predictions.length} picks`"
                      color="neutral"
                      variant="outline"
                    />
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 font-semibold text-highlighted">
                    <TeamIdentity
                      :team="teamFor(item.match, 'home')"
                      :fallback="slotFor(item.match, 'home')"
                      compact
                    />
                    <span class="text-sm font-medium text-muted">vs</span>
                    <TeamIdentity
                      :team="teamFor(item.match, 'away')"
                      :fallback="slotFor(item.match, 'away')"
                      compact
                    />
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 lg:justify-end">
                  <p class="text-sm text-muted">
                    {{ new Date(item.match.kickoffAt).toLocaleString() }}
                  </p>
                  <UBadge
                    v-if="getFinalScoreLabel(item.match)"
                    :label="`Final · ${getFinalScoreLabel(item.match)}`"
                    color="primary"
                    variant="solid"
                    size="sm"
                  />
                  <span class="text-xs font-medium text-muted">
                    {{ open ? 'Ocultar picks' : 'Ver picks' }}
                  </span>
                </div>
              </div>
            </template>

            <template #body="{ item }">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[620px] text-left text-sm">
                  <thead class="border-b border-default text-muted">
                    <tr>
                      <th class="px-2 py-2">
                        Participante
                      </th>
                      <th class="px-2 py-2">
                        Pronóstico
                      </th>
                      <th class="px-2 py-2">
                        Puntos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in item.predictions"
                      :key="row.prediction.id"
                      class="border-b border-default last:border-b-0"
                    >
                      <td class="px-2 py-3">
                        <p class="font-medium text-highlighted">
                          {{ row.participant.name }}
                        </p>
                        <p class="text-xs text-muted">
                          @{{ row.participant.username }}
                        </p>
                      </td>
                      <td class="px-2 py-3 font-medium text-highlighted">
                        {{ predictionScoreLabel(row.prediction) }}
                      </td>
                      <td class="px-2 py-3">
                        <UBadge
                          :label="pointsLabel(row.prediction)"
                          :color="row.prediction.status === 'evaluated' ? 'success' : 'neutral'"
                          variant="subtle"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </UAccordion>
        </section>
      </div>
    </div>
  </UContainer>
</template>
