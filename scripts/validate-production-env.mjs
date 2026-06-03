const getEnv = (...keys) => keys.map(key => process.env[key]).find(value => value && value.length > 0)

const missing = [
  ['MONGODB_URI', 'NUXT_MONGODB_URI'],
  ['SESSION_SECRET', 'NUXT_SESSION_SECRET']
].filter(keys => !getEnv(...keys))
  .map(keys => keys.join(' or '))

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

if ((getEnv('SESSION_SECRET', 'NUXT_SESSION_SECRET') || '').length < 32) {
  console.error('SESSION_SECRET or NUXT_SESSION_SECRET must be at least 32 characters long')
  process.exit(1)
}

if (process.env.SEED_ADMIN_ENABLED === 'true') {
  const seedMissing = ['SEED_ADMIN_USERNAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD']
    .filter(key => !process.env[key])

  if (seedMissing.length > 0) {
    console.error(`Missing required seed environment variables: ${seedMissing.join(', ')}`)
    process.exit(1)
  }

  if ((process.env.SEED_ADMIN_PASSWORD || '').length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters long')
    process.exit(1)
  }
}

console.log('Production environment variables validated')
