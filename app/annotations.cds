using { SpacefarerService } from '../srv/spacefarer-service';

annotate SpacefarerService.Spacefarers with @(
  UI.HeaderInfo: {
    TypeName: 'Űrutazó',
    TypeNamePlural: 'Űrutazók',
    Title: { Value: name }
  },
  UI.CreateHidden: true,
  UI.UpdateHidden: true,
  UI.DeleteHidden: true,
  UI.SelectionFields: [name, spacesuitColor],
  UI.LineItem: [
    { Value: name },
    { Value: originPlanet },
    { Value: stardustCollection },
    { Value: wormholeNavigationSkill },
    { Value: spacesuitColor }
  ]
) {
  name @title: 'Név';
  originPlanet @title: 'Bolygó';
  stardustCollection @title: 'Csillagpor';
  wormholeNavigationSkill @title: 'Navigációs szint';
  spacesuitColor @title: 'Űrruha színe';
};
