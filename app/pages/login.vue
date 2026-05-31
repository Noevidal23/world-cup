<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  middleware: async () => {
    const { user, initialized, fetchMe } = useAuth()

    if (!initialized.value) {
      await fetchMe()
    }

    if (user.value) {
      return navigateTo('/dashboard')
    }
  }
})

const toast = useToast()
const { login, loading } = useAuth()

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña')
})

const credentials = reactive({
  username: '',
  password: ''
})

const onSubmit = async () => {
  try {
    await login(credentials)
    await navigateTo('/dashboard')
  } catch {
    toast.add({
      title: 'No se pudo iniciar sesión',
      description: 'Revisa tu usuario y contraseña.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-highlighted">
            Iniciar sesión
          </h1>
          <p class="text-sm text-muted">
            Accede con tu usuario y contraseña.
          </p>
        </div>
      </template>

      <UForm
        :schema="loginSchema"
        :state="credentials"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Usuario"
          name="username"
          required
        >
          <UInput
            v-model="credentials.username"
            autocomplete="username"
            icon="i-lucide-user"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Contraseña"
          name="password"
          required
        >
          <UInput
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            icon="i-lucide-lock"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          label="Entrar"
          icon="i-lucide-log-in"
          :loading="loading"
          block
        />
      </UForm>
    </UCard>
  </UContainer>
</template>
