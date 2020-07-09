"use strict";
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require ("./config.json");
const dice = require("./roller.js");
const storage = require('node-persist');
const dwk = require("./dungeonworld-keeper.js");

// For Google API
const {google} = require('googleapis');
const gconn = require("./googleconnection.js");

let keeper = dwk.DungeonWorldKeeper('1VOvdNMqAy9RSvLCZ5DazXep9zcy1h0zM8WeBD5wihFY', require("./credentials.json"));

storage.init();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity(`Dungeon World`);
});

client.on('message', async msg => {
	console.log(`Recieved message: ${msg.content}`);
	// Ignore bots
	if (msg.author.bot) return;

	// Ignore anything that doesn't start with our prefix
	if (msg.content.indexOf(config.prefix) !== 0) return;

		// Ignore anything that doesn't start with our prefix
	if (msg.content.indexOf(config.prefix) !== 0) return;

	let characters = {};
	let users ={};

	try {
		characters = await storage.getItem('characters');
		if (typeof characters === "undefined") characters = {};
		users = await storage.getItem('users');
		if (typeof users === "undefined") users = {};
	} catch (err) {
		console.log("Error reading storage");
		console.log(err)
	}
	console.log(characters);

	let userId = msg.member.id;
	let character = {};
	if (! (typeof characters === "undefined") ) {
		character = characters[userId];
	}

	// Seperate off the command
	const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	switch (command) {
		case 'ping':
			msg.reply('pong');
			break;
		case 'assign':
			console.log("Attempting to assign character to player");

			if (msg.member.roles.cache.some(role => role.name === "Dungeon Master")) {
				let player = args.shift().toLowerCase();
				let user = msg.mentions.users.first();
				console.log(msg.mentions.users.first());
				if (user != undefined) {
					let character = args.shift().toLowerCase();
					characters[user.id] = {
						"characterName" : character
					};
					msg.reply(`Assigned ${character} to ${user}`);
				} else {
					msg.reply("We can't find the user you were trying to assign.");
				}
			} else {
				msg.reply("You don't have permission to assign someone a character.");
			}
			break;
		case 'roster':
			console.log("Attempting to list all characters");
			let rosterString = "";
			for (var key in characters) {
				let user = await client.users.fetch(key);
				if (typeof user != 'undefined') {
					rosterString += `${user} is playing ${characters[key].characterName}.\r`;
					console.log(user);
					console.log(key);
					console.log(characters[key]);
				}
			}

			msg.reply(rosterString);
			break;
		case 'sheet':
			if (characters[userId] != undefined)
			{
				let sheet = await keeper.getSheet(character.characterName);
				console.log("Sheet:");
				console.log(sheet);
				let sheetMessage = `Character Sheet for ${sheet.characterName} pulled from GoogleDocs:\r`;
				sheetMessage += sheet.getFormattedSheet();
				msg.channel.send(sheetMessage);
			} else {
				msg.reply("sorry, you don't appear to have a character assigned to you.");
			}
			break;
		case 'stat':
			if (characters[userId] != undefined)
			{
				let sheet = await keeper.getSheet(character.characterName);
				try {
					let stat = sheet.getStat(args.shift().toLowerCase());
					msg.reply(`Your ${stat.name} is ${stat.value}.`);
				} catch (e) {
					console.log("getStat error:");
					console.log(e);
					msg.reply("Couldn't unambigiously find a stat of that name. Maybe check your spelling or make it less ambigious?");
				}
			} else {
				msg.reply("sorry, you don't appear to have a character assigned to you.");
			}
			break;
		case 'roll':
			if (args.length == 0) {
				let roll1 = dice.rollDie(6);
				let roll2 = dice.rollDie(6);
				let total = roll1 + roll2;
				msg.channel.send(`${msg.member} rolled ${dice.d6ToEmoji(roll1)} ${dice.d6ToEmoji(roll2)} : **${total}**`);	
			} else {
				let rollString = args.join(" ").toLowerCase();
				let sides = parseInt(rollString);
				if (! isNaN(sides)) {
					console.log(typeof sides);
					let roll = dice.rollDie(sides);
					msg.reply(`rolled ${roll} on a ${sides}-sided die.`);
				} else {
					console.log(characters);
					if (characters[userId] != undefined)
					{
						console.log(`Trying to roll '${sides}'`);
						let rollText = await keeper.roll(rollString,character.characterName);
						msg.channel.send(`${msg.member} rolled ${rollText}`);

					} else {
						msg.reply("sorry, you don't appear to have a character assigned to you.");
					}
				}
			}
			break;
		case 'map':
			msg.reply("You can see the map at https://drive.google.com/file/d/1M2rSyayJ73XL-HRHMF71lIu-xKbjbc6b/view?usp=sharing");
			break;
		case 'sheet':
			msg.reply("Sorry, character sheet functionality not yet working. Go to https://docs.google.com/spreadsheets/d/1VOvdNMqAy9RSvLCZ5DazXep9zcy1h0zM8WeBD5wihFY/edit?usp=sharing instead.");
			break;
		case 'help':
		default:
			let help = "```fix\r";
			help += "Commands:\r";
			help += "/map                                   See the campaign map\r";
			help += "/roll                                  Roll 2d6\r";
			help += "/roll <X>                              Roll an <X>-sided die\r";
			help += "/roll [str|dex|con|int|wis|cha]        Roll 2d6 + stat\r";
			help += "/sheet                                 See your character sheet\r";
			help += "/?                                     See this help\r";
			help += "```";
			msg.reply(help);
	}

	storage.set('characters', characters);
	storage.set('users', users);

});

client.login(config.token);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function getCharacters(auth) {
  	const sheets = google.sheets({version: 'v4', auth});
  	let characters =[];
  	res = await sheets.spreadsheets.values.get({
    	spreadsheetId: '1VOvdNMqAy9RSvLCZ5DazXep9zcy1h0zM8WeBD5wihFY',
    	range: 'Party!B1:Z71',
 	});
 	rows = res.data.values;
  	for (let cIndex = 0; cIndex < 5; cIndex++) {
  		characters[cIndex] = parseCharacter(rows, cIndex * 5);
  		rows.map((row) => {
	        console.log(`${row[0]}, ${row[1]}`);
	    });
	}
	console.log(characters);
}

function parseCharacter(data, index) {
	let character = {
		'index': index,
		'player_name': data[0][index],
		'character_name': data[1][index],
		'class': data[2][index],
		'attributes': {
			'str': {
				'base': data[10][index + 1],
				'mod': data[10][index + 2]
			},
			'dex': {
				'base': data[11][index+1],
				'mod': data[11][index+2]
			},
			'con': {
				'base': data[12][index+1],
				'mod': data[12][index+2]
			},
			'int': {
				'base': data[13][index+1],
				'mod': data[13][index+2]
			},
			'wis': {
				'base': data[14][index+1],
				'mod': data[14][index+2]
			},
			'cha': {
				'base': data[15][index+1],
				'mod': data[15][index+2]
			}
		},
		'damage_die': data[16][index+1],
		'armor': data[16][index+3]
	};

	return character;
}


