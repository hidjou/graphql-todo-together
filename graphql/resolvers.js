const { Task, User } = require('../models')
const { UserInputError, AuthenticationError } = require('apollo-server')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const checkForUser = (context) => {
  let user = context.user
  if (!user) throw new AuthenticationError('Unauthenticated')
  return user
}

module.exports = {
  Task: {
    createdAt: (parent) => parent.createdAt.toISOString(),
  },
  User: {
    createdAt: (parent) => parent.createdAt.toISOString(),
    fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
  },
  Query: {
    getTasks: async (parent, args, context) => {
      try {
        checkForUser(context)

        const tasks = await Task.findAll({
          order: [['createdAt', 'DESC']],
          include: User,
        })

        return tasks
      } catch (err) {
        console.log(err)
        throw err
      }
    },
    login: async (_, args) => {
      const { email, password } = args
      const errors = {}

      try {
        if (email.trim() === '') errors.email = 'Email must not be empty'
        if (password === '') errors.password = 'Password must not be empty'
        if (Object.keys(errors).length > 0) throw errors

        const user = await User.findOne({ where: { email } })

        if (!user) throw { auth: 'User not found' }

        console.log(user.toJSON())

        const passwordIsCorrect = await bcrypt.compare(password, user.password)

        if (!passwordIsCorrect) throw { auth: 'Password is incorrect' }

        user.token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: 3600,
        })

        return user
      } catch (err) {
        console.log(err)
        throw new UserInputError('bad input', { errors: err })
      }
    },
  },
  Mutation: {
    register: async (_, args) => {
      const { email, firstName, lastName, password, confirmPassword } = args

      try {
        // TODO: Create user
        const user = await User.create({
          email,
          firstName,
          lastName,
          password,
          confirmPassword,
        })

        // TODO: Return user
        return user
      } catch (err) {
        console.log(err)
        const errors = {}
        if (password !== confirmPassword)
          errors.confirmPassword = 'Passwords must match'
        err.errors.forEach((e) => (errors[e.path] = e.message))
        throw new UserInputError('bad input', { errors })
      }
    },
    createTask: async (_, args, context) => {
      const content = args.content
      try {
        // Check if the user is logged
        let user = checkForUser(context)

        user = await User.findOne({ where: { email: user.email } })

        const task = await Task.create({
          content,
          userId: user.id,
        })

        context.pubsub.publish('TASK_CREATED', { task })

        task.User = user

        return task
      } catch (err) {
        console.log(err)
        throw err
      }
    },
    toggleTask: async (parent, { uuid }, context) => {
      try {
        checkForUser(context)

        const task = await Task.findOne({ where: { uuid }, include: User })
        if (!task) throw new UserInputError('Task not found')

        task.done = !task.done
        await task.save()

        context.pubsub.publish('TASK_UPDATED', { task })

        return task
      } catch (err) {
        throw err
      }
    },
  },
  Subscription: {
    task: {
      subscribe: (_, __, context) => {
        if (!context.user) throw new AuthenticationError('Unauthenticated')
        return context.pubsub.asyncIterator(['TASK_CREATED', 'TASK_UPDATED'])
      },
    },
  },
}
