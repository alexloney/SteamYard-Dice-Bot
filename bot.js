// The below will need to be populated by you, I got them by sending a test message to chat
// and checking the Chrome network traffic to see what was sent.
var chatid = "xxxxxxxxxx"; // This is part of the url for the stream room, it should be in the URL
var username = "DICE BOT"; // This is the username you'd like the bot to show up as
var clientid = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // I found this by sending a test message and viewing Chrome network traffic
var csrfToken = "xxxxxxxxxxxxxxxxxxxxxxxx"; // I also found this with Chrome network traffic

var commentClassStr = "Chat__Comments-dUewnW eqLtEG";
var timeoutDuration = 1000;

// Function to perform a regex match on a dice rolling string, verify that our input
// string is formatted correctly for our needs before attempting to tokenize and 
// parse it. This will match patterns such as:
//  /r 1d20
//  /roll 1d20
//  /R 1D20 + 7
//  /r 1d20 + 3d6 - 7
//  /r 1d6 + 7 # Damage done to enemy
function regexMatch(str)
{
    var pat = /\/r(oll)? +(\d*d\d+) *([+-] *(\d*d?\d+))* *(#.*)?/i;
	var n = str.match(pat);
	
	return n;
}

// Take an input string that has passed the regex validation and split it into an array
// of tokens that may then be later parsed.
function tokenize(str)
{
    str = str.replace(/^\/r(oll)? /i, "");
	
    var parts = [];
	var part = "";
    for (var i = 0; i < str.length; ++i)
	{
	    if (str[i] == '+' || str[i] == '-' || str[i] == ' ')
		{
		    if (part.length > 0)
			{
			    parts.push(part);
				part = "";
			}
			
			if (str[i] != ' ')
			{
			    part += str[i];
				parts.push(part);
				part = "";
			}
		}
		else if (str[i] == '#')
		{
			if (part.length > 0)
			{
				parts.push(part);
				part = "";
			}
			while (i < str.length)
			{
				part += str[i];
				i++;
			}
			break;
		}
		else
		{
		    part += str[i];
		}
	}
	
	if (part.length > 0)
	{
	    parts.push(part);
	}
	
	return parts;
}

// Take an array of tokens and evaluate them by performing the random operation for
// dice rolls ro adding/subtracting the correct values.
function evaluate(tokens)
{
	var result = 0;
	var message = "";
	var operation = "+";
	var comment = "";
	
	for (var i = 0; i < tokens.length; ++i)
	{
		var mat = tokens[i].match(/(\d*)d(\d+)/i);
		if (mat != null)
		{
			var dice = 1;
			var size = 1;
			
			if (mat.length == 2)
			{
				size = mat[1];
			}
			else if (mat.length == 3)
			{
				dice = mat[1];
				size = mat[2];
			}
			
			if (message.length > 0)
			{
				message += " " + operation + " ";
			}
			message += "(";
			var subtotal = 0;
			for (var j = 0; j < dice; j++)
			{
				if (j > 0)
				{
					message += " + ";
				}
				var num = Math.ceil(Math.random() * size);
				subtotal += num;
				message += num;
			}
			message += ")";
			
			if (operation == "+")
			{
				result += subtotal;
			}
			else
			{
				result -= subtotal;
			}
			
			operation = "+";
		}
		else if (tokens[i][0] == "#")
		{
			comment = tokens[i];
			comment = comment.replace(/^# */, "");
		}
		else if (tokens[i] == "+")
		{
			operation = "+";
		}
		else if (tokens[i] == "-")
		{
			operation = "-";
		}
		else
		{
			var subtotal = parseInt(tokens[i]);
			
			if (operation == "+")
			{
				result += subtotal;
			}
			else
			{
				result -= subtotal;
			}
			
			if (message.length > 0)
			{
				message += " " + operation + " ";
			}
			message += tokens[i];
			
			operation = "+";
		}
	}
	
	var resultMsg = "";
	
	if (comment.length > 0)
	{
		resultMsg += comment + ": ";
	}
	
	resultMsg += result + " (" + message + ")";
	
	return resultMsg;
}

// Post the result to the chat.
function postResponse(msg)
{
	msg = msg.replace('"', "'");
	
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", "/api/broadcasts/" + chatid + "/chat", true);
	xhttp.setRequestHeader("content-type", "application/json");
	xhttp.send('{"text":"' + msg + '","name":"' + username + '","clientId":"' + clientid + '","color":"#22653f","csrfToken":"' + csrfToken + '"}');
}

// Loop through the comments, skipping a set number of comments to prevent duplicating
// the results of already processed comments, and process any new comments.
function checkComments(start)
{
	var chat = document.getElementsByClassName(commentClassStr);
	for (var i = 0; i < chat[0].children.length; ++i)
	{
		if (i < start)
		{
			continue;
		}

		var name = '';
		var comment = '';
		if (chat[0].children[i].children.length == 1)
		{
			name = 'Host';
			comment = chat[0].children[i].children[0].textContent;
		}
		else if (chat[0].children[i].children.length == 2)
		{
			name = chat[0].children[i].children[0].textContent;
			comment = chat[0].children[i].children[1].textContent;
		}
		
		var mat = regexMatch(comment);
		
		if (mat != null)
		{
			var tokens = tokenize(comment);
			var message = evaluate(tokens);
			var finalMsg = "[" + name + "] " + message;
			
			postResponse(finalMsg);
		}
	}
	
	return chat[0].children.length;
}

// Begin the loop in a timeout to constantly process.
var commentsProcessedCount = 0;
function processLoop()
{
	commentsProcessedCount = checkComments(commentsProcessedCount);
	
	setTimeout(processLoop, timeoutDuration);
}

processLoop();
