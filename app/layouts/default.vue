<script setup lang="ts">
const { user, initialized, fetchMe, logout } = useAuth()
const route = useRoute()

const publicNav = [
  { to: '/dashboard', icon: 'i-lucide-layout-dashboard', label: 'Dashboard', auth: true },
  { to: '/predictions', icon: 'i-lucide-list-checks', label: 'Pronósticos', auth: true, role: 'participant' },
  { to: '/participant-predictions', icon: 'i-lucide-users-round', label: 'Otros picks', auth: true, role: 'participant' },
  { to: '/ranking', icon: 'i-lucide-trophy', label: 'Ranking' },
  { to: '/groups', icon: 'i-lucide-table-2', label: 'Grupos' },
  { to: '/bracket', icon: 'i-lucide-git-branch', label: 'Llave' }
]

const adminNav = [
  { to: '/admin/users', icon: 'i-lucide-users', label: 'Usuarios' },
  { to: '/admin/matches', icon: 'i-lucide-calendar-clock', label: 'Partidos' },
  { to: '/admin/results', icon: 'i-lucide-clipboard-check', label: 'Resultados' },
  { to: '/admin/groups', icon: 'i-lucide-table-properties', label: 'Tablas' },
  { to: '/admin/bracket', icon: 'i-lucide-git-branch', label: 'Llave admin' },
  { to: '/admin/audit', icon: 'i-lucide-shield-check', label: 'Auditoría' },
  { to: '/admin/operations', icon: 'i-lucide-activity', label: 'Operación' }
]

const visiblePublicNav = computed(() => publicNav.filter((item) => {
  if (item.auth && !user.value) {
    return false
  }

  if ('role' in item && item.role !== user.value?.role) {
    return false
  }

  return true
}))
const visibleNav = computed(() => [
  ...visiblePublicNav.value,
  ...(user.value?.role === 'admin' ? adminNav : [])
])

const mobileNavItems = computed(() => visibleNav.value.map(item => ({
  label: item.label,
  icon: item.icon,
  to: item.to
})))

const isActive = (to: string) => route.path === to || (to !== '/' && route.path.startsWith(`${to}/`))

onMounted(async () => {
  if (!initialized.value) {
    await fetchMe()
  }
})
</script>

<template>
  <div class="min-h-screen bg-default">
    <UHeader :toggle="false">
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold"
        >
          <AppLogo class="size-8" />
          <span class="hidden font-semibold sm:inline">Quiniela Mundial 2026</span>
          <span class="font-semibold sm:hidden">Quiniela 2026</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
        <UButton
          v-if="user"
          to="/dashboard"
          icon="i-lucide-layout-dashboard"
          :label="user.name"
          class="hidden max-w-48 truncate sm:inline-flex"
          color="neutral"
          variant="ghost"
        />
        <UButton
          v-if="user"
          icon="i-lucide-log-out"
          aria-label="Salir"
          color="neutral"
          variant="ghost"
          @click="logout"
        />
        <UButton
          v-else
          to="/login"
          icon="i-lucide-log-in"
          label="Entrar"
          color="neutral"
          variant="ghost"
        />
        <UDropdownMenu
          v-if="mobileNavItems.length > 0"
          :items="mobileNavItems"
          :content="{ align: 'end', sideOffset: 8 }"
          class="md:hidden"
        >
          <UButton
            icon="i-lucide-menu"
            aria-label="Abrir menú"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>
    </UHeader>

    <div class="hidden border-b border-default bg-default/95 md:block">
      <UContainer>
        <nav class="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <UButton
            v-for="item in visibleNav"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            :color="isActive(item.to) ? 'primary' : 'neutral'"
            :variant="isActive(item.to) ? 'subtle' : 'ghost'"
            size="sm"
            class="shrink-0"
          />
        </nav>
      </UContainer>
    </div>

    <UMain class="min-h-[calc(100vh-4rem)]">
      <slot />
    </UMain>
  </div>
</template>
