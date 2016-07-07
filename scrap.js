/* globals angular */

/* find the faction of the given user */
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
	getMatch: function(datas, hash) {
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
	wait.push(service.getMatch(datas, arr[i]));
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