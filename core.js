(function() {
	/* globals angular */
	var app = angular.module('app', []);

	app.factory('scrap', [function() {
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
			getMatches: function(user) {
				var user = "zoze";
				console.log(user);
				var nickname_api_url = "https://api.faceit.com/api/nicknames/";
				var user_hash = "";
				var p = new Promise(function (resolve, reject) {
					$.getJSON(nickname_api_url + user, function(json) {
						if (json.result === "error") {
							console.log("doesn't exist");
							return false;
						}
						else {
							user_hash = json.payload.guid;
							console.log('1', user_hash);
						}
					});
					console.log('user hash : ', user_hash);
					resolve(user_hash);
					return (p);
				});
				Promise.all([p]).then(function () {
					console.log('after first promise');
					var p = new Promise(function (resolve, reject) {
						var matches_url = "https://api-gateway.faceit.com/stats/api/v1/stats/time/users/";
						console.log('2', user_hash);
						$.getJSON(matches_url + user_hash + "/games/csgo?page=1&size=1000", function(json) {
							console.log(json);
						});
						return (p.resolve());
					});
				});
			}
		}

		var arr = [];
		$(".clickable").each(function () {
		  arr.push(angular.element($(this)).scope().match.info.matchId);
		});

		/* this value has to be changed for your Faceit Nickname */
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
			/*datas.sort(function (a, b) {
			    if (a.wins > b.wins)
			      return 1;
			    if (a.wins < b.wins)
			      return -1;
			    // a doit être égale à b
			    return 0;
			});*/
			console.log(datas);
		});
	}]);


	app.controller('controller', ['$scope', 'scrap', function($scope) {
		$scope.user = null;


		$scope.fetch = function(user) {
			$scope.user = user;
			var matches = scrap.service.getMatches(user);
			var datas = {}, wait = [];

			for (var i = 0, var c = matches.length; i < c; i++) {
				console.log(matches[i]);
				wait.push(service.getData(datas, matches[i]));
			}
		};
		
	}]);

})();
