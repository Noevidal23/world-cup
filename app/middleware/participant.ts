export default defineNuxtRouteMiddleware(async () => {
  const { user, initialized, fetchMe } = useAuth()

  if (!initialized.value) {
    await fetchMe()
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  if (user.value.role !== 'participant') {
    return navigateTo('/dashboard')
  }
})
