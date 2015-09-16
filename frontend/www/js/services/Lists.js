(function () {
  var Lists = function ($q, ParseObject, FoursquareApi) {
    var LISTS_CLASS = 'Lists';
    var USER_LISTS_ATTRIBUTE = 'lists';
    var LISTS_KEYS = ['cards', 'category', 'categoryId', 'description', 'name', 'restaurants', 'thumbnailUrl'];

    var getList = function (listData) {
      var List = Parse.Object.extend(LISTS_CLASS);
      var listQuery = new Parse.Query(List);
      return listQuery.get(listData.objectId);
    };

    function updateThumbnailUrl(list, card) {
      var cardPromise = card ? Parse.Promise.as(card) : getLatestCard(list);
      return cardPromise
        .then(function (card) {
          if (card && !_.isEmpty(card.get('photos'))) {
            var imageUrl = card.get('photos')[0].get('photo').url();
            list.set('thumbnailUrl', imageUrl);
          }
          else if (card && card.taggedRestaurant.get('imageUrl')) {
            list.set('thumbnailUrl', card.taggedRestaurant.get('imageUrl'));
          }
          else {
            list.set('thumbnailUrl', undefined);
          }
          return list.save();
        })
        .fail(function (error) {
          console.log(error);
          return Parse.Promise.error(error);
        })
    }

    function getLatestCard(list) {
      var relation = list.relation('cards');
      return relation.query()
        .include('photos')
        .include('taggedRestaurant')
        .first();
    }

    var Lists = ParseObject.extend(LISTS_CLASS, LISTS_KEYS, {
      // Instance Methods
      addCard: addCard,
      removeCard: removeCard,
      fetchCards: fetchCards
    }, {
      // Static Methods
      saveList: function (listData) {
        var List = Parse.Object.extend(LISTS_CLASS);

        var saveList = new List();
        var user = Parse.User.current();
        // we write to the user feed
        saveList.set('feedSlug', 'user');
        saveList.set('feedUserId', user.id);
        // the list's data
        saveList.set('actor', user);
        saveList.set('verb', 'list');
        saveList.set('name', listData.name);
        saveList.set('description', listData.description);
        saveList.set('category', listData.category);
        saveList.set('categoryId', listData.categoryId);

        return saveList.save()
          .then(function () {
            var saveListRelation = Parse.User.current().relation(USER_LISTS_ATTRIBUTE);
            saveListRelation.add(saveList);
            return Parse.User.current().save();
          });
      },
      editList: function (listData) {
        return getList(listData)
          .then(function (list) {
            list.set("name", listData.name);
            list.set("description", listData.description);
            list.set("category", listData.category);

            return list.save();
          });
      },
      removeList: function (listData) {
        return getList(listData)
          .then(function (list) {
            return list.destroy();
          });
      }
      //saveRestaurantListRelation: function (list, foursquarePlaceId) {
      //  var restaurantListRelation = list.relation('restaurants');
      //  return checkIfRestaurantInList(list, foursquarePlaceId)
      //    .then(function (result) {
      //      if (result == undefined) {
      //        return FoursquareApi.getRestaurantById(foursquarePlaceId)
      //          .then(function (restaurant) {
      //            console.log(restaurant);
      //            restaurantListRelation.add(restaurant);
      //
      //            var currentUser = Parse.User.current();
      //            Parse.Cloud.run('addRestaurantToListActivity', {
      //              feed: 'user:' + currentUser.id,
      //              actor: 'ref:' + currentUser.className + ':' + currentUser.id,
      //              object: 'ref:' + restaurant.className + ':' + restaurant.id,
      //              foreign_id: restaurant.id + list.id,
      //              target: 'ref:' + list.className + ':' + list.id
      //            }).then(function (response) {
      //              console.log(response);
      //            });
      //
      //            return list.save().then(function () {
      //              // Save latest saved restaurant thumbnail to list
      //              list.set("thumbnailUrl", restaurant.attributes.imageUrl);
      //
      //              return list.save();
      //            });
      //          });
      //      } else {
      //        return 'Restaurant is already in list';
      //      }
      //    });
      //},
      //removeRestaurantListRelation: function (list, foursquarePlaceId) {
      //  var restaurantListRelation = list.relation('restaurants');
      //  return FoursquareApi.getRestaurantById(foursquarePlaceId)
      //    .then(function (restaurant) {
      //      console.log(restaurant);
      //      restaurantListRelation.remove(restaurant);
      //
      //      var currentUser = Parse.User.current();
      //      Parse.Cloud.run('removeRestaurantFromListActivity', {
      //        feed: 'user:' + currentUser.id,
      //        foreign_id: restaurant.id + list.id
      //      }).then(function (response) {
      //        console.log(response);
      //      });
      //
      //      return list;
      //    })
      //    .then(_.method('save'))
      //    .then(updateThumbnailUrl)
      //    .then(_.method('save'));
      //}
    });

    function addCard(card) {
      var deferred = $q.defer();
      var cardsRelation = this.relation('cards');
      // Add to feed
      cardsRelation.add(card);
      this.save()
        .then(function (list) {
          updateThumbnailUrl(list); // Update thumbnail without waiting for it finish
          return list;
        })
        .then(deferred.resolve)
        .fail(function (error) {
          console.log(error);
          return deferred.reject(error);
        });
      return deferred.promise;
    }

    function removeCard(card) {
      var deferred = $q.defer();
      var cardsRelation = this.relation('cards');
      // Remove from feed
      cardsRelation.remove(card);
      this.save()
        .then(function (list) {
          updateThumbnailUrl(list); // Update thumbnail without waiting for it finish
          return list;
        })
        .then(deferred.resolve)
        .fail(function (error) {
          console.log(error);
          return deferred.reject(error);
        });
      return deferred.promise;
    }

    function fetchCards() {
      var deferred = $q.defer();
      var cardsRelation = this.relation('cards');
      cardsRelation
        .query()
        .include('taggedRestaurant')
        .include('author')
        .include('photos')
        .find()
        .then(deferred.resolve)
        .fail(function (error) {
          console.log(error);
          return deferred.reject(error);
        });
      return deferred.promise;
    }

    return Lists;
  };

  angular.module('kiwii')
    .factory('Lists', Lists);
})();
