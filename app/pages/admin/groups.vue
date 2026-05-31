<script setup lang="ts">
import type { GroupStandingRow } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface StandingsResponse {
  groups: Record<string, GroupStandingRow[]>
}

const toast = useToast()
const recalculating = ref(false)
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const { data, pending, refresh } = await useFetch<StandingsResponse>('/api/groups/standings', {
  headers,
  credentials: 'include'
})

const groups = computed(() => Object.entries(data.value?.groups || {}))

const statusLabel = (status: GroupStandingRow['qualifiedStatus']) => ({
  pending: 'Pendiente',
  qualified_direct: 'Clasificado',
  possible_best_third: 'Mejor tercero posible',
  qualified_best_third: 'Mejor tercero',
  eliminated: 'Eliminado'
}[status])

const recalculate = async () => {
  recalculating.value = true

  try {
    const result = await $fetch<{ groupsUpdated: number, standingsUpdated: number }>('/api/admin/groups/recalculate', {
      method: 'POST',
      credentials: 'include'
    })

    toast.add({
      title: 'Tablas recalculadas',
      description: `${result.groupsUpdated} grupos · ${result.standingsUpdated} posiciones actualizadas.`,
      color: 'success',
      icon: 'i-lucide-refresh-cw'
    })
    await refresh()
  } catch {
    toast.add({
      title: 'No se pudieron recalcular las tablas',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    recalculating.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <UBadge
            icon="i-lucide-shield"
            label="Solo administradores"
            variant="subtle"
          />
          <h1 class="text-3xl font-semibold text-highlighted">
            Administración de grupos
          </h1>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          label="Recalcular tablas"
          :loading="recalculating"
          @click="recalculate"
        />
      </div>

      <div
        v-if="pending"
        class="py-10 text-center text-muted"
      >
        Cargando tablas...
      </div>

      <div
        v-else-if="groups.length === 0"
        class="py-10 text-center text-muted"
      >
        Aún no hay tablas calculadas.
      </div>

      <div
        v-else
        class="grid gap-6 xl:grid-cols-2"
      >
        <UCard
          v-for="[group, rows] in groups"
          :key="group"
        >
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Grupo {{ group }}
            </h2>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left text-sm">
              <thead class="border-b border-default text-muted">
                <tr>
                  <th class="px-2 py-2">
                    Pos
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
                    PG
                  </th>
                  <th class="px-2 py-2">
                    PE
                  </th>
                  <th class="px-2 py-2">
                    PP
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
                  v-for="row in rows"
                  :key="row.id"
                  class="border-b border-default last:border-b-0"
                >
                  <td class="px-2 py-2 font-medium">
                    {{ row.position }}
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
                    {{ row.won }}
                  </td>
                  <td class="px-2 py-2">
                    {{ row.drawn }}
                  </td>
                  <td class="px-2 py-2">
                    {{ row.lost }}
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
                      :label="statusLabel(row.qualifiedStatus)"
                      variant="subtle"
                      color="neutral"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
