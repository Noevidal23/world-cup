<script setup lang="ts">
import type { RankingRow } from '../../types/domain'

interface RankingResponse {
  ranking: RankingRow[]
}

const { user, initialized, fetchMe } = useAuth()
const { data, pending } = await useFetch<RankingResponse>('/api/ranking')

const ranking = computed(() => data.value?.ranking || [])
const myRanking = computed(() => ranking.value.find(row => row.participant.id === user.value?.id))

const formatPercent = (value: number) => `${value.toFixed(2)}%`

onMounted(async () => {
  if (!initialized.value) {
    await fetchMe()
  }
})
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-trophy"
          label="Ranking general"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Tabla general de participantes
        </h1>
      </div>

      <UCard v-if="myRanking">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-muted">
              Mi posición
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              #{{ myRanking.position }} · {{ myRanking.totalPoints }} pts
            </p>
          </div>
          <UButton
            to="/predictions"
            icon="i-lucide-list-checks"
            label="Ver mis pronósticos"
            variant="subtle"
          />
        </div>
      </UCard>

      <UCard>
        <div
          v-if="pending"
          class="py-10 text-center text-muted"
        >
          Cargando ranking...
        </div>
        <div
          v-else-if="ranking.length === 0"
          class="py-10 text-center text-muted"
        >
          Aún no hay pronósticos registrados.
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-[860px] text-left text-sm">
            <thead class="border-b border-default text-muted">
              <tr>
                <th class="px-2 py-2">
                  Posición
                </th>
                <th class="px-2 py-2">
                  Participante
                </th>
                <th class="px-2 py-2">
                  Puntos
                </th>
                <th class="px-2 py-2">
                  Exactos
                </th>
                <th class="px-2 py-2">
                  Resultados acertados
                </th>
                <th class="px-2 py-2">
                  Pronósticos realizados
                </th>
                <th class="px-2 py-2">
                  Efectividad
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in ranking"
                :key="row.id"
                :class="[
                  'border-b border-default last:border-b-0',
                  row.participant.id === user?.id ? 'bg-primary/5' : ''
                ]"
              >
                <td class="px-2 py-3">
                  <UBadge
                    :label="String(row.position)"
                    color="neutral"
                    variant="subtle"
                  />
                </td>
                <td class="px-2 py-3">
                  <div class="font-medium text-highlighted">
                    {{ row.participant.name }}
                  </div>
                  <div class="text-xs text-muted">
                    @{{ row.participant.username }}
                  </div>
                </td>
                <td class="px-2 py-3 text-lg font-semibold text-highlighted">
                  {{ row.totalPoints }}
                </td>
                <td class="px-2 py-3">
                  {{ row.exactScorePoints }}
                </td>
                <td class="px-2 py-3">
                  {{ row.winnerPoints }}
                </td>
                <td class="px-2 py-3">
                  {{ row.predictionsSubmitted }}
                </td>
                <td class="px-2 py-3">
                  {{ formatPercent(row.effectivenessPercentage) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
