var chatid = ''; // Populated automatically from document.location.pathname
var username = "DICE BOT"; // Username to display for the bot
var clientid = ''; // Populated automatically from window.sessionStorage
var csrfToken = ''; // Populated automatically from window.document.cookie

var timeoutDuration = 1000; // How often to check for new comments?

var commentIds = []; // Keeps track of the comments that have already been processed

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
    
    message = "(" + message + ")";
    message = message.replace(/^\(\((.*)\)\)$/, '($1)');
    
    resultMsg += result + " " + message;
    
    return resultMsg;
}

// Post the result to the chat.
function postResponse(msg)
{
    msg = msg.replace('"', "'");
    
    if (msg.length > 500)
    {
        msg = msg.substr(0, 497);
        msg += '...';
    }
    
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/api/broadcasts/" + chatid + "/chat", true);
    xhttp.setRequestHeader("content-type", "application/json");
    xhttp.send('{"text":"' + msg + '","name":"' + username + '","clientId":"' + clientid + '","color":"#22653f","csrfToken":"' + csrfToken + '"}');
}

// Loop through the comments, skipping a set number of comments to prevent duplicating
// the results of already processed comments, and process any new comments.
function checkComments()
{
    data = JSON.parse(window.sessionStorage["chat-" + chatid]);
    
    for (var i = 0; i < data.comments.length; ++i)
    {
        var name = data.comments[i].name;
        var comment = data.comments[i].text;
        
        // Don't process already processed comments
        if (commentIds.includes(data.comments[i].id))
        {
            continue;
        }
        commentIds.push(data.comments[i].id);
        
        var mat = regexMatch(comment);
        
        if (mat != null)
        {
            var tokens = tokenize(comment);
            var message = evaluate(tokens);
            var finalMsg = "[" + name + "] " + message;
            
            postResponse(finalMsg);
        }
    }
}

// Begin the loop in a timeout to constantly process.
function processLoop()
{
    checkComments();
    
    setTimeout(processLoop, timeoutDuration);
}

// Parse to locate all required data for processing and sending chat messages
function setup()
{
    chatid = document.location.pathname.replace('/', '');
    csrfToken = window.document.cookie.replace(/.*csrfToken=([^;]+);.*/, '$1');
    
    if (!window)
    {
        console.error('Window not initialized');
        return;
    }
    
    if (!window.sessionStorage)
    {
        console.error('No Session Storage');
    }
    
    if (!window.sessionStorage["chat-" + chatid])
    {
        console.error('No chat log, please send a message "BOT START"');
    }
    
    data = JSON.parse(window.sessionStorage["chat-" + chatid]);
    
    for(var i = 0; i < data.comments.length; ++i)
    {
        if (data.comments[i].text === 'BOT START')
        {
            clientid = data.comments[i].clientId;
        }
    }
    
    processLoop();
}

setup();
