/* global ARGS */
import crypto from 'crypto'
import {data, users, channel, response} from 'syncano-server'


const {email, token} = ARGS

data.magic_links
  .where('email', email)
  .where('token', token)
  .where('valid_until', 'gt', (new Date()).toISOString())
  .firstOrFail()
  .catch(disallow)
  .then(session => {
    if (session.used_at) {
      return disallow()
    }

    users
      .where('email', email)
      .firstOrFail()
      .then(() => allow(session))
      .catch(() => createUser(session))
  })

function disallow () {
  response('Invalid url.', 400)
}

function allow (session) {
  data.magic_links.update(session.id, {
    used_at: (new Date()).toISOString()
  })

  users
    .where('email', session.email)
    .first()
    .then(({user_key}) => {
      channel.publish(`verify.${session.token}`, {user_key})

      response('Logged in. You can now close this tab.')
    })
}

function createUser (session) {
  const password = crypto.randomBytes(16).toString('hex')

  users.create({
    username: email,
    password,
    email
  }).then(() => allow(session))
}
