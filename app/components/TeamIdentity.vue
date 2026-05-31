<script setup lang="ts">
import type { AdminTeamOption } from '../../types/domain'

defineProps<{
  team?: AdminTeamOption
  fallback?: string
  compact?: boolean
}>()
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2 align-middle">
    <span class="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-default bg-default">
      <img
        v-if="team?.flagUrl"
        :src="team.flagUrl"
        :alt="team.name"
        class="size-full object-contain"
        loading="lazy"
      >
      <UIcon
        v-else
        name="i-lucide-shield"
        class="size-4 text-muted"
      />
    </span>
    <span class="min-w-0 truncate">
      {{ team?.name || fallback || 'Pendiente' }}
      <span
        v-if="team?.fifaCode && !compact"
        class="text-muted"
      >
        ({{ team.fifaCode }})
      </span>
    </span>
  </span>
</template>
