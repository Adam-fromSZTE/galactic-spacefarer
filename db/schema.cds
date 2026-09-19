namespace galactic;

using { cuid } from '@sap/cds/common';

entity Spacefarers : cuid {
  name                    : String(100) @mandatory;
  email                   : String(254) @mandatory;
  originPlanet            : String(20) @mandatory;
  stardustCollection      : Integer default 0;
  wormholeNavigationSkill : Integer default 0;
  spacesuitColor          : String(30) default 'White';
  department              : Association to Departments @assert.target;
  position                : Association to Positions @assert.target;
}

entity Departments {
  key ID : String(20);
  name   : String(100);
}

entity Positions {
  key ID : String(20);
  name   : String(100);
}
