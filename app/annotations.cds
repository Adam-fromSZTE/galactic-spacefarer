using { SpacefarerService } from '../srv/spacefarer-service';

annotate SpacefarerService.Spacefarers with @(
  UI.HeaderInfo: {
    TypeName: 'Űrutazó',
    TypeNamePlural: 'Űrutazók',
    Title: { Value: name },
    Description: { Value: originPlanet }
  },
  UI.CreateHidden: false,
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
      { Value: department_ID },
      { Value: position_ID }
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
  department @(
    title: 'Részleg',
    Common.Text: department.name,
    Common.TextArrangement: #TextOnly,
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label: 'Részleg',
      CollectionPath: 'Departments',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: department_ID,
          ValueListProperty: 'ID'
        },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
      ]
    }
  );
  position @(
    title: 'Beosztás',
    Common.Text: position.name,
    Common.TextArrangement: #TextOnly,
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label: 'Beosztás',
      CollectionPath: 'Positions',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: position_ID,
          ValueListProperty: 'ID'
        },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
      ]
    }
  );
};

annotate SpacefarerService.Departments with {
  ID @Common.Text: name @Common.TextArrangement: #TextOnly;
  name @Common.FieldControl: #ReadOnly;
};

annotate SpacefarerService.Positions with {
  ID @Common.Text: name @Common.TextArrangement: #TextOnly;
  name @Common.FieldControl: #ReadOnly;
};
