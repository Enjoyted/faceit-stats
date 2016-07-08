(function() {
	var app = angular.module('app', []);

	app.factory('scrap', ['$http', '$q', function($http, $q) {
		var service = {
			findFaction: function(json) {
			  var faction = "faction";
			  for (var ii = 0; ii < json[faction + '1'].length; ii++) {
				if (json[faction + '1'][ii]['nickname'] == self_user) {
				  faction += '1';
				  break;
				}
			  }
			  if (faction.substr(-1, faction.length) === "n")
				faction += '2';
			  return faction;
			},
			fillData: function (datas, json, faction, winner) {
			  for (var y=0;y<json[faction].length;y++) {
				var user = json[faction][y]['nickname'];
				if (user !== self_user) {
				  if (user in datas) {
				  	var totalGames = Number(datas[user].wins + datas[user].losses);
					if (winner === faction) {
					  datas[user]['wins']++;
					  datas[user]['percentage'] = Math.floor(datas[user].wins / totalGames * 100);
					}
					else {
					  datas[user]['losses']++;
					  datas[user]['percentage'] = Math.floor(datas[user].wins / totalGames * 100);
					}
				  }
				  else {
					datas[user] = {'wins': (winner === faction ? 1 : 0), 'losses': (winner !== faction ? 1 : 0)};
				  }
				}
			  }
			  return datas;
			},
			displayData: function (datas) {
			  for (var user in datas) {
				var totalGames = Number(datas[user].wins + datas[user].losses);
				if (totalGames > 3) {
				  console.log('You have played ' + totalGames + ' games with the user : ' + user + '. Your percentage rate with him is : ' + datas[user]['percentage'] + ' %.');
				} else {

				}
			  }
			},
			getData: function(datas, hash) {
				console.log('getting stats on match : ' + hash);
				var p = new Promise(function (resolve, reject) {
					$.getJSON("https://api.faceit.com/api/matches/" + hash + "?withStats=true", function(json) {
						var json = json['payload'];
						var winner = json['winner'];
						var faction = service.findFaction(json);

						datas = service.fillData(datas, json, faction, winner);
					});
					resolve(datas);
					return (p);
				});
			},
			getUserHash: function(nickname) {
				console.log('nickname : ', nickname);
				var nickname_api_url = "https://api.faceit.com/api/nicknames/";
				console.log('calling ' + nickname_api_url + nickname + ' ...');
				return (new Promise(function(resolve, reject) {
					console.log('before http');
					$http.get(nickname_api_url + nickname).then(function(response) {
						console.log('popoppo', response);
						if (response.data.result === "ok") {
							console.log('user guid : ', response.data.payload.guid);
							resolve(response.data.payload.guid);
						} else {
							console.log('here???');
							reject('could not find user with this nickname');
						}
					}, function(error) {
						reject(error);
					});
				}));
			},
			getUserMatches: function(user_hash) {
				var matches_url = "https://api-gateway.faceit.com/stats/api/v1/stats/time/users/";
				var arr = [];
				var run = function(i) {
					console.log(matches_url + user_hash + "/games/csgo?page=" + i + "&size=10");
					return $http.get(matches_url + user_hash + "/games/csgo?page=" + i + "&size=10").then(function(response) {
						console.log('response : ', response);
						json = response.data;
						if (json.length === 0)
							return (arr);
						else {
							arr = arr.concat(json);
							return (run(i + 1));
						}
					});
				};
				return (run(1));
			},
			fetch: function(nickname) {
				var user_hash = "";
				service.getUserHash(nickname).then(function (user_hash) {
					return (service.getUserMatches(user_hash));
				}, function(error) {
					console.log('error ??', error);
				}).then(function (matches) {
					console.log('matches : ', matches);
				}, function() {
					console.log('could not find matches ?');
				});
			}
		}
		return service;
	}]);

		/*
		var arr = [];
		$(".clickable").each(function () {
		  arr.push(angular.element($(this)).scope().match.info.matchId);
		});

		var self_user = "Enjoy";
		var datas = {}, wait = [];
		for (var i=0;i<arr.length;i++) {
			wait.push(service.getData(datas, arr[i]));
		}
		console.log('@@@@@@@@@@@@@@');
		console.log('NUMBER OF GAMES ? : ', arr.length);
		Promise.all(wait).then(function() {
			//displayData(datas);
			console.log('??');
			console.log(datas);
		});*/

	app.controller('controller', ['$scope', 'scrap', function($scope, scrap) {
		$scope.user = {};


		$scope.fetch = function(user) {
			console.log('user 1 : ', user);
			var matches = scrap.fetch(user.nickname);
			console.log('matches : ', matches);
			var datas = {}, wait = [];

			for (var i = 0; i < matches.length; i++) {
				console.log(matches[i]);
				wait.push(scrap.getData(datas, matches[i]));
			}
		};
		
	}]);

})();
