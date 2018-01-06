const { getUserId } = require('../utils')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

module.exports = {
  post(parent, { url, description }, ctx, info) {
    const userId = getUserId(ctx)
    return ctx.db.mutation.createLink(
      { data: { url, description, postedBy: { connect: { id: userId } } } },
      info,
    )
  },

  async vote(parent, { linkId }, ctx, info) {
    const userId = getUserId(ctx)
    const linkExists = await ctx.db.exists.Vote({
      user: { id: userId },
      link: { id: linkId },
    })
    if (linkExists) {
      throw new Error(`Already voted for link: ${linkId}`)
    }

    return ctx.db.mutation.createVote(
      {
        data: {
          user: { connect: { id: userId } },
          link: { connect: { id: linkId } },
        },
      },
      info,
    )
  },

  async signup(parent, args, ctx, info) {
    const password = await bcrypt.hash(args.password, 10)
    const user = await ctx.db.mutation.createUser({
      data: { ...args, password },
    })

    return {
      token: jwt.sign({ userId: user.id }, 'replace-this-jwt-secret'),
      user,
    }
  },

  async login(parent, args, ctx, info) {
    const user = await ctx.db.query.user({ where: { email: args.email } })
    if (!user) {
      throw new Error('No such user found')
    }

    const valid = await bcrypt.compare(args.password, user.password)
    if (!valid) {
      throw new Error('Invalid password')
    }

    return {
      token: jwt.sign({ userId: user.id }, 'replace-this-jwt-secret'),
      user,
    }
  },
}