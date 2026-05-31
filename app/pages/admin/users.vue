<script setup lang="ts">
import type { AdminUser, UserRole, UserStatus } from '../../../types/domain'

definePageMeta({
  middleware: 'admin'
})

interface UsersResponse {
  users: AdminUser[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

type PanelMode = 'create' | 'edit' | 'reset'

const toast = useToast()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const search = ref('')
const roleFilter = ref<UserRole | 'all'>('all')
const statusFilter = ref<UserStatus | 'all'>('all')
const page = ref(1)
const pageSize = ref(10)
const panelMode = ref<PanelMode>('create')
const selectedUser = ref<AdminUser | null>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'participant' as UserRole,
  status: 'active' as UserStatus
})

const resetForm = reactive({
  password: ''
})

const query = computed(() => ({
  search: search.value,
  role: roleFilter.value,
  status: statusFilter.value,
  page: page.value,
  pageSize: pageSize.value
}))

const { data, pending, refresh } = await useFetch<UsersResponse>('/api/users', {
  query,
  headers,
  credentials: 'include'
})

watch([search, roleFilter, statusFilter], () => {
  page.value = 1
})

const users = computed(() => data.value?.users || [])
const pagination = computed(() => data.value?.pagination || {
  page: 1,
  pageSize: pageSize.value,
  total: 0,
  pageCount: 1
})

const roleOptions: Array<{ label: string, value: UserRole | 'all' }> = [
  { label: 'Todos los roles', value: 'all' },
  { label: 'Participantes', value: 'participant' },
  { label: 'Administradores', value: 'admin' }
]

const statusOptions: Array<{ label: string, value: UserStatus | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' }
]

const userRoleOptions: Array<{ label: string, value: UserRole }> = [
  { label: 'Participante', value: 'participant' },
  { label: 'Administrador', value: 'admin' }
]

const userStatusOptions: Array<{ label: string, value: UserStatus }> = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' }
]

const resetFormState = () => {
  form.name = ''
  form.username = ''
  form.email = ''
  form.password = ''
  form.role = 'participant'
  form.status = 'active'
}

const openCreate = (role: UserRole = 'participant') => {
  selectedUser.value = null
  panelMode.value = 'create'
  resetFormState()
  form.role = role
}

const openEdit = (user: AdminUser) => {
  selectedUser.value = user
  panelMode.value = 'edit'
  form.name = user.name
  form.username = user.username
  form.email = user.email
  form.password = ''
  form.role = user.role
  form.status = user.status
}

const openReset = (user: AdminUser) => {
  selectedUser.value = user
  panelMode.value = 'reset'
  resetForm.password = ''
}

const notifyError = (title: string) => {
  toast.add({
    title,
    description: 'Revisa los datos e intenta de nuevo.',
    color: 'error',
    icon: 'i-lucide-circle-alert'
  })
}

const submitUser = async () => {
  saving.value = true

  try {
    if (panelMode.value === 'create') {
      await $fetch('/api/users', {
        method: 'POST',
        body: form,
        credentials: 'include'
      })
      toast.add({ title: 'Usuario creado', color: 'success', icon: 'i-lucide-check' })
      openCreate()
    } else if (selectedUser.value) {
      await $fetch(`/api/users/${selectedUser.value.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          username: form.username,
          email: form.email,
          role: form.role,
          status: form.status
        },
        credentials: 'include'
      })
      toast.add({ title: 'Usuario actualizado', color: 'success', icon: 'i-lucide-check' })
    }

    await refresh()
  } catch {
    notifyError(panelMode.value === 'create' ? 'No se pudo crear el usuario' : 'No se pudo actualizar el usuario')
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (user: AdminUser) => {
  const nextStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active'

  try {
    await $fetch(`/api/users/${user.id}/status`, {
      method: 'PATCH',
      body: { status: nextStatus },
      credentials: 'include'
    })
    toast.add({
      title: nextStatus === 'active' ? 'Usuario activado' : 'Usuario desactivado',
      color: 'success',
      icon: 'i-lucide-check'
    })
    await refresh()
  } catch {
    notifyError('No se pudo cambiar el estado')
  }
}

const submitResetPassword = async () => {
  if (!selectedUser.value) {
    return
  }

  saving.value = true

  try {
    await $fetch(`/api/users/${selectedUser.value.id}/reset-password`, {
      method: 'PATCH',
      body: resetForm,
      credentials: 'include'
    })
    toast.add({ title: 'Contraseña actualizada', color: 'success', icon: 'i-lucide-key-round' })
    resetForm.password = ''
  } catch {
    notifyError('No se pudo resetear la contraseña')
  } finally {
    saving.value = false
  }
}

const roleLabel = (role: UserRole) => role === 'admin' ? 'Administrador' : 'Participante'
const statusLabel = (status: UserStatus) => status === 'active' ? 'Activo' : 'Inactivo'
const statusColor = (status: UserStatus) => status === 'active' ? 'success' : 'neutral'
const roleColor = (role: UserRole) => role === 'admin' ? 'primary' : 'neutral'
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <UBadge
            icon="i-lucide-shield"
            label="Solo administradores"
            variant="subtle"
          />
          <h1 class="text-3xl font-semibold text-highlighted">
            Administración de usuarios
          </h1>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-user-plus"
            label="Crear participante"
            @click="openCreate('participant')"
          />
          <UButton
            icon="i-lucide-shield-plus"
            label="Crear administrador"
            color="neutral"
            variant="subtle"
            @click="openCreate('admin')"
          />
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section class="space-y-4">
          <UCard>
            <div class="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Buscar por nombre, usuario o email"
              />

              <USelect
                v-model="roleFilter"
                :items="roleOptions"
              />

              <USelect
                v-model="statusFilter"
                :items="statusOptions"
              />
            </div>
          </UCard>

          <UCard>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px] text-left text-sm">
                <thead class="border-b border-default text-muted">
                  <tr>
                    <th class="px-3 py-3 font-medium">
                      Nombre
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Usuario
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Rol
                    </th>
                    <th class="px-3 py-3 font-medium">
                      Estado
                    </th>
                    <th class="px-3 py-3 text-right font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td
                      colspan="5"
                      class="px-3 py-10 text-center text-muted"
                    >
                      Cargando usuarios...
                    </td>
                  </tr>
                  <tr v-else-if="users.length === 0">
                    <td
                      colspan="5"
                      class="px-3 py-10 text-center text-muted"
                    >
                      No hay usuarios con esos filtros.
                    </td>
                  </tr>
                  <template v-else>
                    <tr
                      v-for="userItem in users"
                      :key="userItem.id"
                      class="border-b border-default last:border-b-0"
                    >
                      <td class="px-3 py-3">
                        <div>
                          <p class="font-medium text-highlighted">
                            {{ userItem.name }}
                          </p>
                          <p class="text-xs text-muted">
                            {{ userItem.email }}
                          </p>
                        </div>
                      </td>
                      <td class="px-3 py-3 text-muted">
                        {{ userItem.username }}
                      </td>
                      <td class="px-3 py-3">
                        <UBadge
                          :label="roleLabel(userItem.role)"
                          :color="roleColor(userItem.role)"
                          variant="subtle"
                        />
                      </td>
                      <td class="px-3 py-3">
                        <UBadge
                          :label="statusLabel(userItem.status)"
                          :color="statusColor(userItem.status)"
                          variant="subtle"
                        />
                      </td>
                      <td class="px-3 py-3">
                        <div class="flex justify-end gap-1">
                          <UButton
                            icon="i-lucide-pencil"
                            aria-label="Editar"
                            color="neutral"
                            variant="ghost"
                            @click="openEdit(userItem)"
                          />
                          <UButton
                            icon="i-lucide-key-round"
                            aria-label="Resetear contraseña"
                            color="neutral"
                            variant="ghost"
                            @click="openReset(userItem)"
                          />
                          <UButton
                            :icon="userItem.status === 'active' ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                            :aria-label="userItem.status === 'active' ? 'Desactivar' : 'Activar'"
                            color="neutral"
                            variant="ghost"
                            @click="toggleStatus(userItem)"
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
                  {{ pagination.total }} usuarios · página {{ pagination.page }} de {{ pagination.pageCount }}
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
                  :name="panelMode === 'reset' ? 'i-lucide-key-round' : 'i-lucide-user-round-cog'"
                  class="size-5 text-primary"
                />
                <h2 class="font-semibold text-highlighted">
                  {{ panelMode === 'create' ? 'Crear usuario' : panelMode === 'edit' ? 'Editar usuario' : 'Resetear contraseña' }}
                </h2>
              </div>
            </template>

            <form
              v-if="panelMode !== 'reset'"
              class="space-y-4"
              @submit.prevent="submitUser"
            >
              <UFormField
                label="Nombre"
                required
              >
                <UInput
                  v-model="form.name"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Usuario"
                required
              >
                <UInput
                  v-model="form.username"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Email"
                required
              >
                <UInput
                  v-model="form.email"
                  type="email"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="panelMode === 'create'"
                label="Contraseña inicial"
                required
              >
                <UInput
                  v-model="form.password"
                  type="password"
                  autocomplete="new-password"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Rol">
                <USelect
                  v-model="form.role"
                  :items="userRoleOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Estado">
                <USelect
                  v-model="form.status"
                  :items="userStatusOptions"
                  class="w-full"
                />
              </UFormField>

              <UButton
                type="submit"
                :label="panelMode === 'create' ? 'Crear usuario' : 'Guardar cambios'"
                icon="i-lucide-save"
                :loading="saving"
                block
              />
            </form>

            <form
              v-else
              class="space-y-4"
              @submit.prevent="submitResetPassword"
            >
              <div class="rounded-md bg-muted p-3 text-sm">
                <p class="font-medium text-highlighted">
                  {{ selectedUser?.name }}
                </p>
                <p class="text-muted">
                  {{ selectedUser?.email }}
                </p>
              </div>

              <UFormField
                label="Nueva contraseña"
                required
              >
                <UInput
                  v-model="resetForm.password"
                  type="password"
                  autocomplete="new-password"
                  class="w-full"
                />
              </UFormField>

              <UButton
                type="submit"
                label="Actualizar contraseña"
                icon="i-lucide-key-round"
                :loading="saving"
                block
              />
            </form>
          </UCard>
        </aside>
      </div>
    </div>
  </UContainer>
</template>
