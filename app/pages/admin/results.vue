<script setup lang="ts">
import type { AdminMatch } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface MatchesResponse {
  matches: AdminMatch[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const statusFilter = ref('all')
const page = ref(1)
const pageSize = ref(20)
const selectedMatch = ref<AdminMatch | null>(null)
const savingPartial = ref(false)
const savingFinal = ref(false)
const recalculating = ref(false)

const partialForm = reactive({
  partialHomeGoals: 0,
  partialAwayGoals: 0,
  partialMinute: null as number | null,
  partialStatusText: ''
})

const finalForm = reactive({
  regularHomeGoals: 0,
  regularAwayGoals: 0,
  extraTimeHomeGoals: null as number | null,
  extraTimeAwayGoals: null as number | null,
  penaltyHomeGoals: null as number | null,
  penaltyAwayGoals: null as number | null,
  penaltyWinner: 'home' as 'home' | 'away'
})

const query = computed(() => ({
  status: statusFilter.value,
  page: page.value,
  pageSize: pageSize.value
}))

const { data, pending, refresh } = await useFetch<MatchesResponse>('/api/admin/matches', {
  query,
  headers,
  credentials: 'include'
})

watch(statusFilter, () => {
  page.value = 1
})

const matches = computed(() => data.value?.matches || [])
const pagination = computed(() => data.value?.pagination || {
  page: 1,
  pageSize: pageSize.value,
  total: 0,
  pageCount: 1
})

const statusOptions = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Programados', value: 'scheduled' },
  { label: 'Partido iniciado', value: 'live' },
  { label: 'Finalizados', value: 'finished' },
  { label: 'Cancelados', value: 'cancelled' }
]

const penaltyWinnerOptions = [
  { label: 'Local', value: 'home' },
  { label: 'Visitante', value: 'away' }
]

const displayTeam = (match: AdminMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.homeTeam : match.awayTeam
  const slot = side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

  return team ? team.name : slot || 'Pendiente'
}

const teamFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeTeam : match.awayTeam

const slotFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

const openMatch = (match: AdminMatch) => {
  selectedMatch.value = match
  partialForm.partialHomeGoals = match.partialHomeGoals ?? 0
  partialForm.partialAwayGoals = match.partialAwayGoals ?? 0
  partialForm.partialMinute = match.partialMinute ?? null
  partialForm.partialStatusText = match.partialStatusText || ''
  finalForm.regularHomeGoals = match.regularHomeGoals ?? 0
  finalForm.regularAwayGoals = match.regularAwayGoals ?? 0
  finalForm.extraTimeHomeGoals = match.extraTimeHomeGoals ?? null
  finalForm.extraTimeAwayGoals = match.extraTimeAwayGoals ?? null
  finalForm.penaltyHomeGoals = match.penaltyHomeGoals ?? null
  finalForm.penaltyAwayGoals = match.penaltyAwayGoals ?? null
  finalForm.penaltyWinner = match.penaltyWinner === 'away' ? 'away' : 'home'
}

const refreshSelected = async () => {
  await refresh()

  if (!selectedMatch.value) {
    return
  }

  const updated = matches.value.find(match => match.id === selectedMatch.value?.id)

  if (updated) {
    openMatch(updated)
  }
}

const submitPartial = async () => {
  if (!selectedMatch.value) {
    return
  }

  savingPartial.value = true

  try {
    await $fetch(`/api/admin/matches/${selectedMatch.value.id}/partial-result`, {
      method: 'PUT',
      body: partialForm,
      credentials: 'include'
    })
    toast.add({ title: 'Resultado parcial guardado', color: 'success', icon: 'i-lucide-check' })
    await refreshSelected()
  } catch {
    toast.add({ title: 'No se pudo guardar el parcial', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    savingPartial.value = false
  }
}

const submitFinal = async () => {
  if (!selectedMatch.value) {
    return
  }

  savingFinal.value = true

  try {
    await $fetch(`/api/admin/matches/${selectedMatch.value.id}/final-result`, {
      method: 'PUT',
      body: finalForm,
      credentials: 'include'
    })
    toast.add({ title: 'Resultado final guardado', color: 'success', icon: 'i-lucide-check' })
    await refreshSelected()
  } catch {
    toast.add({
      title: 'No se pudo guardar el resultado final',
      description: 'Revisa los marcadores requeridos para el modo del partido.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingFinal.value = false
  }
}

const recalculatePoints = async () => {
  if (!selectedMatch.value) {
    return
  }

  recalculating.value = true

  try {
    await $fetch(`/api/admin/matches/${selectedMatch.value.id}/recalculate-points`, {
      method: 'POST',
      credentials: 'include'
    })
    toast.add({
      title: 'Puntos recalculados',
      description: 'Los pronósticos del partido y el ranking general fueron actualizados.',
      color: 'success',
      icon: 'i-lucide-refresh-cw'
    })
  } catch {
    toast.add({ title: 'No se pudo solicitar el recálculo', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    recalculating.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-clipboard-check"
          label="Solo administradores"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Resultados
        </h1>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section class="space-y-4">
          <UCard>
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              class="w-full md:w-64"
            />
          </UCard>

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
              No hay partidos con ese filtro.
            </div>
            <div
              v-else
              class="divide-y divide-default"
            >
              <button
                v-for="match in matches"
                :key="match.id"
                type="button"
                class="grid w-full gap-3 px-1 py-4 text-left md:grid-cols-[80px_1fr_160px]"
                @click="openMatch(match)"
              >
                <span class="font-semibold text-highlighted">#{{ match.matchNumber }}</span>
                <span>
                  <span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-highlighted">
                    <TeamIdentity
                      :team="teamFor(match, 'home')"
                      :fallback="slotFor(match, 'home')"
                    />
                    <span class="text-xs text-muted">vs</span>
                    <TeamIdentity
                      :team="teamFor(match, 'away')"
                      :fallback="slotFor(match, 'away')"
                    />
                  </span>
                  <span class="text-sm text-muted">
                    {{ new Date(match.kickoffAt).toLocaleString() }}
                  </span>
                  <span
                    v-if="match.partialStatusText"
                    class="block text-sm text-muted"
                  >
                    Parcial: {{ match.partialHomeGoals }}-{{ match.partialAwayGoals }} · {{ match.partialStatusText }}
                  </span>
                </span>
                <span class="flex items-start justify-start md:justify-end">
                  <UBadge
                    :label="match.status"
                    variant="subtle"
                  />
                </span>
              </button>
            </div>

            <template #footer>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-muted">
                  {{ pagination.total }} partidos · página {{ pagination.page }} de {{ pagination.pageCount }}
                </p>
                <div class="flex gap-2">
                  <UButton
                    icon="i-lucide-chevron-left"
                    label="Anterior"
                    color="neutral"
                    variant="subtle"
                    :disabled="page <= 1"
                    @click="page--"
                  />
                  <UButton
                    label="Siguiente"
                    trailing-icon="i-lucide-chevron-right"
                    color="neutral"
                    variant="subtle"
                    :disabled="page >= pagination.pageCount"
                    @click="page++"
                  />
                </div>
              </div>
            </template>
          </UCard>
        </section>

        <aside>
          <UCard class="xl:sticky xl:top-28">
            <template #header>
              <h2 class="font-semibold text-highlighted">
                {{ selectedMatch ? `Partido ${selectedMatch.matchNumber}` : 'Selecciona un partido' }}
              </h2>
            </template>

            <div
              v-if="selectedMatch"
              class="space-y-6"
            >
              <div class="rounded-md bg-muted p-3 text-sm">
                <p class="font-medium text-highlighted">
                  {{ displayTeam(selectedMatch, 'home') }} vs {{ displayTeam(selectedMatch, 'away') }}
                </p>
                <p class="text-muted">
                  Modo: {{ selectedMatch.scoringMode }}
                </p>
              </div>

              <form
                class="space-y-3"
                @submit.prevent="submitPartial"
              >
                <h3 class="font-medium text-highlighted">
                  Resultado parcial
                </h3>
                <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <UInput
                    v-model.number="partialForm.partialHomeGoals"
                    type="number"
                    min="0"
                  />
                  <span class="text-muted">-</span>
                  <UInput
                    v-model.number="partialForm.partialAwayGoals"
                    type="number"
                    min="0"
                  />
                </div>
                <UInput
                  v-model.number="partialForm.partialMinute"
                  type="number"
                  min="0"
                  max="130"
                  placeholder="Minuto"
                />
                <UInput
                  v-model="partialForm.partialStatusText"
                  placeholder="Texto de estado"
                />
                <UButton
                  type="submit"
                  label="Guardar parcial"
                  icon="i-lucide-save"
                  :loading="savingPartial"
                  block
                />
              </form>

              <form
                class="space-y-3"
                @submit.prevent="submitFinal"
              >
                <h3 class="font-medium text-highlighted">
                  Resultado final
                </h3>
                <p class="text-sm text-muted">
                  90 minutos
                </p>
                <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <UInput
                    v-model.number="finalForm.regularHomeGoals"
                    type="number"
                    min="0"
                  />
                  <span class="text-muted">-</span>
                  <UInput
                    v-model.number="finalForm.regularAwayGoals"
                    type="number"
                    min="0"
                  />
                </div>

                <template v-if="selectedMatch.scoringMode === 'extra_time' || selectedMatch.scoringMode === 'penalties_final'">
                  <p class="text-sm text-muted">
                    Tiempos extra
                  </p>
                  <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <UInput
                      v-model.number="finalForm.extraTimeHomeGoals"
                      type="number"
                      min="0"
                    />
                    <span class="text-muted">-</span>
                    <UInput
                      v-model.number="finalForm.extraTimeAwayGoals"
                      type="number"
                      min="0"
                    />
                  </div>
                </template>

                <template v-if="selectedMatch.scoringMode === 'penalties_final'">
                  <p class="text-sm text-muted">
                    Penales
                  </p>
                  <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <UInput
                      v-model.number="finalForm.penaltyHomeGoals"
                      type="number"
                      min="0"
                    />
                    <span class="text-muted">-</span>
                    <UInput
                      v-model.number="finalForm.penaltyAwayGoals"
                      type="number"
                      min="0"
                    />
                  </div>
                  <USelect
                    v-model="finalForm.penaltyWinner"
                    :items="penaltyWinnerOptions"
                    class="w-full"
                  />
                </template>

                <UButton
                  type="submit"
                  label="Guardar y marcar finalizado"
                  icon="i-lucide-flag"
                  :loading="savingFinal"
                  block
                />
              </form>

              <UButton
                label="Recalcular puntos"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="subtle"
                :loading="recalculating"
                block
                @click="recalculatePoints"
              />
            </div>

            <p
              v-else
              class="text-sm text-muted"
            >
              Elige un partido para capturar parciales o resultado final.
            </p>
          </UCard>
        </aside>
      </div>
    </div>
  </UContainer>
</template>
