/* globals angular */

/** TODO
*	KNOWN BUG :
*		- Something is wrong in the data retrieving. The data between two users is different for each other, ex :
*		PlayerA has a 87% win with PlayerB, with a 21-3 win-loss ratio.
*		But when browsing for PlayerB stats, he has a 88% with a 15-2 win-loss ratio. I don't know yet where this comes from.
*		It doesn't happen randomly, only  withvery specific users.
*/

(function() {
	var app = angular.module("app", []);

	app.factory("scrap", ["$http", "$q", function($http, $q) {
		var service = {
			matches_api_url: "https://api-gateway.faceit.com/stats/api/v1/stats/time/users/",
			nickname_api_url: "https://api.faceit.com/api/nicknames/",
			current_user: null,
			min_matches: 5,
			progress: 0,
			toto: {},
			findFaction: function(json) {
			  var faction = "faction";
			  for (var ii = 0; ii < json[faction + "1"].length; ii++) {
				if (json[faction + "1"][ii].nickname == this.current_user) {
				  faction += "1";
				  break;
				}
			  }
			  if (faction.substr(-1, faction.length) === "n")
				faction += "2";
			  return faction;
			},
			fillData: function (datas, json, faction, winner) {
			  for (var y=0;y<json[faction].length;y++) {
				var user = json[faction][y].nickname;
				if (user !== this.current_user) {
				  if (user in datas) {
				  	var totalGames = Number(datas[user].wins) + Number(datas[user].losses);
					if (winner === faction) {
					  datas[user].wins++;
					  datas[user].percentage = Math.floor((datas[user].wins / (totalGames + 1)) * 100);
					} else {
					  datas[user].losses++;
					  datas[user].percentage = Math.floor((datas[user].wins / (totalGames + 1)) * 100);
					}
				  }
				  else {
					datas[user] = {"wins": (winner === faction ? 1 : 0), "losses": (winner !== faction ? 1 : 0)};
				  }
				}
			  }
			  return datas;
			},
			getData: function (matches) {
				service.toto = matches;
				var self = this;
				var map = {};
				return (new Promise(function (resolve, reject) {
					var progress = 0;
					var wait = [];
					var loopMatches = function(i) {
						return $http.get("https://api.faceit.com/api/matches/" + matches[i].matchId + "?withStats=true").then(function (response) {
							console.log("getting stats on match : " + matches[i].matchId, service.progress);
							var json = response.data.payload;
							var winner = json.winner;
							var faction = service.findFaction(json);
							service.progress = (((progress * 40) / matches.length) + 60);
							progress++;
							return (service.fillData(map, json, faction, winner));
						});
					};
					for (var i in matches) {
						wait.push(loopMatches(i));
					}
					service.progress = 60;
					return Promise.all(wait).then(function () {
						var datas = [];
						for (var i in map) {
							datas.push({
								username: i,
								data: map[i]
							});
						}
						resolve(self.getRelevantData(datas));
					}, function (error) {
						reject(error);
					});
				}));
			},
			getRelevantData: function (datas) {
				var self = this;
				/* remove users where total number of games is lower than `min_matches` parameter */
				for (var i = 0; i < datas.length; i++) {
					if (datas[i].data.wins + datas[i].data.losses < self.min_matches) {
						datas.splice(i, 1);
						i--;
					}
				}
				/* sort by asc usernames */
				datas.sort(function (a, b) {
					var nameA = a.username.toLowerCase(), nameB = b.username.toLowerCase();
					return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
				});
				return datas;
			},
			getUserHash: function() {
				var self = this;
				console.log("nickname : ", self.current_user);
				console.log("calling " + self.nickname_api_url + self.current_user + " ...");
				return (new Promise(function(resolve, reject) {
					$http.get(self.nickname_api_url + self.current_user).then(function(response) {
						console.log("user guid : ", response.data.payload.guid);
						resolve(response.data.payload.guid);
					}, function(error) {
						// 404 user not found
						reject(error);
					});
				}));
			},
			getUserMatches: function (user_hash) {
				var self = this;
				console.log(self.matches_api_url + user_hash + "/games/csgo?page=0&size=100000");
				service.progress = 10;
				return $http.get(self.matches_api_url + user_hash + "/games/csgo?page=0&size=100000").then(function (response) {
					console.log("response : ", response);
					service.progress = 50;
					return response.data;
				});
			},
			fetch: function(nickname) {
				var user_hash = "";
				this.current_user = nickname;
				return (new Promise(function(resolve, reject) {
					service.getUserHash().then(function (user_hash) {
						service.getUserMatches(user_hash).then(function (matches) {
							service.getData(matches).then(function (datas) {
								resolve(datas);
							}, function (error) {
								reject("error while getting data : ", error);
							});
						}, function (error) {
							reject("error while getting matches : ", error);
						});
					}, function (error) {
						reject("error while getting user's hash : ", error);
					});
				}));
			}
		};
		return service;
	}]);

	app.controller("controller", ["$scope", "$timeout", "$filter", "scrap", function ($scope, $timeout, $filter, scrap) {
		$scope.service = scrap;
		$scope.data = [];
		$scope.user = {};

		$scope.fetch = function(user) {
			console.log("user 1 : ", user);
			var matches = scrap.fetch(user.nickname).then(function (datas) {
				$timeout(function () {
			        $scope.$apply(function () {
			            $scope.data = datas;
			            $scope.service.progress = 100;
			        });
			    }, 150);
				console.log("stats : ", datas);
			}, function(error) {
				console.log(error);
			});
		};
	}]);
})();
