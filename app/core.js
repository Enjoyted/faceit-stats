/* globals angular */

/** TODO
* More data
*/

(function() {
	var app = angular.module("app", []);

	app.factory("scrap", ["$http", "$q", function($http, $q) {
		var service = {
			matches_api_url: "https://api.faceit.com/stats/api/v1/stats/time/users/",
			nickname_api_url: "https://api.faceit.com/api/nicknames/",
			current_user: null,
			min_matches: 5,
			progress: 0,
			_findFaction: function(json) {
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
			_fillData: function (datas, json, faction, winner) {
				var self = this;
				for (var y=0;y<json[faction].length;y++) {
					var nickname = json[faction][y].nickname;
					var guid = json[faction][y].guid;
					if (guid !== self.guid) {
						if (guid in datas) {
							var totalGames = Number(datas[guid].wins) + Number(datas[guid].losses);
							if (winner === faction)
								datas[guid].wins++;
							else
								datas[guid].losses++;
							datas[guid].percentage = Math.floor((datas[guid].wins / (totalGames + 1)) * 100);
						} else {
							datas[guid] = {"wins": (winner === faction ? 1 : 0), "losses": (winner !== faction ? 1 : 0), "nickname": nickname};
						}
					}
				}
				return datas;
			},
			getData: function (matches) {
				var self = this;
				var map = {};
				return (new Promise(function (resolve, reject) {
					var progress = 0;
					var wait = [];
					var loopMatches = function(i) {
						return $http.get("https://api.faceit.com/api/matches/" + matches[i].matchId + "?withStats=true").then(function (response) {
							console.log("(" + i + ")" + "getting stats on match : " + matches[i].matchId, service.progress);
							var json = response.data.payload;
							var winner = json.winner;
							var faction = service._findFaction(json);
							service.progress = (((progress * 40) / matches.length) + 60);
							progress++;
							return (service._fillData(map, json, faction, winner));
						}, function(error) {
							$q.reject(error);
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
								nickname: map[i].nickname,
								data: map[i]
							});
						}
						resolve(datas);
					}, function (error) {
						reject(error);
					});
				}));
			},
			getUserHash: function() {
				var self = this;
				console.log("nickname : ", self.current_user);
				console.log("calling " + self.nickname_api_url + self.current_user + " ...");
				return (new Promise(function(resolve, reject) {
					$http.get(self.nickname_api_url + self.current_user).then(function(response) {
						self.guid = response.data.payload.guid;
						resolve(response.data.payload.guid);
					}, function(error) {
						// 404 user not found
						reject(error);
					});
				}));
			},
			getUserMatches: function (user_hash) {
				var self = this;
				var arr = [];

				return (new Promise(function(resolve, reject) {
					var run = function(i) {
						console.log(self.matches_api_url + user_hash + "/games/csgo?page=" + i + "&size=100");
						return $http.get(self.matches_api_url + user_hash + "/games/csgo?page=" + i + "&size=100").then(function(response) {
							console.log("response : ", response);
							var json = response.data;
							if (json.length === 0) {
								service.progress = 50;
								resolve(arr);
							} else {
								arr = arr.concat(json);
								return (run(i + 1));
							}
						}, function(error) {
							reject(error);
						});
					};
					return (run(0));
				}));
			},
			fetch: function(nickname, guid) {
				var self = this;
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

	app.filter('range', function() {
	    return function (items, property, min) {
	    	return items.filter(function(item){
	    		var matches = (item[property].wins + item[property].losses);
		        return matches >= min;  
		    });
	    }
  	});

	app.controller("controller", ["$scope", "$timeout", "$filter", "scrap", function ($scope, $timeout, $filter, scrap) {
		$scope.service = scrap;
		$scope.data = [];
		$scope.user = {};
		$scope.error = 0;
		$scope.filter = {
			username: '',
			orderBy: 'nickname',
			orderMode: '+',
			minMatches: $scope.service.min_matches,
		};

		$scope.fetch = function(user) {
			console.log("user 1 : ", user);
			var matches = scrap.fetch(user.nickname, user.guid).then(function (datas) {
				$timeout(function () {
			        $scope.$apply(function () {
			            $scope.data = datas;
			            $scope.service.progress = 100;
			        });
			    }, 150);
				console.log("stats : ", datas);
			}, function(error) {
				$scope.$apply(function() {
					$scope.error = "Error. Please try again."
				});
			});
		};
	}]);
})();
