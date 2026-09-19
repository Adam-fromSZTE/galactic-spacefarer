import cds, { type Request, type predicate } from '@sap/cds'

interface SpacefarerInput {
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

    this.before(['CREATE', 'UPDATE'], Spacefarers, (req: Request<SpacefarerInput>) => {
      const data = req.data
      if ('originPlanet' in data && data.originPlanet !== req.user.attr.planet) {
        req.reject(403, 'You can only manage spacefarers from your own planet.')
      }

      for (const field of ['name', 'email', 'spacesuitColor'] as const) {
        if (!(field in data)) continue
        if (typeof data[field] !== 'string' || !data[field].trim()) {
          req.reject(400, `${field} must not be empty.`, field)
        }
        data[field] = data[field].trim()
      }
      if ('email' in data && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email ?? '')) {
        req.reject(400, 'Please enter a valid email address.', 'email')
      }

      for (const field of ['stardustCollection', 'wormholeNavigationSkill'] as const) {
        if (field in data && (typeof data[field] !== 'number' || !Number.isInteger(data[field]) || data[field] < 0)) {
          req.reject(400, `${field} must be a non-negative whole number.`, field)
        }
      }
      if (data.wormholeNavigationSkill != null && data.wormholeNavigationSkill > 100) {
        req.reject(400, 'Wormhole navigation skill must not exceed 100.', 'wormholeNavigationSkill')
      }

      if (req.event === 'CREATE') {
        data.stardustCollection = Math.max(data.stardustCollection ?? 0, 10)
        data.wormholeNavigationSkill = Math.max(data.wormholeNavigationSkill ?? 0, 1)
      }
    })

    return super.init()
  }
}
