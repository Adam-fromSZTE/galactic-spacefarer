using { galactic } from '../db/schema';

service SpacefarerService {
  entity Spacefarers as projection on galactic.Spacefarers;
  @readonly entity Departments as projection on galactic.Departments;
  @readonly entity Positions as projection on galactic.Positions;
}
