<script setup lang="ts">
import type { BestThirdRow } from '../../../types/domain'

interface BestThirdsResponse {
  thirds: BestThirdRow[]
}

const { data, pending } = await useFetch<BestThirdsResponse>('/api/groups/best-thirds')

const thirds = computed(() => data.value?.thirds || [])

const statusLabel = (row: BestThirdRow) => {
  if (row.qualifiedStatus === 'qualified_best_third') {
    return 'Clasificado momentáneo'
  }

  if (row.qualifiedStatus === 'eliminated') {
    return 'Eliminado momentáneo'
  }

  return 'Pendiente'
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-medal"
          label="8 de 12 clasifican"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Mejores terceros
        </h1>
      </div>

      <UCard>
        <div
          v-if="pending"
          class="py-10 text-center text-muted"
        >
          Cargando terceros...
        </div>
        <div
          v-else-if="thirds.length === 0"
          class="py-10 text-center text-muted"
        >
          Aún no hay terceros calculados.
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-[860px] text-left text-sm">
            <thead class="border-b border-default text-muted">
              <tr>
                <th class="px-2 py-2">
                  Rank
                </th>
                <th class="px-2 py-2">
                  Grupo
                </th>
                <th class="px-2 py-2">
                  Equipo
                </th>
                <th class="px-2 py-2">
                  Pts
                </th>
                <th class="px-2 py-2">
                  PJ
                </th>
                <th class="px-2 py-2">
                  GF
                </th>
                <th class="px-2 py-2">
                  GC
                </th>
                <th class="px-2 py-2">
                  DG
                </th>
                <th class="px-2 py-2">
                  Fair play
                </th>
                <th class="px-2 py-2">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in thirds"
                :key="row.id"
                class="border-b border-default last:border-b-0"
              >
                <td class="px-2 py-2 font-semibold">
                  {{ row.automaticRank }}
                </td>
                <td class="px-2 py-2">
                  {{ row.group }}
                </td>
                <td class="px-2 py-2 font-medium text-highlighted">
                  {{ row.team?.name || row.teamId }}
                </td>
                <td class="px-2 py-2 font-semibold">
                  {{ row.points }}
                </td>
                <td class="px-2 py-2">
                  {{ row.played }}
                </td>
                <td class="px-2 py-2">
                  {{ row.goalsFor }}
                </td>
                <td class="px-2 py-2">
                  {{ row.goalsAgainst }}
                </td>
                <td class="px-2 py-2">
                  {{ row.goalDifference }}
                </td>
                <td class="px-2 py-2">
                  {{ row.fairPlayPoints }}
                </td>
                <td class="px-2 py-2">
                  <UBadge
                    :label="statusLabel(row)"
                    :color="row.qualifiedStatus === 'qualified_best_third' ? 'success' : 'neutral'"
                    variant="subtle"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
