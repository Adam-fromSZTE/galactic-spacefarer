using { galactic } from '../db/schema';

@requires: 'Spacefarer'
service SpacefarerService {
  @odata.draft.enabled
  @restrict: [{ grant: '*', to: 'Spacefarer', where: 'originPlanet = $user.planet' }]
  entity Spacefarers as projection on galactic.Spacefarers;
  @readonly entity Departments as projection on galactic.Departments;
  @readonly entity Positions as projection on galactic.Positions;
}
