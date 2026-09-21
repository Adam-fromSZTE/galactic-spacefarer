const { before, beforeEach, after, test, mock } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')

// Always use local users and console emails, even if a .env file exists.
process.env.NODE_ENV = 'development'
process.env.CDS_ENV = 'development'
process.env.CDS_TYPESCRIPT = 'true'
process.env.MAIL_MODE = 'console'
process.env.CDS_REQUIRES_DB_KIND = 'sqlite'
process.env.CDS_REQUIRES_DB_CREDENTIALS_URL = ':memory:'

const cds = require('@sap/cds')
let server
let baseUrl
const emailPreviews = []
const planetXId = '11111111-1111-4111-8111-111111111111'
const planetYId = '22222222-2222-4222-8222-222222222222'

before(async () => {
  mock.method(cds.log('cosmic-mail'), 'info', message => {
    if (message.startsWith('[Preview]')) emailPreviews.push(message)
  })
  server = await cds.server({ in_memory: true, port: 0 })
  baseUrl = `http://localhost:${server.address().port}/odata/v4/spacefarer`
})

beforeEach(() => { emailPreviews.length = 0 })

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve))
  if (cds.db) await cds.db.disconnect()
  mock.restoreAll()
})

function recordUrl(id, active = true) {
  return `/Spacefarers(ID=${id},IsActiveEntity=${active})`
}

function request(path, method = 'GET', data, user = 'pilot-x') {
  const headers = {}
  if (user) headers.Authorization = `Basic ${Buffer.from(`${user}:${user}`).toString('base64')}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  return fetch(baseUrl + path, { method, headers, body: JSON.stringify(data) })
}

test('anonymous users and visitors cannot read spacefarers', async () => {
  assert.equal((await request('/Spacefarers', 'GET', undefined, null)).status, 401)
  assert.equal((await request('/Spacefarers', 'GET', undefined, 'visitor')).status, 403)
})

test('each planet only sees its own records and count', async () => {
  for (const [user, id] of [['pilot-x', planetXId], ['pilot-y', planetYId]]) {
    const response = await request('/Spacefarers?$count=true', 'GET', undefined, user)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body.value.map(row => row.ID), [id])
    assert.equal(body['@odata.count'], 1)
  }
})

test('foreign records cannot be read, changed, deleted or opened as drafts', async () => {
  for (const [user, id] of [['pilot-x', planetYId], ['pilot-y', planetXId]]) {
    assert.equal((await request(recordUrl(id), 'GET', undefined, user)).status, 404)
    for (const method of ['PATCH', 'DELETE']) {
      const data = method === 'PATCH' ? { spacesuitColor: 'Red' } : undefined
      const response = await request(recordUrl(id), method, data, user)
      assert.ok([403, 404].includes(response.status), `${method} returned ${response.status}`)
    }
    const edit = await request(recordUrl(id) + '/SpacefarerService.draftEdit', 'POST', { PreserveChanges: false }, user)
    assert.ok([403, 404].includes(edit.status))
  }
  const own = await request(recordUrl(planetXId))
  assert.equal(own.status, 200)
  assert.equal((await own.json()).spacesuitColor, 'Blue')
})

test('related data cannot be read through a foreign spacefarer', async () => {
  for (const relation of ['department', 'position']) {
    assert.equal((await request(recordUrl(planetYId) + '/' + relation)).status, 404)
    assert.equal((await request(recordUrl(planetXId) + '/' + relation)).status, 200)
  }
})

test('create adds the starter pack, trims text and sends one welcome preview', async () => {
  const id = randomUUID()
  const response = await request('/Spacefarers', 'POST', {
    ID: id, IsActiveEntity: true, name: '  Test Pilot  ', email: '  pilot@example.test  ',
    stardustCollection: 0, wormholeNavigationSkill: 0
  })
  assert.equal(response.status, 201)
  const saved = await (await request(recordUrl(id))).json()
  assert.equal(saved.name, 'Test Pilot')
  assert.equal(saved.email, 'pilot@example.test')
  assert.equal(saved.originPlanet, 'X')
  assert.equal(saved.stardustCollection, 10)
  assert.equal(saved.wormholeNavigationSkill, 1)
  assert.equal(emailPreviews.length, 1)
  assert.match(emailPreviews[0], /pilot@example\.test/)
  assert.match(emailPreviews[0], /Congratulations, Test Pilot!/)

  assert.equal((await request(recordUrl(id), 'PATCH', { spacesuitColor: ' Green ', stardustCollection: 75 })).status, 200)
  const updated = await (await request(recordUrl(id))).json()
  assert.equal(updated.spacesuitColor, 'Green')
  assert.equal(updated.stardustCollection, 75)
  assert.equal(updated.name, 'Test Pilot')
  assert.equal(emailPreviews.length, 1)
  assert.equal((await request(recordUrl(id), 'DELETE')).status, 204)
  assert.equal((await request(recordUrl(id))).status, 404)
})

test('invalid candidates are not saved and get no welcome email', async () => {
  const invalidFields = [
    { name: '  ' }, { email: 'invalid' }, { spacesuitColor: null },
    { stardustCollection: -1 }, { stardustCollection: 1.5 },
    { wormholeNavigationSkill: 101 }, { department_ID: 'MISSING' }
  ]
  for (const fields of invalidFields) {
    const id = randomUUID()
    const response = await request('/Spacefarers', 'POST', {
      ID: id, IsActiveEntity: true, name: 'Invalid Pilot', email: 'invalid@example.test', ...fields
    })
    assert.equal(response.status, 400, JSON.stringify(fields))
    assert.equal((await request(recordUrl(id))).status, 404)
  }
  assert.equal(emailPreviews.length, 0)
})

test('a draft only sends a welcome email when activated', async () => {
  const response = await request('/Spacefarers', 'POST', { IsActiveEntity: false })
  assert.equal(response.status, 201)
  const draft = await response.json()
  assert.equal(draft.originPlanet, 'X')
  assert.equal(emailPreviews.length, 0)

  const path = recordUrl(draft.ID, false)
  assert.equal((await request(path, 'PATCH', { name: 'Draft Pilot', email: 'draft@example.test' })).status, 200)
  assert.equal(emailPreviews.length, 0)
  assert.equal((await request(path + '/SpacefarerService.draftActivate', 'POST', {})).status, 201)
  assert.equal(emailPreviews.length, 1)
  assert.equal((await request(recordUrl(draft.ID))).status, 200)
  assert.equal((await request(recordUrl(draft.ID), 'DELETE')).status, 204)
})

test('an invalid draft cannot overwrite active data and can be discarded', async () => {
  const active = recordUrl(planetXId)
  const draft = recordUrl(planetXId, false)
  assert.equal((await request(active + '/SpacefarerService.draftEdit', 'POST', { PreserveChanges: false })).status, 201)
  assert.equal((await request(draft, 'PATCH', { wormholeNavigationSkill: 101 })).status, 200)
  assert.equal((await request(draft + '/SpacefarerService.draftActivate', 'POST', {})).status, 400)
  assert.equal((await (await request(active)).json()).wormholeNavigationSkill, 35)
  assert.equal((await request(draft, 'DELETE')).status, 204)
  assert.equal((await (await request(active)).json()).wormholeNavigationSkill, 35)
  assert.equal(emailPreviews.length, 0)
})

test('filtering, sorting and paging return the expected records', async () => {
  const ids = [randomUUID(), randomUUID()]
  for (const [index, id] of ids.entries()) {
    assert.equal((await request('/Spacefarers', 'POST', {
      ID: id, IsActiveEntity: true, name: `Paging ${index}`, email: `paging${index}@example.test`, spacesuitColor: 'Purple'
    })).status, 201)
  }
  const response = await request("/Spacefarers?$filter=spacesuitColor eq 'Purple'&$orderby=name desc&$top=1&$skip=1&$count=true")
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body['@odata.count'], 2)
  assert.deepEqual(body.value.map(row => row.ID), [ids[0]])
  for (const id of ids) assert.equal((await request(recordUrl(id), 'DELETE')).status, 204)
})
