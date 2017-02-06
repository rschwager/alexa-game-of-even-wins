var alexa = require('alexa-app');
var app = new alexa.app('even_wins_game');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 1;
module.exports = app;

// Define an alexa-app
app.launch(function(req, res) {
  console.log("111");
  res.say("Hello World!!");
});

function initializeGameState(session) {
  var chips = Math.round((13 * Math.random() + 9) / 2) * 2 + 1;

  var historical = null;
  if (session && session.historical) 
    historical = session.historical;
  else {
    historical = {
      playerWins: 0,
      alexaWins: 0,
      responses_0: [ 4, 4, 4, 4, 4, 4 ],
      responses_1: [ 4, 4, 4, 4, 4, 4 ],
      opponentsTotalOdd: 0,
      piecesLeft: 0
    }
  }
  
  return {
    chipsRemaining: chips,
    playerChipTotal: 0,
    alexaChipTotal: 0,
    historical: historical
  }
}

function alexaMove(session, gameState) {
  var m;
  var e1 = gameState.historical.opponentsTotalOdd;
  var l1 = gameState.historical.piecesLeft;
  
  gameState.historical.opponentsTotalOdd = gameState.playerChipTotal % 2;
  gameState.historical.piecesLeft = gameState.chipsRemaining % 6;
  
  var responses = gameState.historical.opponentsTotalOdd ? gameState.historical.responses_1 :
    gameState.historical.responses_0;
  var m = responses[gameState.historical.piecesLeft];
  if (m < 1 || m > 4) {
    // Illegal move...something wrong
    return {
      move: m,
      state: "error",
      chipRemaining: gameState.chipsRemaining
    };
  }
  else {
    if (responses[gameState.historical.piecesLeft] >= gameState.chipsRemaining)
      m = gameState.chipsRemaining;
    gameState.historical.piecesLeft = gameState.chipsRemaining; 
    gameState.chipsRemaining -= m;
    gameState.alexaChipTotal += m;    
  }
  
  // Update session
  session.set("gameState", gameState);
  
  return {
    move: m,
    state: gameState.chipsRemaining <= 0 ? "alexaWins" : "ok",
    chipsRemaining: gameState.chipsRemaining
  };
}

app.launch(function(req,res) {
  var gameState = initializeGameState(req.getSession());
  req.getSession().set("gameState", gameState);
  var moveState = alexaMove(req.getSession(), gameState);
  
  var chips = gameState.chipsRemaining;
  console.log(chips + " chips to start");

	res.say("Welcome to the game of Even Wins. To hear the rules, say help. To get the current game state, " +
          "say status. To leave the game, say exit.  There are " + chips + " chips on the board. " +
          "Alexa takes " + moveState.move + " chips, leaving " + moveState.chipsRemaining + " chips. " +
          "How many chips would you like to take? Say I take one, two, three or four chips.");
	res.shouldEndSession (false, "To hear the rules, say help. To get the current game state, say status. To " +
                        "leave the game, say exit.");
});

app.intent('StatusIntent', 
    {
        "slots": {},
        "utterances": [
            "status", "what is the game status", "what is the game state", "game state", "game status"
        ]
    },
    function (req, res) {
      var gameState = req.getSession().get("gameState");
	    res.say("Current State. There are " + gameState.chipsRemaining + " chips remaining. " +
              "I have " + gameState.alexaChipTotal + " chips.  You have " + gameState.playerChipTotal + 
              " chips. I have won " + gameState.historical.alexaWins + " games. You have won " + 
              gameState.historical.playerWins + " games.");  
    }    
);

app.intent('HelpIntent', 
    {
        "slots": {},
        "utterances": [
            "help", "how to play"
        ]
    },
    function (request, response) {
	    response.say("The game is played as follows.  At the beginning of the game, a random number of chips " +
                   "are placed on the board. The number of chips always starts as an odd number. On each " +
                   "turn, a player must take one, two, three, or four chips. The winner is the player who " +
                   "finishes with a total number of chips that is even. The computer starts out knowing only " +
                   "the rules of the game. It gradually learns to play well. It should be difficult to beat the " +
                   "computer after twenty games in a row. To get the current game state, say status. To " +
                   "leave the game, say exit.");
  
    }    
);

app.intent('AgeIntent', {
  "slots": { "AGE": "NUMBER" },
  "utterances": ["My age is {1-100|AGE}"]
}, function(req, res) {
  res.say('Your age is ' + req.slot('AGE'));
});

/*app.launch(function(request, response) {
  response.say("App launched!");
});
*/

app.intent("sampleIntent", {
    "slots": { "NAME": "LITERAL", "AGE": "NUMBER" },
    "utterances": ["my {name is|name's} {names|NAME} and {I am|I'm} {1-100|AGE}{ years old|}"]
  },
  function(request, response) {
    setTimeout(function() {
      response.say("After timeout!").say(" test ").reprompt("Reprompt");
      response.send();
    }, 1000);
    // We are async!
    return false;
  }
);

app.intent("errorIntent", function(request, response) {
  //response.say(someVariableThatDoesntExist);
});

// output the schema
//console.log("\n\nSCHEMA:\n\n" + app.schema() + "\n\n");
// output sample utterances
//console.log("\n\nUTTERANCES:\n\n" + app.utterances() + "\n\n");

// test pre() and post() functions
/*app.pre = function(request, response, type) {
  response.say("This part of the output is from pre(). ");
};
app.post = function(request, response, type, exception) {
  if (exception) {
    response.clear().say("An error occured: " + exception).send();
  }
};*/


// error handler example
app.error = function(e, request, response) {
  response.say("I captured the exception! It was: " + e.message);
};

