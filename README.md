# SteamYard Dice Bot

This is a little bot I've written to automate dice rolling within StreamYard by automatically parsing and responding to messages sent to the chat.

## Setup

You'll need to open the Chrome Inspection Tools (or equivalent of whatever browser you're using) and view network traffic, then send a test message. The JSON message sent will give you your "clientId" and "csrfToken" values that will be needed to be provided at the top of the script.

Once you've populated those, just paste the entire script into the Chrome Inspection Console and hit enter. It should then begin to monitor and send messages as needed.
