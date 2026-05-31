<script setup lang="ts">
import type { AdminUser, AuditLogRow } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface AuditResponse {
  logs: AuditLogRow[]
  filters: {
    actions: string[]
    entities: string[]
  }
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

interface UsersResponse {
  users: AdminUser[]
}

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const userFilter = ref('all')
const actionFilter = ref('all')
const entityFilter = ref('all')
const from = ref('')
const to = ref('')
const page = ref(1)
const pageSize = ref(20)

const query = computed(() => ({
  userId: userFilter.value,
  action: actionFilter.value,
  entity: entityFilter.value,
  from: from.value || undefined,
  to: to.value || undefined,
  page: page.value,
  pageSize: pageSize.value
}))

const { data, pending } = await useFetch<AuditResponse>('/api/admin/audit', {
  query,
  headers,
  credentials: 'include'
})

const { data: usersData } = await useFetch<UsersResponse>('/api/users', {
  query: { pageSize: 100 },
  headers,
  credentials: 'include'
})

watch([userFilter, actionFilter, entityFilter, from, to], () => {
  page.value = 1
})

const logs = computed(() => data.value?.logs || [])
const pagination = computed(() => data.value?.pagination || {
  page: 1,
  pageSize: pageSize.value,
  total: 0,
  pageCount: 1
})

const userOptions = computed(() => [
  { label: 'Todos los usuarios', value: 'all' },
  ...(usersData.value?.users || []).map(user => ({
    label: `${user.name} (@${user.username})`,
    value: user.id
  }))
])

const actionOptions = computed(() => [
  { label: 'Todas las acciones', value: 'all' },
  ...(data.value?.filters.actions || []).map(action => ({
    label: action,
    value: action
  }))
])

const entityOptions = computed(() => [
  { label: 'Todas las entidades', value: 'all' },
  ...(data.value?.filters.entities || []).map(entity => ({
    label: entity,
    value: entity
  }))
])

const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value))

const formatJson = (value: unknown) => {
  if (!value) {
    return '-'
  }

  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="space-y-2">
        <UBadge
          icon="i-lucide-shield-check"
          label="Auditoría"
          variant="subtle"
        />
        <h1 class="text-3xl font-semibold text-highlighted">
          Registro de auditoría
        </h1>
      </div>

      <UCard>
        <div class="grid gap-3 md:grid-cols-5">
          <USelect
            v-model="userFilter"
            :items="userOptions"
            value-key="value"
            label-key="label"
          />
          <USelect
            v-model="actionFilter"
            :items="actionOptions"
            value-key="value"
            label-key="label"
          />
          <USelect
            v-model="entityFilter"
            :items="entityOptions"
            value-key="value"
            label-key="label"
          />
          <UInput
            v-model="from"
            type="date"
            aria-label="Fecha inicial"
          />
          <UInput
            v-model="to"
            type="date"
            aria-label="Fecha final"
          />
        </div>
      </UCard>

      <UCard>
        <div
          v-if="pending"
          class="py-10 text-center text-muted"
        >
          Cargando auditoría...
        </div>
        <div
          v-else-if="logs.length === 0"
          class="py-10 text-center text-muted"
        >
          No hay eventos para los filtros seleccionados.
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-[1100px] text-left text-sm">
            <thead class="border-b border-default text-muted">
              <tr>
                <th class="px-2 py-2">
                  Fecha
                </th>
                <th class="px-2 py-2">
                  Usuario
                </th>
                <th class="px-2 py-2">
                  Acción
                </th>
                <th class="px-2 py-2">
                  Entidad
                </th>
                <th class="px-2 py-2">
                  IP
                </th>
                <th class="px-2 py-2">
                  Antes
                </th>
                <th class="px-2 py-2">
                  Después
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in logs"
                :key="log.id"
                class="border-b border-default align-top last:border-b-0"
              >
                <td class="px-2 py-3 whitespace-nowrap">
                  {{ formatDate(log.createdAt) }}
                </td>
                <td class="px-2 py-3">
                  <div class="font-medium text-highlighted">
                    {{ log.user?.name || 'Sistema' }}
                  </div>
                  <div
                    v-if="log.user"
                    class="text-xs text-muted"
                  >
                    @{{ log.user.username }}
                  </div>
                </td>
                <td class="px-2 py-3">
                  <UBadge
                    :label="log.action"
                    color="neutral"
                    variant="subtle"
                  />
                </td>
                <td class="px-2 py-3">
                  <div class="font-medium text-highlighted">
                    {{ log.entity }}
                  </div>
                  <div class="max-w-[180px] truncate text-xs text-muted">
                    {{ log.entityId || '-' }}
                  </div>
                </td>
                <td class="px-2 py-3">
                  {{ log.ip || '-' }}
                </td>
                <td class="px-2 py-3">
                  <pre class="max-h-40 max-w-[260px] overflow-auto rounded bg-muted p-2 text-xs">{{ formatJson(log.before) }}</pre>
                </td>
                <td class="px-2 py-3">
                  <pre class="max-h-40 max-w-[260px] overflow-auto rounded bg-muted p-2 text-xs">{{ formatJson(log.after) }}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <div class="flex items-center justify-between gap-3">
        <p class="text-sm text-muted">
          {{ pagination.total }} eventos
        </p>
        <UPagination
          v-model:page="page"
          :items-per-page="pagination.pageSize"
          :total="pagination.total"
        />
      </div>
    </div>
  </UContainer>
</template>
