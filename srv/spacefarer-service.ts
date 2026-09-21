import cds, { type Request, type predicate } from '@sap/cds'
import { buildCosmicWelcomeEmail, createCosmicMailer } from './cosmic-mail.js'

export interface SpacefarerInput {
  name?: string | null
  email?: string | null
  originPlanet?: string | null
  spacesuitColor?: string | null
  stardustCollection?: number | null
  wormholeNavigationSkill?: number | null
}

export default class SpacefarerService extends cds.ApplicationService {
  async init() {
    const { Spacefarers } = this.entities
    const sendWelcomeEmail = createCosmicMailer()
    const log = cds.log('cosmic-mail')

    this.before('*', (req: Request) => {
      const planet = req.user.attr.planet
      if (typeof planet !== 'string' || !planet.trim()) {
        req.reject(403, 'A valid planet is required for this user.')
      }
    })

    this.before('READ', (req: Request) => {
      // Check the planet when reading related data, too.
      const from = req.query?.SELECT?.from
      if (!from || !('ref' in from)) {
        return
      }

      const path = from.ref
      if (!path || path.length < 2) {
        return
      }

      const spacefarer = path[0]
      if (typeof spacefarer === 'string' || spacefarer.id !== Spacefarers.name) {
        return
      }

      const planetFilter: predicate = [{ ref: ['originPlanet'] }, '=', { val: req.user.attr.planet }]
      if (spacefarer.where && spacefarer.where.length > 0) {
        spacefarer.where = [{ xpr: spacefarer.where }, 'and', ...planetFilter]
      } else {
        spacefarer.where = planetFilter
      }
    })

    this.before(['NEW', 'CREATE', 'UPDATE'], [Spacefarers, Spacefarers.drafts!], (req: Request<SpacefarerInput>) => {
      if ('originPlanet' in req.data && req.data.originPlanet !== req.user.attr.planet) {
        req.reject(400, 'You can only manage spacefarers from your own planet.', 'originPlanet')
      }
      if (req.event === 'NEW' || req.event === 'CREATE') {
        req.data.originPlanet = req.user.attr.planet
      }
    })

    this.before(['CREATE', 'UPDATE'], Spacefarers, (req: Request<SpacefarerInput>) => {
      // Drafts can be incomplete; validate on save.
      const data = req.data

      for (const field of ['name', 'email', 'spacesuitColor'] as const) {
        // Updates may only include a few fields.
        if (!(field in data)) {
          continue
        }
        const value = data[field]
        if (typeof value !== 'string' || !value.trim()) {
          req.reject(400, `${field} must not be empty.`, field)
        }
        data[field] = value.trim()
      }

      if ('email' in data && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email ?? '')) {
        req.reject(400, 'Please enter a valid email address.', 'email')
      }

      for (const field of ['stardustCollection', 'wormholeNavigationSkill'] as const) {
        if (!(field in data)) {
          continue
        }
        const value = data[field]
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
          req.reject(400, `${field} must be a non-negative whole number.`, field)
        }
      }

      if (data.wormholeNavigationSkill != null && data.wormholeNavigationSkill > 100) {
        req.reject(400, 'Wormhole navigation skill must not exceed 100.', 'wormholeNavigationSkill')
      }

      if (req.event === 'CREATE') {
        if (data.stardustCollection == null || data.stardustCollection < 10) {
          data.stardustCollection = 10
        }
        if (data.wormholeNavigationSkill == null || data.wormholeNavigationSkill < 1) {
          data.wormholeNavigationSkill = 1
        }
      }
    })

    this.after('CREATE', Spacefarers, (_result: unknown, req: Request<SpacefarerInput | SpacefarerInput[]>) => {
      // CAP may return an insert result rather than the full record.
      let spacefarers: SpacefarerInput[]
      if (Array.isArray(req.data)) {
        spacefarers = req.data
      } else {
        spacefarers = [req.data]
      }

      const messages = spacefarers.map(spacefarer => buildCosmicWelcomeEmail(spacefarer))

      // Wait until the database commit succeeds.
      req.on('succeeded', async () => {
        for (const message of messages) {
          try {
            await sendWelcomeEmail(message)
          } catch (error) {
            // A mail error should not undo the saved record.
            let code = 'UNKNOWN'
            if (error && typeof error === 'object' && 'code' in error) {
              code = String(error.code)
            }
            log.error(`Welcome email failed; spacefarer remains saved. Request: ${req.id}; code: ${code}`)
          }
        }
      })
    })

    return super.init()
  }
}
