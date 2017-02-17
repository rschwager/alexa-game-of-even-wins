var alexa = require('alexa-app');
var app = new alexa.app('even_wins_game');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 1;
module.exports = app;

function getNewChipAmount() {
  return Math.round((13 * Math.random() + 9) / 2) * 2 + 1;;
}

function initializeGameState(session) {
  var chips = getNewChipAmount();

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
      piecesLeft: 0,
      prevOpponentsTotalOdd: 0,
      prevPiecesLeft: 0
    }
  }
  
  return {
    startingChips: chips,
    chipsRemaining: chips,
    playerChipTotal: 0,
    alexaChipTotal: 0,
    historical: historical
  }
}

function alexaMove(session, gameState) {
  var m;
  gameState.historical.prevOpponentsTotalOdd = gameState.historical.opponentsTotalOdd;
  gameState.historical.prevPiecesLeft = gameState.historical.piecesLeft;
  
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
    state: gameState.chipsRemaining <= 0 ? "gameOver" : "ok",
    chipsRemaining: gameState.chipsRemaining
  };
}

function playerMove(chipsRequested, session, gameState) {
  
  gameState.historical.opponentsTotalOdd = gameState.chipsRemaining; 
  gameState.chipsRemaining -= chipsRequested;
  gameState.playerChipTotal += chipsRequested;    

  // Update session
  session.set("gameState", gameState);

  return {
    move: chipsRequested,
    state: gameState.chipsRemaining <= 0 ? "gameOver" : "ok",
    chipsRemaining: gameState.chipsRemaining
  };
}

function newGame(session, gameState, res) {
  // Reset game state
  var chips = getNewChipAmount();
  gameState.startingChips = chips;
  gameState.chipsRemaining = chips;
  gameState.playerChipTotal = 0;
  gameState.alexaChipTotal = 0;
  
  var moveState = alexaMove(session, gameState);
  
  var chips = gameState.startingChips;
  console.log(chips + " chips to start");

	res.say("To start, there are " + chips + " chips on the board. " +
          "I take " + moveState.move + " chips, leaving " + moveState.chipsRemaining + " chips. " +
          "How many chips would you like to take?");

  // Update session
  session.set("gameState", gameState);
}

function isGameOver(session, gameState, response) {
  if (gameState.chipsRemaining > 0)
    return false; // game is still on.
  else { // No chips remaining, let's determine who won, update stats and restart
    if (gameState.alexaChipTotal % 2 == 0) { // alexa wins
      response.say("Game Over. I win. Let's start a new game.");
      gameState.historical.alexaWins++;

    }
    else { // player wins
      response.say("Game Over. You win. Let's start a new game.");
      gameState.historical.playerWins++;
      updateStats(gameState);
    }
  }
  
  // Update session
  session.set("gameState", gameState);
  
  newGame(session, gameState, response);
  return true;
}

function updateStats(gameState) {
  var responses = gameState.historical.opponentsTotalOdd ? gameState.historical.responses_1 :
    gameState.historical.responses_0;
  if (responses[gameState.historical.piecesLeft] > 1)
    responses[gameState.historical.piecesLeft]--;
  else {
    responses = gameState.historical.prevOpponentsTotalOdd ? gameState.historical.responses_1 :
      gameState.historical.responses_0;
    if (responses[gameState.historical.prevPiecesLeft] > 1)
      responses[gameState.historical.prevPiecesLeft]--;
  }
}

app.launch(function(req,res) {
  var gameState = initializeGameState(req.getSession());
  req.getSession().set("gameState", gameState);
  var moveState = alexaMove(req.getSession(), gameState);
  
  var chips = gameState.startingChips;
  console.log(chips + " chips to start");

	res.say("Welcome to the game of Even Wins. To hear the rules, say help. To get the current game state, " +
          "say status. To leave the game, say exit.  To start, there are " + chips + " chips on the board. " +
          "I take " + moveState.move + " chips, leaving " + moveState.chipsRemaining + " chips. " +
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
      if (!gameState) {
        console.log("We have no session. Something is wrong.");
        gameState = initializeGameState(req.getSession());
        req.getSession().set("gameState", gameState);
      }

	    res.say("Current State. There are " + gameState.chipsRemaining + " chips remaining. " +
              "I have " + gameState.alexaChipTotal + " chips.  You have " + gameState.playerChipTotal + 
              " chips. I have won " + gameState.historical.alexaWins + " games. You have won " + 
              gameState.historical.playerWins + " games. How many chips would you like to take?"); 
      res.shouldEndSession(false);
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
                   "finishes with a total number of chips that is even. I start out knowing only " +
                   "the rules of the game. I gradually learn to play well. It should be difficult to beat me " +
                   "after twenty games in a row. To get the current game state, say status. To " +
                   "leave the game, say exit. How many chips would you like to take?");
      response.shouldEndSession(false);  
    }    
);

app.intent('MoveIntent', {
  "slots": { "CHIPS": "NUMBER" },
  "utterances": ["I take {1-4|CHIPS} chips", "I take {1-4|CHIPS}", "Take {1-4|CHIPS} chips", "Take {1-4|CHIPS}", "{1-4|CHIPS} CHIPS"]
}, function(req, res) {
  var gameState = req.getSession().get("gameState");
  if (!gameState)
    console.log("We have no session. Something is wrong.");

  res.shouldEndSession(false);
  var chipsRequest = parseInt(req.slot('CHIPS'));
  
  // Make sure the request is valid.
  if (chipsRequest > gameState.chipsRemaining) {
    res.say("There are only " + gameState.chipsRemaining + " chips remaining.  You can't request more than that.");
    return true;
  }
  
  // Player move.
  var playerMoveState = playerMove(chipsRequest, req.getSession(), gameState);
  if (!isGameOver(req.getSession(), gameState, res)) {
    res.say("After your move of " + playerMoveState.move + ", there are " + 
           playerMoveState.chipsRemaining + " chips left.");
    var alexaMoveState = alexaMove(req.getSession(), gameState);
    // Is game over?
    if (gameState.chipsRemaining <= 0) {
      res.say("I take " + alexaMoveState.move + " chips.");
      isGameOver(req.getSession(), gameState, res); // We know it is over but it does contain logic in it
    }
    else {
      res.say("I take " + alexaMoveState.move + " chips, leaving " + alexaMoveState.chipsRemaining + " chips. " +
          "How many chips would you like to take?");
    }
  }  
});

app.intent('AMAZON.StopIntent', stopSession);
app.intent('AMAZON.CancelIntent', stopSession);
app.sessionEnded(stopSession);

function stopSession(request, response) {
  var gameState = request.getSession().get("gameState");
  var alexaWins = 0;
  var playerWins = 0;

  if (gameState) {
    alexaWins = gameState.historical.alexaWins;
    playerWins = gameState.historical.playerWins;
  }

  response.say("Thanks for playing.  You won " + playerWins + " games and I won " + alexaWins + " games.");
  response.shouldEndSession(true);  
}


// error handler example
app.error = function(e, request, response) {
  response.say("I captured the exception! It was: " + e.message);
};

