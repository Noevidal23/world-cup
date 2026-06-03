<script setup lang="ts">
import type { AdminMatch, AdminTeamOption, MatchStage, MatchStatus, ScoringMode } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface MatchesResponse {
  matches: AdminMatch[]
  teams: AdminTeamOption[]
  groups: string[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const groupFilter = ref('all')
const stageFilter = ref<MatchStage | 'all'>('all')
const statusFilter = ref<MatchStatus | 'all'>('all')
const page = ref(1)
const pageSize = ref(20)
const selectedMatch = ref<AdminMatch | null>(null)
const saving = ref(false)
const unsetTeamValue = '__unset_team__'

const form = reactive({
  kickoffAt: '',
  stadium: '',
  city: '',
  homeTeamId: unsetTeamValue,
  awayTeamId: unsetTeamValue,
  status: 'scheduled' as MatchStatus,
  scoringMode: 'regular_time' as ScoringMode
})

const query = computed(() => ({
  group: groupFilter.value,
  stage: stageFilter.value,
  status: statusFilter.value,
  page: page.value,
  pageSize: pageSize.value
}))

const { data, pending, refresh } = await useFetch<MatchesResponse>('/api/admin/matches', {
  query,
  headers,
  credentials: 'include'
})

watch([groupFilter, stageFilter, statusFilter], () => {
  page.value = 1
})

const matches = computed(() => data.value?.matches || [])
const teams = computed(() => data.value?.teams || [])
const groups = computed(() => data.value?.groups || [])
const pagination = computed(() => data.value?.pagination || {
  page: 1,
  pageSize: pageSize.value,
  total: 0,
  pageCount: 1
})

const stageOptions: Array<{ label: string, value: MatchStage | 'all' }> = [
  { label: 'Todas las fases', value: 'all' },
  { label: 'Grupos', value: 'group' },
  { label: 'Ronda de 32', value: 'round_of_32' },
  { label: 'Octavos', value: 'round_of_16' },
  { label: 'Cuartos', value: 'quarter_final' },
  { label: 'Semifinal', value: 'semi_final' },
  { label: 'Tercer lugar', value: 'third_place' },
  { label: 'Final', value: 'final' }
]

const statusOptions: Array<{ label: string, value: MatchStatus | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Programado', value: 'scheduled' },
  { label: 'Partido iniciado', value: 'live' },
  { label: 'Finalizado', value: 'finished' },
  { label: 'Cancelado', value: 'cancelled' }
]

const editStatusOptions = statusOptions.filter(option => option.value !== 'all') as Array<{ label: string, value: MatchStatus }>

const scoringModeOptions: Array<{ label: string, value: ScoringMode }> = [
  { label: 'Tiempo regular', value: 'regular_time' },
  { label: 'Tiempo extra', value: 'extra_time' },
  { label: 'Final con penales', value: 'penalties_final' }
]

const teamOptions = computed(() => [
  { label: 'Sin definir', value: unsetTeamValue },
  ...teams.value.map(team => ({
    label: `${team.name} (${team.fifaCode})`,
    value: team.id
  }))
])

const groupOptions = computed(() => [
  { label: 'Todos los grupos', value: 'all' },
  ...groups.value.map(group => ({ label: `Grupo ${group}`, value: group }))
])

const toLocalInputValue = (value: string) => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 16)
}

const openEdit = (match: AdminMatch) => {
  selectedMatch.value = match
  form.kickoffAt = toLocalInputValue(match.kickoffAt)
  form.stadium = match.stadium || ''
  form.city = match.city || ''
  form.homeTeamId = match.homeTeamId || unsetTeamValue
  form.awayTeamId = match.awayTeamId || unsetTeamValue
  form.status = match.status
  form.scoringMode = match.scoringMode
}

const displayTeam = (match: AdminMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.homeTeam : match.awayTeam
  const slot = side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

  return team ? `${team.name} (${team.fifaCode})` : slot || 'Pendiente'
}

const teamFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeTeam : match.awayTeam

const slotFor = (match: AdminMatch, side: 'home' | 'away') =>
  side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

const stageLabel = (stage: MatchStage) => stageOptions.find(option => option.value === stage)?.label || stage
const statusLabel = (status: MatchStatus) => statusOptions.find(option => option.value === status)?.label || status
const scoringModeLabel = (mode: ScoringMode) => scoringModeOptions.find(option => option.value === mode)?.label || mode

const statusColor = (status: MatchStatus) => {
  if (status === 'live') {
    return 'warning'
  }

  if (status === 'finished') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'error'
  }

  return 'neutral'
}

const submitMatch = async () => {
  if (!selectedMatch.value) {
    return
  }

  saving.value = true

  try {
    await $fetch(`/api/admin/matches/${selectedMatch.value.id}`, {
      method: 'PUT',
      body: {
        kickoffAt: new Date(form.kickoffAt).toISOString(),
        stadium: form.stadium,
        city: form.city,
        homeTeamId: form.homeTeamId === unsetTeamValue ? null : form.homeTeamId,
        awayTeamId: form.awayTeamId === unsetTeamValue ? null : form.awayTeamId,
        status: form.status,
        scoringMode: form.scoringMode
      },
      credentials: 'include'
    })

    toast.add({
      title: 'Partido actualizado',
      color: 'success',
      icon: 'i-lucide-check'
    })
    await refresh()
    const updated = matches.value.find(match => match.id === selectedMatch.value?.id)

    if (updated) {
      openEdit(updated)
    }
  } catch {
    toast.add({
      title: 'No se pudo actualizar el partido',
      description: 'Revisa los datos e intenta de nuevo.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-shield"
          label="Solo administradores"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Administración de partidos
        </h1>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section class="space-y-4">
          <UCard>
            <div class="grid gap-3 md:grid-cols-3">
              <USelect
                v-model="groupFilter"
                :items="groupOptions"
              />
              <USelect
                v-model="stageFilter"
                :items="stageOptions"
              />
              <USelect
                v-model="statusFilter"
                :items="statusOptions"
              />
            </div>
          </UCard>

          <UCard>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[900px] text-left text-sm">
                <thead class="border-b border-default text-muted">
                  <tr>
                    <th class="px-3 py-3 font-medium">
                      #
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Partido
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Fase
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Fecha
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Sede
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Estado
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Pronósticos
                    </th>
                    <th class="px-3 py-3 text-right font-medium">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td
                      colspan="8"
                      class="px-3 py-10 text-center text-muted"
                    >
                      Cargando partidos...
                    </td>
                  </tr>
                  <tr v-else-if="matches.length === 0">
                    <td
                      colspan="8"
                      class="px-3 py-10 text-center text-muted"
                    >
                      No hay partidos con esos filtros.
                    </td>
                  </tr>
                  <template v-else>
                    <tr
                      v-for="match in matches"
                      :key="match.id"
                      class="border-b border-default last:border-b-0"
                    >
                      <td class="px-3 py-3 font-medium text-highlighted">
                        {{ match.matchNumber }}
                      </td>
                      <td class="px-3 py-3">
                        <div class="space-y-1">
                          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-highlighted">
                            <TeamIdentity
                              :team="teamFor(match, 'home')"
                              :fallback="slotFor(match, 'home')"
                            />
                            <span class="text-xs text-muted">vs</span>
                            <TeamIdentity
                              :team="teamFor(match, 'away')"
                              :fallback="slotFor(match, 'away')"
                            />
                          </div>
                          <p
                            v-if="!match.homeTeam || !match.awayTeam"
                            class="text-xs text-muted"
                          >
                            Slots: {{ match.homeSlotLabel || 'local pendiente' }} · {{ match.awaySlotLabel || 'visitante pendiente' }}
                          </p>
                          <UBadge
                            v-if="getFinalScoreLabel(match)"
                            :label="`Final · ${getFinalScoreLabel(match)}`"
                            color="primary"
                            variant="solid"
                            size="sm"
                          />
                        </div>
                      </td>
                      <td class="px-3 py-3 text-muted">
                        {{ stageLabel(match.stage) }}<span v-if="match.group"> · {{ match.group }}</span>
                      </td>
                      <td class="px-3 py-3 text-muted">
                        {{ new Date(match.kickoffAt).toLocaleString() }}
                      </td>
                      <td class="px-3 py-3 text-muted">
                        {{ match.stadium || 'Sin estadio' }}<span v-if="match.city"> · {{ match.city }}</span>
                      </td>
                      <td class="px-3 py-3">
                        <UBadge
                          :label="statusLabel(match.status)"
                          :color="statusColor(match.status)"
                          variant="subtle"
                        />
                      </td>
                      <td class="px-3 py-3">
                        <UBadge
                          :label="match.predictionsLocked ? 'Bloqueados' : 'Abiertos'"
                          :color="match.predictionsLocked ? 'warning' : 'success'"
                          variant="subtle"
                        />
                      </td>
                      <td class="px-3 py-3">
                        <div class="flex justify-end">
                          <UButton
                            icon="i-lucide-pencil"
                            label="Editar"
                            color="neutral"
                            variant="ghost"
                            @click="openEdit(match)"
                          />
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
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
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-calendar-clock"
                  class="size-5 text-primary"
                />
                <h2 class="font-semibold text-highlighted">
                  {{ selectedMatch ? `Partido ${selectedMatch.matchNumber}` : 'Selecciona un partido' }}
                </h2>
              </div>
            </template>

            <form
              v-if="selectedMatch"
              class="space-y-4"
              @submit.prevent="submitMatch"
            >
              <div class="rounded-md bg-muted p-3 text-sm">
                <p class="font-medium text-highlighted">
                  {{ displayTeam(selectedMatch, 'home') }} vs {{ displayTeam(selectedMatch, 'away') }}
                </p>
                <p class="text-muted">
                  {{ scoringModeLabel(selectedMatch.scoringMode) }}
                </p>
                <UBadge
                  v-if="getFinalScoreLabel(selectedMatch)"
                  :label="`Final · ${getFinalScoreLabel(selectedMatch)}`"
                  color="primary"
                  variant="solid"
                  size="sm"
                  class="mt-2"
                />
              </div>

              <UFormField label="Fecha y hora">
                <UInput
                  v-model="form.kickoffAt"
                  type="datetime-local"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Estadio">
                <UInput
                  v-model="form.stadium"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Ciudad">
                <UInput
                  v-model="form.city"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Equipo local">
                <USelect
                  v-model="form.homeTeamId"
                  :items="teamOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Equipo visitante">
                <USelect
                  v-model="form.awayTeamId"
                  :items="teamOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Estado">
                <USelect
                  v-model="form.status"
                  :items="editStatusOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Modo de calificación">
                <USelect
                  v-model="form.scoringMode"
                  :items="scoringModeOptions"
                  class="w-full"
                />
              </UFormField>

              <p class="rounded-md bg-muted p-3 text-sm text-muted">
                Los pronósticos se cierran cuando el estado del partido se marca como iniciado.
              </p>

              <UButton
                type="submit"
                label="Guardar partido"
                icon="i-lucide-save"
                :loading="saving"
                block
              />
            </form>

            <p
              v-else
              class="text-sm text-muted"
            >
              Elige un partido de la lista para editar fecha, sede, equipos o bloqueo de pronósticos.
            </p>
          </UCard>
        </aside>
      </div>
    </div>
  </UContainer>
</template>
