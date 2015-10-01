(function () {

  var SearchCtrl = function ($scope, $state, $timeout, LocationService, RestaurantExplorer, CRITERIA_OPTIONS, CRITERIA_DEFAULTS) {

    fetchCurrentLocation();

    $scope.isLoadingLocation = true;
    $scope.criteria = _.clone(CRITERIA_DEFAULTS);
    $scope.cuisineList = CRITERIA_OPTIONS.CUISINE_TYPES;
    $scope.distanceLabel = getDistanceLabel($scope.criteria.radius);
    $scope.priceList = CRITERIA_OPTIONS.PRICES;
    $scope.openNow = {
      text: 'Open restaurants only',
      checked: true
    };

    $scope.explore = explore;
    $scope.updateDistanceLabel = function (distance) {
      $scope.distanceLabel = getDistanceLabel(distance);
    };
    $scope.updateOpenNowValue = function () {
      $scope.criteria.openNow = ($scope.openNow.checked == true ? 1 : 0);
    };
    $scope.convertToLatLon = function (location) {
      if (location) {
        var latlng = location.geometry.location;
        $scope.criteria.ll = latlng.lat() + ',' + latlng.lng();
      }
    };
    $scope.getRestaurants = function (query) {
      if (!query) {
        return {};
      }
      var params = {
        'query': query,
        'll': $scope.criteria['ll'],
        'radius': 50000,
        'limit': 10
      };

      triggerExternalSearch(params);
      return RestaurantExplorer.findWithKiwii(params)
        .then(function (restaurants) {
          return {
            items: restaurants
          };
        });
    };

    var searchIdleTimer;

    function triggerExternalSearch(params) {
      if (searchIdleTimer) {
        $timeout.cancel(searchIdleTimer);
      }
      searchIdleTimer = $timeout(RestaurantExplorer.findWithExternal.bind(null, params), 2000);
    }

    $scope.restaurantsClicked = function (callback) {
      $state.go('tab.details', {venueId: callback.item.foursquareId, restaurant: callback.item});
    };

    function getDistanceLabel(distance) {
      var labels = CRITERIA_OPTIONS.DISTANCE_LABELS;
      return _.filter(labels, function (label) {
        return distance >= label.minDistance;
      })[0];
    }

    function explore(criteria) {
      serializePriceFilter($scope.priceList);
      $state.go('tab.cards', {criteria: criteria});
    }

    function serializePriceFilter(priceList) {
      var selectedPriceRange = _.filter(priceList, _.property('checked'));
      $scope.criteria.price = _.pluck(selectedPriceRange, 'value').join(',');
    }

    function fetchCurrentLocation() {
      return LocationService.fetchCurrentLocation()
        .then(function (latLng) {
          $scope.criteria['ll'] = latLng.lat + ',' + latLng.lng;
        })
        .catch(LocationService.showErrorPopup);
    }

    $scope.$on('$ionicView.leave', function () { //This is fired twice in a row
      $scope.restaurantDetails = '';
    });
  };

  angular.module('kiwii').
    controller('SearchCtrl', SearchCtrl);
})();