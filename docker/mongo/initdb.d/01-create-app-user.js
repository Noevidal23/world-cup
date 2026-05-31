/* global db */

const database = process.env.MONGO_INITDB_DATABASE
const username = process.env.MONGO_APP_USERNAME
const password = process.env.MONGO_APP_PASSWORD

if (!database || !username || !password) {
  throw new Error('Mongo app user environment variables are required')
}

const appDb = db.getSiblingDB(database)

appDb.createUser({
  user: username,
  pwd: password,
  roles: [
    {
      role: 'readWrite',
      db: database
    }
  ]
})
