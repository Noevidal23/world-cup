<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})

interface HealthResponse {
  ok: boolean
  issues: Array<{
    key: string
    label: string
    count: number
  }>
}

interface ResetDataResponse {
  ok: boolean
  usersPreserved: boolean
  deleted: Record<string, number>
}

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const recalculating = ref(false)
const loadingWorldCupData = ref(false)
const resetting = ref(false)
const resetConfirmationPhrase = 'REINICIAR TORNEO'
const resetForm = reactive({
  password: '',
  confirmation: ''
})

const canResetTournament = computed(() =>
  resetForm.password.length > 0 && resetForm.confirmation.trim() === resetConfirmationPhrase
)

const { data, pending, refresh } = await useFetch<HealthResponse>('/api/admin/tournament/health', {
  headers,
  credentials: 'include'
})

const recalculateAll = async () => {
  recalculating.value = true

  try {
    await $fetch('/api/admin/tournament/recalculate-all', {
      method: 'POST',
      credentials: 'include'
    })
    await refresh()
    toast.add({
      title: 'Torneo recalculado',
      description: 'Ranking, grupos, mejores terceros y llave fueron actualizados.',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch {
    toast.add({
      title: 'No se pudo recalcular',
      description: 'Revisa la configuración y vuelve a intentar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    recalculating.value = false
  }
}

const loadWorldCupData = async () => {
  loadingWorldCupData.value = true

  try {
    const response = await $fetch<{
      counters: {
        teamsCreated: number
        teamsUpdated: number
        matchesCreated: number
        matchesUpdated: number
        slotsCreated: number
        slotsUpdated: number
      }
    }>('/api/admin/tournament/load-worldcup-data', {
      method: 'POST',
      credentials: 'include'
    })

    await refresh()
    toast.add({
      title: 'JSON cargado',
      description: `${response.counters.teamsCreated + response.counters.teamsUpdated} equipos y ${response.counters.matchesCreated + response.counters.matchesUpdated} partidos procesados.`,
      color: 'success',
      icon: 'i-lucide-database'
    })
  } catch {
    toast.add({
      title: 'No se pudo cargar el JSON',
      description: 'Verifica que exista data/worldcup-2026.json y que tenga formato válido.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    loadingWorldCupData.value = false
  }
}

const resetTournamentData = async () => {
  if (!canResetTournament.value) {
    toast.add({
      title: 'Confirmación incompleta',
      description: `Escribe ${resetConfirmationPhrase} y tu contraseña para continuar.`,
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  resetting.value = true

  try {
    const response = await $fetch<ResetDataResponse>('/api/admin/tournament/reset-data', {
      method: 'POST',
      body: {
        password: resetForm.password,
        confirmation: resetForm.confirmation
      },
      credentials: 'include'
    })

    resetForm.password = ''
    resetForm.confirmation = ''
    await refresh()

    toast.add({
      title: 'Datos del torneo reiniciados',
      description: `${response.deleted.matches} partidos y ${response.deleted.predictions} pronósticos eliminados. Los usuarios se conservaron.`,
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
  } catch (error: unknown) {
    const message = error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { message?: string } }).data?.message
      : undefined

    toast.add({
      title: 'No se pudo reiniciar',
      description: message || 'Verifica la contraseña y la frase de confirmación.',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-2">
          <UBadge
            icon="i-lucide-activity"
            label="Operación"
            variant="subtle"
          />
          <h1 class="text-3xl font-semibold text-highlighted">
            Salud del torneo
          </h1>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          label="Recalcular todo"
          :loading="recalculating"
          @click="recalculateAll"
        />
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="issue in data?.issues || []"
          :key="issue.key"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm text-muted">
                {{ issue.label }}
              </p>
              <p class="text-3xl font-semibold text-highlighted">
                {{ issue.count }}
              </p>
            </div>
            <UIcon
              :name="issue.count > 0 ? 'i-lucide-circle-alert' : 'i-lucide-check-circle'"
              :class="issue.count > 0 ? 'size-8 text-warning' : 'size-8 text-success'"
            />
          </div>
        </UCard>
      </div>

      <UCard>
        <div
          v-if="pending"
          class="py-8 text-center text-muted"
        >
          Revisando salud...
        </div>
        <div
          v-else
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium text-highlighted">
              {{ data?.ok ? 'Sin alertas operativas' : 'Hay puntos que requieren atención' }}
            </p>
            <p class="text-sm text-muted">
              El recálculo global queda auditado y no elimina pronósticos.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              to="/admin/results"
              icon="i-lucide-clipboard-check"
              label="Resultados"
              variant="subtle"
            />
            <UButton
              to="/admin/bracket"
              icon="i-lucide-git-branch"
              label="Llave"
              variant="subtle"
            />
            <UButton
              to="/admin/audit"
              icon="i-lucide-shield-check"
              label="Auditoría"
              variant="subtle"
            />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <h2 class="font-semibold text-highlighted">
              Cargar calendario desde JSON
            </h2>
            <p class="text-sm text-muted">
              Importa o actualiza equipos, escudos, partidos y slots desde data/worldcup-2026.json.
            </p>
          </div>
          <UButton
            icon="i-lucide-database"
            label="Cargar datos del Mundial"
            :loading="loadingWorldCupData"
            @click="loadWorldCupData"
          />
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-5 text-error"
            />
            <h2 class="font-semibold text-highlighted">
              Reiniciar datos del torneo
            </h2>
          </div>
        </template>

        <form
          class="grid gap-4 lg:grid-cols-[1fr_280px]"
          @submit.prevent="resetTournamentData"
        >
          <div class="space-y-3">
            <p class="text-sm text-muted">
              Elimina partidos, equipos, pronósticos, ranking, tablas, llave, disciplina, ajustes manuales y auditoría previa. Los usuarios no se eliminan.
            </p>
            <div class="rounded-md border border-error/40 bg-error/10 p-3 text-sm text-highlighted">
              Esta acción está pensada solo para pruebas y deja una nueva auditoría del reinicio.
            </div>
          </div>

          <div class="space-y-3">
            <UFormField label="Contraseña del admin">
              <UInput
                v-model="resetForm.password"
                type="password"
                autocomplete="current-password"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="`Escribe ${resetConfirmationPhrase}`">
              <UInput
                v-model="resetForm.confirmation"
                autocomplete="off"
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              icon="i-lucide-trash-2"
              label="Reiniciar datos"
              color="error"
              block
              :disabled="!canResetTournament"
              :loading="resetting"
            />
          </div>
        </form>
      </UCard>
    </div>
  </UContainer>
</template>
