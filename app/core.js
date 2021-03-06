/* globals angular */

/** TODO
* More data
*/

(function() {
	var app = angular.module("app", ["ngSanitize"]);

	app.factory("scrap", ["$http", "$q", function($http, $q) {
		var service = {
			matches_api_url: "https://api.faceit.com/stats/api/v1/stats/time/users/",
			old_match_api_url:  "https://api.faceit.com/core/v1/matches/",
			match_api_url: "https://api.faceit.com/match/v2/match/",
			nickname_api_url: "https://api.faceit.com/core/v1/nicknames/",
			current_user: null,
			min_matches: 5,
			progress: 0,
			_findFaction: function(json, old) {
				var faction = "faction";
				if (old) {
					for (var ii = 0; ii < json[faction + "1"].length; ii++) {
						if (json[faction + "1"][ii].nickname == this.current_user) {
							faction += "1";
							break;
						}
					}
					if (faction.substr(-1, faction.length) === "n")
						faction += "2";
				} else {
					for (var ii = 0; ii < json[faction + "1"].roster.length; ii++) {
						if (json[faction + "1"].roster[ii].nickname == this.current_user) {
							faction += "1";
							break;
						}
					}
					if (faction.substr(-1, faction.length) === "n")
						faction += "2";
				}
				return faction;
			},
			_isElligibleGame:  function(old, json) {
				/* Basically ignore non 5v5 games, non elo games */
				var elligibleGame = false;
				if (old) {
					if (json.hasOwnProperty("match_type") && json.match_type.substr(0, 3) === "5v5") {
						if (json.hasOwnProperty("updated_elo_rank") && json.updated_elo_rank === true)
							elligibleGame = true
						if  (json.hasOwnProperty("calculate_elo") && json.calculate_elo === true)
							elligibleGame = true
					}
				} else {
					if (json.entity.name.substr(0, 9) === "CS:GO 5v5" && json.calculateElo === true)
						elligibleGame = true
				}
				return elligibleGame;
			},
			_getMapOfMatch: function(old, json) {
				var map = "";
				if (old) {
					map = (json.hasOwnProperty("voted_entities")) ? json.voted_entities[0].map.guid : "";
				} else {
					map = (json.hasOwnProperty("voting")) ? json.voting.map.pick[0] : "";
				}
				return map;
			},
			_fillData: function (datas, json, faction, winner, old) {
				var self = this;
				var teams = (old) ? json[faction] : json[faction].roster ;
				for (var y=0;y<teams.length;y++) {
					var nickname = teams[y].nickname;
					var guid = old ? teams[y].guid : teams[y].id;
					var map = service._getMapOfMatch(old, json);
					if (guid !== self.guid) {
						if (guid in datas) {
							var totalGames = Number(datas[guid].wins) + Number(datas[guid].losses);
							if (winner === faction) {								
								datas[guid].wins++;
								if (map !== "") {
									datas[guid].maps[map].wins++;
								}
							}
							else {
								datas[guid].losses++;
								if (map !== "") {
									datas[guid].maps[map].losses++;
								}
							}
							datas[guid].percentage = Math.floor((datas[guid].wins / (totalGames + 1)) * 100);
							if (map !== "")
								datas[guid].maps[map].percentage = Math.floor((datas[guid].maps[map].wins / (Number(datas[guid].maps[map].wins) + Number(datas[guid].maps[map].losses))) * 100)
						} else {
							datas[guid] = {
								"wins": (winner === faction ? 1 : 0),
								"losses": (winner !== faction ? 1 : 0),
								"nickname": nickname,
								"maps" : {
									"de_inferno": {"wins": 0, "losses": 0},
									"de_dust2": {"wins": 0, "losses": 0},
									"de_mirage": {"wins": 0, "losses": 0},
									"de_train": {"wins": 0, "losses": 0},
									"de_overpass": {"wins": 0, "losses": 0},
									"de_nuke": {"wins": 0, "losses": 0},
									"de_cache": {"wins": 0, "losses": 0},
									"de_cbble": {"wins": 0, "losses": 0}
								},
							};
							if (map !== "") {
								if (datas[guid].maps.hasOwnProperty(map))
									(winner === faction) ? datas[guid].maps[map].wins++ : datas[guid].maps[map].losses++;
							}
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
						var old = (matches[i].matchId.substr(0,2) == "1-") ? false : true;
						var correct_match_api = old ? self.old_match_api_url : self.match_api_url;  

						if(old) {
							return $http.get(correct_match_api + matches[i].matchId + "?withStats=true").then(function (response) {
								console.log("(" + i + ")" + "getting stats on OLD match : " + matches[i].matchId, service.progress);
								var json = response.data.payload;
								if (service._isElligibleGame(old, json)) {
									var winner = json.winner;
									var faction = service._findFaction(json, old);
									service.progress = (((progress * 40) / matches.length) + 60);
									progress++;
									return (service._fillData(map, json, faction, winner, old));
								}
							}, function(error) {
								$q.reject(error);
							});
						} else {
							return $http.get(correct_match_api + matches[i].matchId).then(function (response) {
								console.log("(" + i + ")" + "getting stats on match : " + matches[i].matchId, service.progress);
								var json = response.data.payload;
								if (service._isElligibleGame(old, json)) {
									var winner = json.results[0].winner;
									var faction = service._findFaction(json.teams, old);
									service.progress = (((progress * 40) / matches.length) + 60);
									progress++;
									return (service._fillData(map, json.teams, faction, winner, old));
								}
							}, function(error) {
								$q.reject(error);
							});
						}
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
				service.progress = 20;
				return (new Promise(function(resolve, reject) {
					var run = function(i) {
						console.log(self.matches_api_url + user_hash + "/games/csgo?page=" + i + "&size=100");
						return $http.get(self.matches_api_url + user_hash + "/games/csgo?page=" + i + "&size=100").then(function(response) {
							service.progress = service.progress + 0.3
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
				service.errormsg = false;
				service.progress = 10;
				this.current_user = nickname;
				return (new Promise(function(resolve, reject) {
					service.getUserHash().then(function (user_hash) {
						service.getUserMatches(user_hash).then(function (matches) {
							service.getData(matches).then(function (datas) {
								resolve(datas);
							}, function (error) {
								reject(error);
							});
						}, function (error) {
							reject(error);
						});
					}, function (error) {
						reject(error);
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
		$scope.service.errormsg = false;
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
					console.log(error);
					$scope.service.errormsg = error.status + " : " + error.data.message;
				});
			});
		};
	}]);
})();
