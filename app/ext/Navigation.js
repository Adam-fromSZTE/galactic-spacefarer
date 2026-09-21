sap.ui.define([], function () {
  'use strict';
  return {
    backToList: function () {
      return this.getRouting().navigateToRoute('SpacefarerList');
    }
  };
});
