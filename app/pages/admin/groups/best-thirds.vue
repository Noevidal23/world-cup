<script setup lang="ts">
import type { BestThirdRow } from '../../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface BestThirdsResponse {
  thirds: BestThirdRow[]
}

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const selected = ref<BestThirdRow | null>(null)
const saving = ref(false)

const overrideForm = reactive({
  qualifiedStatus: 'qualified_best_third' as 'qualified_best_third' | 'possible_best_third' | 'eliminated',
  sortOrder: null as number | null,
  justification: ''
})

const { data, pending, refresh } = await useFetch<BestThirdsResponse>('/api/groups/best-thirds', {
  headers,
  credentials: 'include'
})

const thirds = computed(() => data.value?.thirds || [])

const statusOptions = [
  { label: 'Forzar clasificado', value: 'qualified_best_third' },
  { label: 'Marcar posible tercero', value: 'possible_best_third' },
  { label: 'Forzar eliminado', value: 'eliminated' }
]

const openOverride = (row: BestThirdRow) => {
  selected.value = row
  overrideForm.qualifiedStatus = row.override?.qualifiedStatus || (row.qualifiedStatus === 'eliminated' ? 'eliminated' : 'qualified_best_third')
  overrideForm.sortOrder = row.override?.sortOrder || null
  overrideForm.justification = row.override?.justification || ''
}

const recalculate = async () => {
  saving.value = true

  try {
    await $fetch('/api/admin/groups/recalculate-best-thirds', {
      method: 'POST',
      credentials: 'include'
    })
    toast.add({ title: 'Mejores terceros recalculados', color: 'success', icon: 'i-lucide-refresh-cw' })
    await refresh()
  } catch {
    toast.add({ title: 'No se pudo recalcular', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

const saveOverride = async () => {
  if (!selected.value) {
    return
  }

  saving.value = true

  try {
    await $fetch('/api/admin/groups/recalculate-best-thirds', {
      method: 'POST',
      body: {
        override: {
          teamId: selected.value.teamId,
          qualifiedStatus: overrideForm.qualifiedStatus,
          sortOrder: overrideForm.sortOrder,
          justification: overrideForm.justification
        }
      },
      credentials: 'include'
    })
    toast.add({ title: 'Override aplicado', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch {
    toast.add({ title: 'No se pudo aplicar el override', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
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
            Mejores terceros
          </h1>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          label="Recalcular mejores terceros"
          :loading="saving"
          @click="recalculate"
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
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
                    DG
                  </th>
                  <th class="px-2 py-2">
                    GF
                  </th>
                  <th class="px-2 py-2">
                    Fair play
                  </th>
                  <th class="px-2 py-2">
                    Estado
                  </th>
                  <th class="px-2 py-2 text-right">
                    Acción
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
                    {{ row.goalDifference }}
                  </td>
                  <td class="px-2 py-2">
                    {{ row.goalsFor }}
                  </td>
                  <td class="px-2 py-2">
                    {{ row.fairPlayPoints }}
                  </td>
                  <td class="px-2 py-2">
                    <UBadge
                      :label="row.qualifiedStatus"
                      :color="row.qualifiedStatus === 'qualified_best_third' ? 'success' : 'neutral'"
                      variant="subtle"
                    />
                  </td>
                  <td class="px-2 py-2 text-right">
                    <UButton
                      icon="i-lucide-pencil"
                      label="Override"
                      color="neutral"
                      variant="ghost"
                      @click="openOverride(row)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              {{ selected ? 'Override manual' : 'Selecciona un tercero' }}
            </h2>
          </template>

          <form
            v-if="selected"
            class="space-y-4"
            @submit.prevent="saveOverride"
          >
            <div class="rounded-md bg-muted p-3 text-sm">
              <p class="font-medium text-highlighted">
                {{ selected.team?.name || selected.teamId }}
              </p>
              <p class="text-muted">
                Grupo {{ selected.group }} · rank {{ selected.automaticRank }}
              </p>
            </div>

            <UFormField label="Estado forzado">
              <USelect
                v-model="overrideForm.qualifiedStatus"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Orden manual para desempate">
              <UInput
                v-model.number="overrideForm.sortOrder"
                type="number"
                min="1"
                max="12"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Justificación"
              required
            >
              <UTextarea
                v-model="overrideForm.justification"
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              label="Aplicar override"
              icon="i-lucide-save"
              :loading="saving"
              block
            />
          </form>

          <p
            v-else
            class="text-sm text-muted"
          >
            El override queda auditado y puede usarse para sorteos o correcciones operativas.
          </p>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
