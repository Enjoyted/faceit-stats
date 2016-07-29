/* globals angular */

/* TODO getData() */

(function() {
	var app = angular.module("app", []);

	app.factory("scrap", ["$http", "$q", function($http, $q) {
		var service = {
			current_user: null,
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
			displayData: function (datas) {
			  for (var user in datas) {
				var totalGames = Number(datas[user].wins + datas[user].losses);
				if (totalGames > 3) {
				  console.log("You have played " + totalGames + " games with the user : " + user + ". Your percentage rate with him is : " + datas[user].percentage + " %.");
				} else {
					console.log("?");
				}
			  }
			},
			getData: function(matches) {
				var map = {};
				return (new Promise(function (resolve, reject) {
					var wait = [];
					var loopMatches = function(i) {
						return $http.get("https://api.faceit.com/api/matches/" + matches[i].matchId + "?withStats=true").then(function (response) {
							console.log("getting stats on match : " + matches[i].matchId);
							var json = response.data.payload;
							var winner = json.winner;
							var faction = service.findFaction(json);

							return (service.fillData(map, json, faction, winner));
						});
					};
					for (var i in matches) {
						wait.push(loopMatches(i));
					}
					return Promise.all(wait).then(function () {
						var datas = [];
						for (var i in map) {
							datas.push({
								username: i,
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
				var nickname_api_url = "https://api.faceit.com/api/nicknames/";
				console.log("calling " + nickname_api_url + self.current_user + " ...");
				return (new Promise(function(resolve, reject) {
					$http.get(nickname_api_url + self.current_user).then(function(response) {
						console.log("user guid : ", response.data.payload.guid);
						resolve(response.data.payload.guid);
					}, function(error) {
						// 404 user not found
						reject(error);
					});
				}));
			},
			getUserMatches: function(user_hash) {
				var matches_url = "https://api-gateway.faceit.com/stats/api/v1/stats/time/users/";
				var arr = [];
				return (new Promise(function(resolve, reject) {
					var run = function(i) {
						console.log(matches_url + user_hash + "/games/csgo?page=" + i + "&size=10");
						return $http.get(matches_url + user_hash + "/games/csgo?page=" + i + "&size=10").then(function (response) {
							console.log("response : ", response);
							var json = response.data;
							if (json.length === 0)
								resolve(arr);
							else {
								arr = arr.concat(json);
								return (run(i + 1));
							}
						}, function(error) {
							reject(error);
						});
					};
					return (run(1));
				}));
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
					}, function(error) {
						reject("error while getting user's hash : ", error);
					});
				}));
			}
		};
		return service;
	}]);

	app.controller("controller", ["$scope", "scrap", function($scope, scrap) {
		$scope.user = {};

		$scope.fetch = function(user) {
			console.log("user 1 : ", user);
			var matches = scrap.fetch(user.nickname).then(function(datas) {
				console.log("matches : ", datas);
			}, function(error) {
				console.log(error);
			});
			console.log("-------------");
			/*
			var datas = {}, wait = [];

			for (var i = 0; i < matches.length; i++) {
				console.log(matches[i]);
				wait.push(scrap.getData(datas, matches[i]));
			}*/
		};
		
	}]);

})();
