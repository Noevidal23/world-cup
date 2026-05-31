const required = [
  'MONGODB_URI',
  'SESSION_SECRET'
]

const missing = required.filter(key => !process.env[key])

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

if ((process.env.SESSION_SECRET || '').length < 32) {
  console.error('SESSION_SECRET must be at least 32 characters long')
  process.exit(1)
}

console.log('Production environment variables validated')
