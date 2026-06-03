<script setup lang="ts">
import type { AdminMatch } from '../../types/domain'

definePageMeta({
  middleware: 'auth'
})

interface ParticipantDashboard {
  role: 'participant'
  upcomingMatches: AdminMatch[]
  pendingPredictions: AdminMatch[]
  ranking: {
    totalPoints: number
    rank: number
    predictionsSubmitted: number
    effectivenessPercentage: number
  }
  lastResults: AdminMatch[]
}

interface AdminDashboard {
  role: 'admin'
  todayMatches: AdminMatch[]
  pendingResultMatches: AdminMatch[]
  metrics: {
    predictionsCaptured: number
    activeUsers: number
    groupsCalculated: number
    groupsCompleted: number
  }
  groupStatus: Array<{
    group: string
    teams: number
    qualified: number
    eliminated: number
  }>
  alerts: {
    matchesWithoutResult: number
    matchesWithoutTeams: number
    pendingClassifiers: number
    modifiedResults: number
  }
}

type DashboardResponse = ParticipantDashboard | AdminDashboard

const { user } = useAuth()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const { data, pending } = await useFetch<DashboardResponse>('/api/dashboard', {
  headers,
  credentials: 'include'
})

const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value))

const displayTeam = (match: AdminMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.homeTeam : match.awayTeam
  const slot = side === 'home' ? match.homeSlotLabel : match.awaySlotLabel

  return team?.name || slot || 'Pendiente'
}

const scoreLabel = (match: AdminMatch) => {
  return getFinalScoreLabel(match) || '-'
}

const stageLabel = (stage: AdminMatch['stage']) => {
  const labels: Record<AdminMatch['stage'], string> = {
    group: 'Grupos',
    round_of_32: 'Dieciseisavos',
    round_of_16: 'Octavos',
    quarter_final: 'Cuartos',
    semi_final: 'Semifinal',
    third_place: 'Tercer lugar',
    final: 'Final'
  }

  return labels[stage]
}

const participantDashboard = computed(() => data.value?.role === 'participant' ? data.value : null)
const adminDashboard = computed(() => data.value?.role === 'admin' ? data.value : null)

const adminAlertItems = computed(() => {
  const alerts = adminDashboard.value?.alerts

  if (!alerts) {
    return []
  }

  return [
    {
      label: 'Partidos sin resultado',
      value: alerts.matchesWithoutResult,
      icon: 'i-lucide-circle-alert',
      to: '/admin/results'
    },
    {
      label: 'Partidos sin equipos',
      value: alerts.matchesWithoutTeams,
      icon: 'i-lucide-users-round',
      to: '/admin/matches'
    },
    {
      label: 'Clasificados pendientes',
      value: alerts.pendingClassifiers,
      icon: 'i-lucide-git-branch',
      to: '/admin/bracket'
    },
    {
      label: 'Resultados modificados',
      value: alerts.modifiedResults,
      icon: 'i-lucide-history',
      to: '/admin/audit'
    }
  ]
})
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <UBadge
            :label="user?.role === 'admin' ? 'Administrador' : 'Participante'"
            variant="subtle"
          />
          <h1 class="text-2xl font-semibold text-highlighted sm:text-3xl">
            Dashboard
          </h1>
          <p class="text-sm text-muted sm:text-base">
            Bienvenido, {{ user?.name }}.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/predictions"
            icon="i-lucide-list-checks"
            label="Pronósticos"
            variant="subtle"
          />
          <UButton
            to="/ranking"
            icon="i-lucide-trophy"
            label="Ranking"
            variant="subtle"
          />
        </div>
      </div>

      <div
        v-if="pending"
        class="py-16 text-center text-muted"
      >
        Cargando dashboard...
      </div>

      <template v-else-if="participantDashboard">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UCard>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-muted">
                  Puntos actuales
                </p>
                <p class="text-3xl font-semibold text-highlighted">
                  {{ participantDashboard.ranking.totalPoints }}
                </p>
              </div>
              <UIcon
                name="i-lucide-star"
                class="size-8 text-primary"
              />
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-muted">
                  Posición
                </p>
                <p class="text-3xl font-semibold text-highlighted">
                  {{ participantDashboard.ranking.rank || '-' }}
                </p>
              </div>
              <UIcon
                name="i-lucide-trophy"
                class="size-8 text-primary"
              />
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-muted">
                  Pronósticos
                </p>
                <p class="text-3xl font-semibold text-highlighted">
                  {{ participantDashboard.ranking.predictionsSubmitted }}
                </p>
              </div>
              <UIcon
                name="i-lucide-list-checks"
                class="size-8 text-primary"
              />
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-muted">
                  Efectividad
                </p>
                <p class="text-3xl font-semibold text-highlighted">
                  {{ participantDashboard.ranking.effectivenessPercentage.toFixed(1) }}%
                </p>
              </div>
              <UIcon
                name="i-lucide-gauge"
                class="size-8 text-primary"
              />
            </div>
          </UCard>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-semibold text-highlighted">
                  Próximos partidos
                </h2>
                <UButton
                  to="/predictions"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  aria-label="Ver pronósticos"
                />
              </div>
            </template>
            <div class="divide-y divide-default">
              <div
                v-for="match in participantDashboard.upcomingMatches"
                :key="match.id"
                class="py-3 first:pt-0 last:pb-0"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-highlighted">
                      {{ displayTeam(match, 'home') }} vs {{ displayTeam(match, 'away') }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ stageLabel(match.stage) }} · {{ formatDate(match.kickoffAt) }}
                    </p>
                    <UBadge
                      v-if="getFinalScoreLabel(match)"
                      :label="`Final · ${getFinalScoreLabel(match)}`"
                      color="primary"
                      variant="solid"
                      size="sm"
                      class="mt-1"
                    />
                  </div>
                  <UBadge
                    :label="match.group || match.matchNumber.toString()"
                    color="neutral"
                    variant="subtle"
                  />
                </div>
              </div>
              <div
                v-if="participantDashboard.upcomingMatches.length === 0"
                class="py-8 text-center text-muted"
              >
                No hay próximos partidos.
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-semibold text-highlighted">
                  Pronósticos pendientes
                </h2>
                <UButton
                  to="/predictions"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  aria-label="Capturar pronósticos"
                />
              </div>
            </template>
            <div class="divide-y divide-default">
              <div
                v-for="match in participantDashboard.pendingPredictions"
                :key="match.id"
                class="py-3 first:pt-0 last:pb-0"
              >
                <p class="truncate font-medium text-highlighted">
                  {{ displayTeam(match, 'home') }} vs {{ displayTeam(match, 'away') }}
                </p>
                <p class="text-sm text-muted">
                  {{ formatDate(match.kickoffAt) }}
                </p>
              </div>
              <div
                v-if="participantDashboard.pendingPredictions.length === 0"
                class="py-8 text-center text-muted"
              >
                No tienes pronósticos pendientes disponibles.
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Últimos resultados
            </h2>
          </template>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div
              v-for="match in participantDashboard.lastResults"
              :key="match.id"
              class="rounded border border-default p-3"
            >
              <p class="truncate text-sm font-medium text-highlighted">
                {{ displayTeam(match, 'home') }}
              </p>
              <p class="py-2 text-center text-2xl font-semibold text-highlighted">
                {{ scoreLabel(match) }}
              </p>
              <p class="truncate text-sm font-medium text-highlighted">
                {{ displayTeam(match, 'away') }}
              </p>
            </div>
            <div
              v-if="participantDashboard.lastResults.length === 0"
              class="py-8 text-center text-muted sm:col-span-2 lg:col-span-5"
            >
              Todavía no hay resultados finales.
            </div>
          </div>
        </UCard>
      </template>

      <template v-else-if="adminDashboard">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UCard>
            <p class="text-sm text-muted">
              Pronósticos capturados
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ adminDashboard.metrics.predictionsCaptured }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Usuarios activos
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ adminDashboard.metrics.activeUsers }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Grupos calculados
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ adminDashboard.metrics.groupsCalculated }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Grupos con clasificados
            </p>
            <p class="text-3xl font-semibold text-highlighted">
              {{ adminDashboard.metrics.groupsCompleted }}
            </p>
          </UCard>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UButton
            v-for="alert in adminAlertItems"
            :key="alert.label"
            :to="alert.to"
            :icon="alert.icon"
            color="neutral"
            variant="outline"
            class="justify-between"
          >
            <span class="truncate">{{ alert.label }}</span>
            <UBadge
              :label="String(alert.value)"
              :color="alert.value > 0 ? 'warning' : 'neutral'"
              variant="subtle"
            />
          </UButton>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-semibold text-highlighted">
                  Partidos de hoy
                </h2>
                <UButton
                  to="/admin/matches"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  aria-label="Ver partidos"
                />
              </div>
            </template>
            <div class="divide-y divide-default">
              <div
                v-for="match in adminDashboard.todayMatches"
                :key="match.id"
                class="py-3 first:pt-0 last:pb-0"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-highlighted">
                      {{ displayTeam(match, 'home') }} vs {{ displayTeam(match, 'away') }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ formatDate(match.kickoffAt) }}
                    </p>
                    <UBadge
                      v-if="getFinalScoreLabel(match)"
                      :label="`Final · ${getFinalScoreLabel(match)}`"
                      color="primary"
                      variant="solid"
                      size="sm"
                      class="mt-1"
                    />
                  </div>
                  <UBadge
                    :label="getFinalScoreLabel(match) ? `Final · ${getFinalScoreLabel(match)}` : match.status"
                    color="neutral"
                    :variant="getFinalScoreLabel(match) ? 'solid' : 'subtle'"
                  />
                </div>
              </div>
              <div
                v-if="adminDashboard.todayMatches.length === 0"
                class="py-8 text-center text-muted"
              >
                No hay partidos programados hoy.
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-semibold text-highlighted">
                  Pendientes de resultado
                </h2>
                <UButton
                  to="/admin/results"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  aria-label="Capturar resultados"
                />
              </div>
            </template>
            <div class="divide-y divide-default">
              <div
                v-for="match in adminDashboard.pendingResultMatches"
                :key="match.id"
                class="py-3 first:pt-0 last:pb-0"
              >
                <p class="truncate font-medium text-highlighted">
                  #{{ match.matchNumber }} · {{ displayTeam(match, 'home') }} vs {{ displayTeam(match, 'away') }}
                </p>
                <p class="text-sm text-muted">
                  {{ stageLabel(match.stage) }} · {{ formatDate(match.kickoffAt) }}
                </p>
              </div>
              <div
                v-if="adminDashboard.pendingResultMatches.length === 0"
                class="py-8 text-center text-muted"
              >
                No hay partidos atrasados sin resultado.
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">
                Estado de grupos
              </h2>
              <UButton
                to="/admin/groups"
                icon="i-lucide-arrow-right"
                color="neutral"
                variant="ghost"
                aria-label="Ver grupos"
              />
            </div>
          </template>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="group in adminDashboard.groupStatus"
              :key="group.group"
              class="rounded border border-default p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-semibold text-highlighted">
                  Grupo {{ group.group }}
                </p>
                <UBadge
                  :label="`${group.qualified} clasificados`"
                  color="neutral"
                  variant="subtle"
                />
              </div>
              <p class="mt-2 text-sm text-muted">
                {{ group.teams }} equipos · {{ group.eliminated }} eliminados
              </p>
            </div>
            <div
              v-if="adminDashboard.groupStatus.length === 0"
              class="py-8 text-center text-muted sm:col-span-2 lg:col-span-4"
            >
              Las tablas de grupos aún no se han calculado.
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </UContainer>
</template>
