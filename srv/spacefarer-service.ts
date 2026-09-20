import cds, { type Request, type predicate } from '@sap/cds'
import { createCosmicMailer } from './cosmic-mail.js'

export interface SpacefarerInput {
  name?: string | null
  email?: string | null
  originPlanet?: string | null
  spacesuitColor?: string | null
  stardustCollection?: number | null
  wormholeNavigationSkill?: number | null
}

export function prepareSpacefarerData(data: SpacefarerInput, userPlanet: string, event: 'CREATE' | 'UPDATE' | string) {
  const candidate = { ...data }

  if ('originPlanet' in candidate && candidate.originPlanet !== userPlanet) {
    throw new Error('You can only manage spacefarers from your own planet.')
  }

  for (const field of ['name', 'email', 'spacesuitColor'] as const) {
    if (!(field in candidate)) continue
    const value = candidate[field]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${field} must not be empty.`)
    }
    candidate[field] = value.trim()
  }

  if ('email' in candidate && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email ?? '')) {
    throw new Error('Please enter a valid email address.')
  }

  for (const field of ['stardustCollection', 'wormholeNavigationSkill'] as const) {
    if (field in candidate && (typeof candidate[field] !== 'number' || !Number.isInteger(candidate[field]) || (candidate[field] as number) < 0)) {
      throw new Error(`${field} must be a non-negative whole number.`)
    }
  }

  if (candidate.wormholeNavigationSkill != null && candidate.wormholeNavigationSkill > 100) {
    throw new Error('Wormhole navigation skill must not exceed 100.')
  }

  if (event === 'CREATE') {
    candidate.originPlanet = userPlanet
    candidate.stardustCollection = Math.max(candidate.stardustCollection ?? 0, 10)
    candidate.wormholeNavigationSkill = Math.max(candidate.wormholeNavigationSkill ?? 0, 1)
  }

  return candidate
}

export function buildCosmicWelcomeEmail(spacefarer: Pick<SpacefarerInput, 'name' | 'email' | 'originPlanet'>) {
  const to = (spacefarer.email ?? '').trim()
  const subject = 'Cosmic Launch Confirmation: Your Galactic Journey Begins'
  const body = `Congratulations, ${spacefarer.name ?? 'Spacefarer'}! Your journey from planet ${spacefarer.originPlanet ?? 'unknown'} is now officially underway. Prepare your stardust and chart your next wormhole. Stay brave, stay curious, and keep reaching for the stars.`

  return { to, subject, body }
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
      const from = req.query?.SELECT?.from
      if (!from || !('ref' in from)) return
      const ref = from.ref
      if (!ref || ref.length < 2 || typeof ref[0] === 'string' || ref[0].id !== Spacefarers.name) return

      const root = ref[0]
      const planetFilter: predicate = [{ ref: ['originPlanet'] }, '=', { val: req.user.attr.planet }]
      root.where = root.where?.length
        ? [{ xpr: root.where }, 'and', ...planetFilter]
        : planetFilter
    })

    this.before(['NEW', 'PATCH'], Spacefarers.drafts!, (req: Request<SpacefarerInput>) => {
      if ('originPlanet' in req.data && req.data.originPlanet !== req.user.attr.planet) {
        req.reject(400, 'You can only manage spacefarers from your own planet.', 'originPlanet')
      }
      if (req.event === 'NEW') req.data.originPlanet = req.user.attr.planet
    })

    this.before(['CREATE', 'UPDATE'], Spacefarers, (req: Request<SpacefarerInput>) => {
      try {
        req.data = prepareSpacefarerData(req.data, req.user.attr.planet, req.event)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected validation error.'
        req.reject(400, message)
      }
    })

    this.after('CREATE', Spacefarers, (_result: unknown, req: Request<SpacefarerInput>) => {
      // CAP can return an InsertResult instead of the record, including during draft activation.
      const created = req.data
      const messages = (Array.isArray(created) ? created : [created]).map(buildCosmicWelcomeEmail)

      // AFTER runs before commit. Send only once the complete transaction succeeds.
      req.on('succeeded', async () => {
        for (const message of messages) {
          try {
            await sendWelcomeEmail(message)
          } catch (error) {
            // The candidate is already saved. Do not turn a mail failure into a failed CREATE.
            const code = error && typeof error === 'object' && 'code' in error
              ? String(error.code) : 'UNKNOWN'
            log.error(`Welcome email failed; spacefarer remains saved. Request: ${req.id}; code: ${code}`)
          }
        }
      })
    })

    return super.init()
  }
}
