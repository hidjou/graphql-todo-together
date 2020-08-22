const { gql } = require('apollo-server')

module.exports = gql`
  type Task {
    uuid: String!
    content: String!
    done: Boolean!
    createdAt: String!
    User: User
  }
  type User {
    email: String!
    uuid: String!
    firstName: String!
    lastName: String!
    fullName: String!
    createdAt: String!
    token: String
  }
  type Query {
    getTasks: [Task]!
    login(email: String!, password: String!): User!
  }
  type Mutation {
    register(
      email: String!
      firstName: String!
      lastName: String!
      password: String!
      confirmPassword: String!
    ): User!
    createTask(content: String!): Task!
    toggleTask(uuid: String!): Task!
  }
  type Subscription {
    task: Task!
  }
`
