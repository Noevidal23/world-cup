<script setup lang="ts">
import type { AdminMatch, ParticipantPrediction, UserStatus } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface ParticipantOption {
  id: string
  name: string
  username: string
  email: string
  status: UserStatus
}

interface UserPicksResponse {
  participants: ParticipantOption[]
  selectedParticipant: ParticipantOption | null
  summary: {
    totalPoints: number
    picks: number
    evaluated: number
    winnerPoints: number
    exactScorePoints: number
  } | null
  picks: Array<{
    match: AdminMatch
    prediction: ParticipantPrediction
  }>
}

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const selectedUserId = ref('')

const query = computed(() => ({
  userId: selectedUserId.value || undefined
}))

const { data, pending, error } = await useFetch<UserPicksResponse>('/api/admin/user-picks', {
  query,
  headers,
  credentials: 'include'
})

watch(() => data.value?.selectedParticipant?.id, (userId) => {
  if (userId && !selectedUserId.value) {
    selectedUserId.value = userId
  }
}, { immediate: true })

const participantOptions = computed(() => (data.value?.participants || []).map(participant => ({
  label: `${participant.name} (@${participant.username})`,
  value: participant.id
})))

const stageOrder: AdminMatch['stage'][] = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
]

const stageLabel = (stage: AdminMatch['stage']) => ({
  group: 'Fase de grupos',
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarter_final: 'Cuartos de final',
  semi_final: 'Semifinales',
  third_place: 'Tercer lugar',
  final: 'Final'
}[stage])

const groupedPicks = computed(() => stageOrder
  .map(stage => ({
    stage,
    label: stageLabel(stage),
    value: stage,
    picks: (data.value?.picks || []).filter(item => item.match.stage === stage)
  }))
  .filter(group => group.picks.length > 0)
)

const teamName = (match: AdminMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.homeTeam : match.awayTeam
  const slot = side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

  return team?.name || slot || 'Pendiente'
}

const predictionLabel = (prediction: ParticipantPrediction) => {
  const parts = [`90': ${prediction.predictedHomeGoals}-${prediction.predictedAwayGoals}`]

  if (prediction.predictedExtraTimeHomeGoals !== undefined && prediction.predictedExtraTimeAwayGoals !== undefined) {
    parts.push(`TE: ${prediction.predictedExtraTimeHomeGoals}-${prediction.predictedExtraTimeAwayGoals}`)
  }

  if (prediction.predictedPenaltyHomeGoals !== undefined && prediction.predictedPenaltyAwayGoals !== undefined) {
    parts.push(`Pen: ${prediction.predictedPenaltyHomeGoals}-${prediction.predictedPenaltyAwayGoals}`)
  }

  return parts.join(' · ')
}

const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value))
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-clipboard-list"
          label="Solo lectura"
          color="neutral"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Picks por participante
        </h1>
        <p class="max-w-3xl text-sm text-muted">
          Consulta los pronósticos guardados y el desglose de puntos de cada participante.
        </p>
      </div>

      <UCard>
        <UFormField label="Participante">
          <USelectMenu
            v-model="selectedUserId"
            :items="participantOptions"
            value-key="value"
            label-key="label"
            searchable
            placeholder="Selecciona un participante"
            class="w-full md:max-w-xl"
          />
        </UFormField>
      </UCard>

      <div
        v-if="pending"
        class="py-12 text-center text-muted"
      >
        Cargando picks...
      </div>

      <UAlert
        v-else-if="error"
        title="No se pudo cargar la consulta"
        description="Intenta actualizar la página."
        color="error"
        icon="i-lucide-circle-alert"
      />

      <div
        v-else-if="!data?.selectedParticipant"
        class="rounded-md border border-dashed border-default px-4 py-12 text-center text-muted"
      >
        No hay participantes registrados.
      </div>

      <template v-else>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-highlighted">
              {{ data.selectedParticipant.name }}
            </h2>
            <p class="text-sm text-muted">
              @{{ data.selectedParticipant.username }} · {{ data.selectedParticipant.email }}
            </p>
          </div>
          <UBadge
            :label="data.selectedParticipant.status === 'active' ? 'Activo' : 'Inactivo'"
            :color="data.selectedParticipant.status === 'active' ? 'success' : 'neutral'"
            variant="subtle"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <UCard>
            <p class="text-sm text-muted">
              Puntos totales
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ data.summary?.totalPoints || 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Picks realizados
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ data.summary?.picks || 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Evaluados
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ data.summary?.evaluated || 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Puntos por resultado
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ data.summary?.winnerPoints || 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Puntos por exacto
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ data.summary?.exactScorePoints || 0 }}
            </p>
          </UCard>
        </div>

        <div
          v-if="groupedPicks.length === 0"
          class="rounded-md border border-dashed border-default px-4 py-12 text-center text-muted"
        >
          Este participante todavía no tiene picks registrados.
        </div>

        <UAccordion
          v-else
          :items="groupedPicks"
          type="multiple"
          :default-value="groupedPicks.map(group => group.value)"
          :unmount-on-hide="false"
          :ui="{
            root: 'space-y-4',
            item: 'overflow-hidden rounded-md border border-default',
            header: 'bg-muted/30 px-4',
            trigger: 'py-4 hover:no-underline',
            body: 'border-t border-default p-0'
          }"
        >
          <template #default="{ item }">
            <div class="flex flex-1 items-center justify-between gap-3 text-left">
              <span class="font-semibold text-highlighted">{{ item.label }}</span>
              <UBadge
                :label="String(item.picks.length)"
                color="neutral"
                variant="subtle"
              />
            </div>
          </template>

          <template #body="{ item }">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1050px] text-left text-sm">
                <thead class="border-b border-default text-muted">
                  <tr>
                    <th class="px-4 py-3">
                      Partido
                    </th>
                    <th class="px-4 py-3">
                      Fecha
                    </th>
                    <th class="px-4 py-3">
                      Pick
                    </th>
                    <th class="px-4 py-3">
                      Resultado oficial
                    </th>
                    <th class="px-4 py-3 text-center">
                      Resultado
                    </th>
                    <th class="px-4 py-3 text-center">
                      Exacto
                    </th>
                    <th class="px-4 py-3 text-center">
                      Total
                    </th>
                    <th class="px-4 py-3">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="pick in item.picks"
                    :key="pick.prediction.id"
                    class="border-b border-default last:border-b-0"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-highlighted">
                        #{{ pick.match.matchNumber }} · {{ teamName(pick.match, 'home') }} vs {{ teamName(pick.match, 'away') }}
                      </p>
                      <p
                        v-if="pick.match.group"
                        class="text-xs text-muted"
                      >
                        Grupo {{ pick.match.group }}
                      </p>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-muted">
                      {{ formatDate(pick.match.kickoffAt) }}
                    </td>
                    <td class="px-4 py-3 font-medium text-highlighted">
                      {{ predictionLabel(pick.prediction) }}
                    </td>
                    <td class="px-4 py-3">
                      <UBadge
                        v-if="getFinalScoreLabel(pick.match)"
                        :label="getFinalScoreLabel(pick.match) || ''"
                        color="primary"
                        variant="subtle"
                      />
                      <span
                        v-else
                        class="text-muted"
                      >Pendiente</span>
                    </td>
                    <td class="px-4 py-3 text-center font-medium">
                      {{ pick.prediction.pointsWinner }}
                    </td>
                    <td class="px-4 py-3 text-center font-medium">
                      {{ pick.prediction.pointsExactScore }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <UBadge
                        :label="`${pick.prediction.totalPoints} / ${pick.prediction.possiblePoints}`"
                        :color="pick.prediction.status === 'evaluated' ? 'success' : 'neutral'"
                        variant="solid"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <UBadge
                        :label="pick.prediction.status === 'evaluated' ? 'Evaluado' : 'Pendiente'"
                        :color="pick.prediction.status === 'evaluated' ? 'success' : 'warning'"
                        variant="subtle"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </UAccordion>
      </template>
    </div>
  </UContainer>
</template>
