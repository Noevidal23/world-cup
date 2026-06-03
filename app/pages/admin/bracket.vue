<script setup lang="ts">
import type { AdminMatch, AdminTeamOption, KnockoutSlotRow } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface BracketResponse {
  slots: KnockoutSlotRow[]
  matches: AdminMatch[]
  teams: AdminTeamOption[]
}

const toast = useToast()
const selectedSlot = ref<KnockoutSlotRow | null>(null)
const saving = ref(false)
const form = reactive({
  teamId: '',
  overrideReason: ''
})

const { data, pending, refresh } = await useFetch<BracketResponse>('/api/knockout/bracket', {
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  credentials: 'include'
})

const teamOptions = computed(() => (data.value?.teams || []).map(team => ({
  label: `${team.name} (${team.fifaCode})`,
  value: team.id
})))

const slots = computed(() => data.value?.slots || [])
const matchesByNumber = computed(() => new Map((data.value?.matches || []).map(match => [match.matchNumber, match])))

const openSlot = (slot: KnockoutSlotRow) => {
  selectedSlot.value = slot
  form.teamId = slot.teamId || ''
  form.overrideReason = slot.overrideReason || ''
}

const recalculate = async () => {
  saving.value = true
  try {
    await $fetch('/api/admin/knockout/recalculate', { method: 'POST', credentials: 'include' })
    toast.add({ title: 'Llave recalculada', color: 'success', icon: 'i-lucide-refresh-cw' })
    await refresh()
  } catch {
    toast.add({ title: 'No se pudo recalcular la llave', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

const saveOverride = async () => {
  if (!selectedSlot.value) return

  saving.value = true
  try {
    await $fetch(`/api/admin/knockout/slots/${selectedSlot.value.id}/manual-override`, {
      method: 'PUT',
      body: form,
      credentials: 'include'
    })
    toast.add({ title: 'Slot actualizado', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch {
    toast.add({ title: 'No se pudo actualizar el slot', color: 'error', icon: 'i-lucide-circle-alert' })
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
            Administración de llave
          </h1>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          label="Recalcular llave"
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
            Cargando slots...
          </div>
          <div
            v-else-if="slots.length === 0"
            class="py-10 text-center text-muted"
          >
            No hay slots calculados.
          </div>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="w-full min-w-[760px] text-left text-sm">
              <thead class="border-b border-default text-muted">
                <tr>
                  <th class="px-2 py-2">
                    Partido
                  </th>
                  <th class="px-2 py-2">
                    Fase
                  </th>
                  <th class="px-2 py-2">
                    Slot
                  </th>
                  <th class="px-2 py-2">
                    Origen
                  </th>
                  <th class="px-2 py-2">
                    Equipo
                  </th>
                  <th class="px-2 py-2 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="slot in slots"
                  :key="slot.id"
                  class="border-b border-default last:border-b-0"
                >
                  <td class="px-2 py-2 font-semibold">
                    <div class="space-y-1">
                      <p>{{ slot.matchNumber }}</p>
                      <UBadge
                        v-if="matchesByNumber.get(slot.matchNumber) && getFinalScoreLabel(matchesByNumber.get(slot.matchNumber)!)"
                        :label="`Final · ${getFinalScoreLabel(matchesByNumber.get(slot.matchNumber)!)}`"
                        color="primary"
                        variant="solid"
                        size="sm"
                      />
                    </div>
                  </td>
                  <td class="px-2 py-2">
                    {{ slot.stage }}
                  </td>
                  <td class="px-2 py-2">
                    {{ slot.slot }}
                  </td>
                  <td class="px-2 py-2">
                    {{ slot.sourceLabel }}
                  </td>
                  <td class="px-2 py-2 font-medium text-highlighted">
                    {{ slot.team?.name || 'Pendiente' }}
                  </td>
                  <td class="px-2 py-2 text-right">
                    <UButton
                      icon="i-lucide-pencil"
                      label="Ajustar"
                      color="neutral"
                      variant="ghost"
                      @click="openSlot(slot)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard class="xl:sticky xl:top-28">
          <template #header>
            <h2 class="font-semibold text-highlighted">
              {{ selectedSlot ? 'Ajuste manual' : 'Selecciona un slot' }}
            </h2>
          </template>

          <form
            v-if="selectedSlot"
            class="space-y-4"
            @submit.prevent="saveOverride"
          >
            <div class="rounded-md bg-muted p-3 text-sm">
              <p class="font-medium text-highlighted">
                Partido {{ selectedSlot.matchNumber }} · {{ selectedSlot.slot }}
              </p>
              <p class="text-muted">
                {{ selectedSlot.sourceLabel }}
              </p>
              <UBadge
                v-if="matchesByNumber.get(selectedSlot.matchNumber) && getFinalScoreLabel(matchesByNumber.get(selectedSlot.matchNumber)!)"
                :label="`Final · ${getFinalScoreLabel(matchesByNumber.get(selectedSlot.matchNumber)!)}`"
                color="primary"
                variant="solid"
                size="sm"
                class="mt-2"
              />
            </div>

            <UFormField label="Equipo">
              <USelect
                v-model="form.teamId"
                :items="teamOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Motivo"
              required
            >
              <UTextarea
                v-model="form.overrideReason"
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              icon="i-lucide-save"
              label="Guardar ajuste"
              :loading="saving"
              block
            />
          </form>

          <p
            v-else
            class="text-sm text-muted"
          >
            El ajuste manual actualiza el partido, conserva pronósticos y queda auditado.
          </p>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
