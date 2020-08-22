const { ApolloServer, PubSub } = require('apollo-server')
const { sequelize } = require('./models')
const jwt = require('jsonwebtoken')

require('dotenv').config()

const pubsub = new PubSub()

const typeDefs = require('./graphql/typeDefs')
const resolvers = require('./graphql/resolvers')

const contextMiddleware = (context) => {
  let token
  if (context.req && context.req.headers.authorization) {
    // 'Bearer [token]'
    token = context.req.headers.authorization.split('Bearer ')[1]
  } else if (context.connection && context.connection.context.Authorization) {
    token = context.connection.context.Authorization.split('Bearer ')[1]
  }

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) console.log('Token not valid')
      context.user = decodedToken
    })
  }

  context.pubsub = pubsub

  return context
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: contextMiddleware,
})

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)

  sequelize
    .authenticate()
    .then(() => console.log('Database connected!'))
    .catch((err) => console.log(err))
})
