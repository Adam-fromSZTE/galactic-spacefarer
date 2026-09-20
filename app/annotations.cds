using { SpacefarerService } from '../srv/spacefarer-service';

annotate SpacefarerService.Spacefarers with @(
  UI.HeaderInfo: {
    TypeName: 'Űrutazó',
    TypeNamePlural: 'Űrutazók',
    Title: { Value: name },
    Description: { Value: originPlanet }
  },
  UI.CreateHidden: true,
  UI.UpdateHidden: false,
  UI.DeleteHidden: true,
  UI.SelectionFields: [name, spacesuitColor],
  UI.LineItem: [
    { Value: name },
    { Value: originPlanet },
    { Value: stardustCollection },
    { Value: wormholeNavigationSkill },
    { Value: spacesuitColor }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Personal', Label: 'Személyes adatok', Target: '@UI.FieldGroup#Personal' },
    { $Type: 'UI.ReferenceFacet', ID: 'Journey', Label: 'Űrutazás', Target: '@UI.FieldGroup#Journey' }
  ],
  UI.FieldGroup#Personal: {
    Data: [
      { Value: name },
      { Value: email },
      { Value: originPlanet },
      { Value: department.name, Label: 'Részleg' },
      { Value: position.name, Label: 'Beosztás' }
    ]
  },
  UI.FieldGroup#Journey: {
    Data: [
      { Value: stardustCollection },
      { Value: wormholeNavigationSkill },
      { Value: spacesuitColor }
    ]
  }
) {
  name @title: 'Név';
  email @title: 'E-mail';
  originPlanet @title: 'Bolygó' @Common.FieldControl: #ReadOnly;
  stardustCollection @title: 'Csillagpor';
  wormholeNavigationSkill @title: 'Navigációs szint';
  spacesuitColor @title: 'Űrruha színe';
};

annotate SpacefarerService.Departments with {
  name @Common.FieldControl: #ReadOnly;
};

annotate SpacefarerService.Positions with {
  name @Common.FieldControl: #ReadOnly;
};
