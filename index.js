// Node TFS Rally Import Barry Mullan 2014

// Updated Feb 2016 to support writing a CSV file

var config = require('./config.json');
var fs = require("fs");
var _ = require('lodash');
var async = require('async');
var log4js = require('log4js');
var csv = require('ya-csv');
var rally = require('rally'),
	refUtils = rally.util.ref,
 	queryUtils = rally.util.query;
var restApi = rally(config);

var project = null;
var workspace = null;
var tags = [];
var users = [];
var trelloJson = null;

var readProject = function(callback) {

	restApi.query({
	    type: 'project', //the type to query
	    start: 1, //the 1-based start index, defaults to 1
	    pageSize: 200, //the page size (1-200, defaults to 200)
	    limit: 'Infinity', //the maximum number of results to return- enables auto paging
	    // order: 'Rank', //how to sort the results
	    fetch: ['Name', 'ObjectID', 'Parent', 'State'], //the fields to retrieve
	    query: queryUtils.where('Name', '=', config['destination-project']), //optional filter
	    scope: {
	        workspace: workspace._ref, // '/workspace/1234' //specify to query entire workspace
	        up: false, //true to include parent project results, false otherwise
	        down: true //true to include child project results, false otherwise
	    },
	    requestOptions: {} //optional additional options to pass through to request
	}, function(error, result) {
	    if(error) {
	        logger.error("Error",error);
	        callback(error,result);
	    } else {
	        callback(null,result);
	    }
	});
}

var readStory = function(name,callback) {

	restApi.query({
	    type: 'hierarchicalrequirement', //the type to query
	    start: 1, //the 1-based start index, defaults to 1
	    pageSize: 200, //the page size (1-200, defaults to 200)
	    limit: 'Infinity', //the maximum number of results to return- enables auto paging
	    // order: 'Rank', //how to sort the results
	    fetch: ['Name'], //the fields to retrieve
	    query: queryUtils.where('Name', '=', name), //optional filter
	    scope: {
	        workspace: workspace._ref, // '/workspace/1234' //specify to query entire workspace
	        project : project._ref,
	        up: false, //true to include parent project results, false otherwise
	        down: true //true to include child project results, false otherwise
	    },
	    requestOptions: {} //optional additional options to pass through to request
	}, function(error, result) {
	    if(error) {
	        logger.error("Error",error);
	        callback(error,result);
	    } else {
	        callback(null,result);
	    }
	});
}

var readUser = function(lastName, firstName,callback) {

	restApi.query({
	    type: 'user', //the type to query
	    start: 1, //the 1-based start index, defaults to 1
	    pageSize: 200, //the page size (1-200, defaults to 200)
	    limit: 'Infinity', //the maximum number of results to return- enables auto paging
	    // order: 'Rank', //how to sort the results
	    fetch: ['UserName', 'FirstName','LastName'], //the fields to retrieve
	    query: queryUtils.where('FirstName', '=', firstName)
	    		.and('LastName','=',lastName), //optional filter
	    scope: {
	        workspace: workspace._ref, // '/workspace/1234' //specify to query entire workspace
	    },
	    requestOptions: {} //optional additional options to pass through to request
	}, function(error, result) {
	    if(error) {
	        logger.error("Error",error);
	        callback(error,result);
	    } else {
	        callback(null,result);
	    }
	});
}

var readTags = function(callback) {

	restApi.query({
	    type: 'tag', //the type to query
	    start: 1, //the 1-based start index, defaults to 1
	    pageSize: 200, //the page size (1-200, defaults to 200)
	    limit: 'Infinity', //the maximum number of results to return- enables auto paging
	    // order: 'Rank', //how to sort the results
	    fetch: ['Name'], //the fields to retrieve
	    // query: queryUtils.where('Name', '=', config['destination-project']), //optional filter
	    scope: {
	        workspace: workspace._ref, // '/workspace/1234' //specify to query entire workspace
	        // up: false, //true to include parent project results, false otherwise
	        // down: true //true to include child project results, false otherwise
	    },
	    requestOptions: {} //optional additional options to pass through to request
	}, function(error, result) {
	    if(error) {
	        console.log("Error",error);
	        logger.error(error);
	        callback(error,result);
	    } else {
	        callback(null,result);
	    }
	});
}


var readWorkspaceRef = function(workspaceName,callback) {

	restApi.query({
	    type: 'workspace', //the type to query
	    start: 1, //the 1-based start index, defaults to 1
	    pageSize: 200, //the page size (1-200, defaults to 200)
	    limit: 'Infinity', //the maximum number of results to return- enables auto paging
	    // order: 'Rank', //how to sort the results
	    fetch: ['Name', 'ObjectID'], //the fields to retrieve
	    // query: queryUtils.where('ObjectID', '!=', 0), //optional filter
	}, function(error, result) {
	    if(error) {
	        console.log("Error",error);
	        logger.error(error);
	        callback(error,null);
	    } else {
			var workspace = _.find(result.Results,function(r) {
	        	return r.Name === workspaceName;
	        });
	        callback(null,workspace)
	    }
	});

}


var readMembersAsRallyUsers = function(json,callback) {
	var members = json.members;

	var readMember = function(member,callback) {

		var nameParts = member.fullName.split(' ');

		readUser( nameParts[1], nameParts[0], function(err,result){
			callback(null,result);
		});
	}

	async.map( members, readMember , function(error,results) {
		callback(_.compact(_.map(results,function(r){ return _.first(r.Results)})));
	})
}

var readJson = function(filename) {
	return require(filename);
}

var validate = function(json,callback) {

	if (workspace === null || project === null) {
		console.log("Error:see log");
		logger.error("Workspace or Project Is Null",workspace,project);
		process.exit();
	}
	// make sure all tags exist
	var allLabels = _.map(json.cards,function(card) { return card.labels });
	var labels = _.uniq( _.flatten(allLabels),function(label){ return label.id});

	// make sure all labels exist as tags
	var diff = _.difference( _.pull(_.map(labels,function(l){return l.name}),""),
								_.map(tags,function(t){return t.Name}));
	
	if (diff.length>0) {
		logger.info("The following tags must be created in order to map labels to tags",diff);
		console.log("The following tags must be created in order to map labels to tags",diff);
		// console.log("Error: see log");
		// process.exit()
	}

	readMembersAsRallyUsers(json,function(rallyUsers){
		callback(rallyUsers);
	});

	
}

var createOrUpdateStory = function(rallyData) {

	readStory(rallyData.name,function(err,result){

		if (result===null || result.Results.length===0) { // create
			restApi.create({
				type : 'hierarchicalrequirement',
				data : rallyData,
				fetch : ['FormattedID'],
				scope : {
					workspace : workspace._ref,
					project : project._ref
				}
			},function(error,result){
				if (error)
					logger.error(error)
				else
					logger.info(result)
			})
		} else {
			var story = _.first(result.Results);
			restApi.update({
				ref : story._ref,
				data : rallyData,
				fetch : ["FormattedID"],
				scope : {
					workspace : workspace._ref,
				}
			}, function(error,result){
				if (error)
					logger.error(error)
				else
					logger.info(result)
			})
		}

	})


}


var findUserForMember = function(card) {

	// find the action that created the card.
	var action = _.find(trelloJson.actions,function(a) {
		return a.type === 'createCard' &&
			a.data.card.id === card.id
	});

	// find the rally user corresponding to first and last name
	if (!_.isNull(action) && !_.isUndefined(action) ) { 
		var user = _.find(users,function(u) {
			return action.memberCreator.fullName === 
				u.FirstName + " " + u.LastName;
		})

		if (!_.isNull(user) && !_.isUndefined(user) ) { 
			return user;
		} else {
			logger.info("Rally user not found for Trello User:",action.memberCreator.fullName);
		}
	} else {
		logger.info("Card Action Not found for :",card);
	}

	return null;

}

var convertChecksListsToText = function(card) {

	var s = "";

	var checkLists = _.compact(_.map( card.idChecklists, function(id) {
		var clist = _.find( trelloJson.checklists, function(ch) {
			return ch.id === id;
		})
		return (!_.isUndefined(clist) && !_.isNull(clist)) ? clist : null;
	}));

	_.each(checkLists,function(cl) {
		s = s + "<p><b>" + cl.name + "</b></p";

		s = s + "<ul>";
		_.each(cl.checkItems,function(ci){
			s = s + "<li>" + ci.name + "\t" 
				   + (ci.state === 'complete' ? 'X' : '') +  "</li>"
				    + "</ul>"
		})
		s = s + "</ul>";
	});

	return s;
}

var getStateFromCheckLists = function(card) {
	var checkLists = _.compact(_.map( card.idChecklists, function(id) {
		var clist = _.find( trelloJson.checklists, function(ch) {
			return ch.id === id;
		})
		return (!_.isUndefined(clist) && !_.isNull(clist)) ? clist : null;
	}));

	if (checkLists.length===0) {
		return "Defined";
	}

	var states = _.uniq(_.flatten(_.map(checkLists,function(cl){
		return _.map(cl.checkItems,function(ci) {
			return ci.state;
		});
	})));

	if (states.length===1 && _.first(states)==='complete')
		return "Completed"
	else
		return "In-Progress"

}

var mapNotes = function(card) {

	var notes =  "<a href='"+card.url+"'>Trello Card</a>"; 

	notes = notes + ((card.labels.length>0) ? 
		"<br/>Labels: " +
		_.map(card.labels,function(label,i){
			return ( i > 0 ? " | " : "") + "<b>" + label.name + "</b> ";
		}).join("")

		: "");

	notes = notes + ((card.attachments.length>0) ?
		"<p/>Attachments:<br/>" + 
		_.map(card.attachments,function(attachment,i){
			return "<li>" + 
				"<a href='" + attachment.url + "'>" + attachment.name + "</a></li>";
		}).join("")
		:"")

	return notes;
}

var mapList = function(card) {
	var list = _.find(trelloJson.lists,function(l){
		return card.idList === l.id
	})
	return list ? list.name : "";
}

var mapCard = function(card) {

	var rally = {};

	_.each( storyFields, function(field){
		switch(field) {
			case 'list':
				rally[field] = mapList(card); break;
			case 'name': 
				rally[field] = card.name.substring(0,255); break;
			case 'description': 
				rally[field] = card.desc + '<p></p>' + convertChecksListsToText(card) ; break;
			case 'notes': 
				rally[field] = mapNotes(card); break;
			case 'tags': 
				rally[field] = _.map(card.labels,function(label) {
						return _.find(tags,function(tag) {
							return tag.Name === label.name
						});
				}); 
				break;
			case 'owner': 
				rally[field] = findUserForMember(card); break;
			case 'schedulestate': 
				// rally[field] = getStateFromCheckLists(card); break;
				rally[field] = ""; break;
		}
	})

	return rally;
}

// main 'driver' function. Reads the Rally workspace and project configuration
var importData = function(jsonFile, csvFile) {

	// open the csv file and write the header
	writer = csv.createCsvStreamWriter(fs.createWriteStream(csvFile));
	writer.writeRecord(storyFields);

	readWorkspaceRef(config.workspace,function(err,ws) {
		workspace = ws;
		logger.info(ws);
		readTags(function(err,result){
			tags = result.Results;
			logger.info("Tags:",tags.length);
			readProject(function(error,result) {
				project = _.first(result.Results)
				logger.info('Project',project.Name);
				processJson(readJson(jsonFile));
			})
		})		
	});
};

var processJson = function(json) {

	trelloJson = json;

	validate(json,function(rallyUsers) {
		users = rallyUsers;
		logger.info("Rally Users",users);
		logger.info("Cards:",json.cards.length);
		logger.info("Members:",json.members.length);
		logger.info("Actions:",json.actions.length);
		logger.info("Rally Users:",users.length);
		// iterate and process each card.
		_.each(json.cards,function(card){
			processCard(card);
		})
	});

}

// convert individual cards
var processCard = function(card) {
	var rallyData = mapCard(card);
	logger.info(rallyData);
	// does it exist, if not create it otherwise update it
	// createOrUpdateStory(rallyData);
	// write the data to csv
	var csvRecord = _.map(storyFields,function(field){
		if (field==="owner")
			return rallyData[field] ? rallyData[field]["UserName"] : "";

		return rallyData[field];
	});
	writer.writeRecord(csvRecord);
}


// check the command line args expecting input json filename and output csv filename
var args = process.argv.slice(2);

if (args.length !== 2) {
	console.log("Usage: node index.js <input.json> <output.csv");
	process.exit(0);
}
console.log(args);

var storyFields = ['list','name','description','schedulestate','owner','tags','color','notes']
var writer = null;

// setup logging
log4js.configure({
  appenders: [
    { type: 'file', filename: 'trello-converter.log', category: 'log' }
  ]
})
var logger = log4js.getLogger('log');
logger.setLevel('INFO');

importData(args[0],args[1]);






