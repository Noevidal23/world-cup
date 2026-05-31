import type { AuthUser } from '../../types/domain'

interface LoginCredentials {
  username: string
  password: string
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const initialized = useState('auth:initialized', () => false)
  const loading = useState('auth:loading', () => false)

  const fetchMe = async () => {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const response = await $fetch<{ user: AuthUser | null }>('/api/auth/me', {
      headers,
      credentials: 'include'
    })

    user.value = response.user
    initialized.value = true

    return user.value
  }

  const login = async (credentials: LoginCredentials) => {
    loading.value = true

    try {
      const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: credentials,
        credentials: 'include'
      })

      user.value = response.user
      initialized.value = true

      return response.user
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })

    user.value = null
    initialized.value = true
    await navigateTo('/login')
  }

  return {
    user: readonly(user),
    initialized: readonly(initialized),
    loading: readonly(loading),
    fetchMe,
    login,
    logout
  }
}
