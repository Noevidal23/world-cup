<script setup lang="ts">
import type { AdminMatch, KnockoutSlotRow } from '../../types/domain'

interface BracketResponse {
  slots: KnockoutSlotRow[]
  matches: AdminMatch[]
}

const { data, pending } = await useFetch<BracketResponse>('/api/knockout/bracket')

const stages = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
] as const

const stageLabel = (stage: string) => ({
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarter_final: 'Cuartos',
  semi_final: 'Semifinal',
  third_place: 'Tercer lugar',
  final: 'Final'
}[stage] || stage)

const matchesByStage = computed(() => {
  const matches = data.value?.matches || []
  return stages.map(stage => ({
    stage,
    matches: matches.filter(match => match.stage === stage)
  }))
})

const slotsForMatch = (matchNumber: number) =>
  (data.value?.slots || []).filter(slot => slot.matchNumber === matchNumber).sort((a, b) => a.slot.localeCompare(b.slot))
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-git-branch"
          label="Eliminación directa"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Llave eliminatoria
        </h1>
      </div>

      <div
        v-if="pending"
        class="py-10 text-center text-muted"
      >
        Cargando llave...
      </div>

      <div
        v-else
        class="grid gap-6 xl:grid-cols-3"
      >
        <UCard
          v-for="section in matchesByStage"
          :key="section.stage"
        >
          <template #header>
            <h2 class="font-semibold text-highlighted">
              {{ stageLabel(section.stage) }}
            </h2>
          </template>

          <div class="space-y-3">
            <div
              v-if="section.matches.length === 0"
              class="text-sm text-muted"
            >
              Sin partidos.
            </div>
            <div
              v-for="match in section.matches"
              :key="match.id"
              class="rounded-md border border-default p-3"
            >
              <p class="text-sm font-semibold text-highlighted">
                Partido {{ match.matchNumber }}
              </p>
              <div class="mt-2 space-y-2">
                <div
                  v-for="slot in slotsForMatch(match.matchNumber)"
                  :key="slot.id"
                  class="flex items-center justify-between gap-3 text-sm"
                >
                  <span class="text-muted">{{ slot.slot }}</span>
                  <TeamIdentity
                    class="font-medium text-highlighted"
                    :team="slot.team"
                    :fallback="slot.sourceLabel"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
