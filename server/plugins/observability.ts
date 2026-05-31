export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500

    if (statusCode < 500) {
      return
    }

    console.error(JSON.stringify({
      level: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      path: event?.path,
      method: event?.method,
      timestamp: new Date().toISOString()
    }))
  })
})
