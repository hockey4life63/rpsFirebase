$('#loginBox').modal({ backdrop: 'static', keyboard: false })
$("#gameWaiting").hide();
// $("#loginBox").modal("show")

//set up database refrences
const database = firebase.database();
const userRef = database.ref("/users");
const gameRef = database.ref("/game");
let currentUser = "";
//define game state
const state = {
    open: 0,
    joined: 1,
    choose: 2,
    winner: 3,
    playagian: 4,
    quit: 5
}
//create timer 
let timerObj = {
    timerID: "",
    perTurn: 15,
    start: function() {
        let timerCount = this.perTurn;
        timeLoc = $("#timeLeft");
        timeLoc.text(timerCount);
        this.timerID = setInterval(function() {
            timerCount--;
            timeLoc.text(timerCount);
            if (timerCount === 0) {
                timerObj.stop();
            }

        })
    },
    stop: function() {
        clearInterval(this.timerID);
    }

}
$("#nameSubmit").on("click", function() {
    let name = $("#nameText").val().trim();
    let exists = true;
    //checks if username exists already
    userRef.child(name).once("value", function(snap) {
        exists = (snap.val() !== null)
    }).then(function() {
        if (!exists) {
            userRef.child(name).set({
                displayName: name,
                gameId: "000",
                gameWins: 0
            });
            currentUser = name;
            $(".modal").modal("hide")
            callGameBtn();
            userRef.child(name).onDisconnect().remove()
        } else {
            $("#nameInfo").text("That name is taken try another")
        }
    });

});
$("#createGame").on("click", function() {
    let newRef = gameRef.push()
    let newItem = {
        createrName: currentUser,
        joinerName: "",
        state: state.open,
        hostChoice: "",
        joinerChoice: ""
    }
    newRef.set(newItem).then(function() {
        gameState(newRef.key)
    })
})

function callGameBtn() {
    //checks for games to join
    gameRef.orderByChild("state").equalTo(state.open).on("child_added", function(snap) {
            //excludes your games
            if (snap.val().createrName !== currentUser) {
                console.log("game Found")
                createGameBtn(snap.key);
            }
        })
        //removes if the game changes to different game state
    gameRef.on("child_changed", function(snap) {
        if (snap.val().state !== state.open) {
            $("#" + snap.key).remove()

        }
        // 
    })
}

function createGameBtn(key) {
    let name = "";
    gameRef.child(key).once("value", function(snap) {
        name = snap.val().createrName;
    }).then(function() {
        //build btn
        let btn = $("<button>");
        btn.text("Join " + name + "'s game");
        //store key to game in database
        btn.attr("data-key", key);
        btn.attr("id", key)
        btn.addClass("btn btn-primary joinGame");
        btn.attr("type", "button");
        $("#gameList").append(btn);
        $(btn).on("click", function() {
            let key = $(this).attr("data-key")
            gameRef.child(key).transaction(function(snap) {
                //on click set user in game and change game state
                snap.joinerName = currentUser;
                snap.state = state.joined
                return snap
            }).then(function() {
                //remove button and turn off listener for new games
                $(btn).remove();
                gameRef.orderByChild("state").equalTo(state.open).off()
                $(".allGames").hide()
                //start game
                gameState(key);
            })

        })
    })
}

function setGameBox(key) {
    let name = "";
    //sets name of the players
    gameRef.child(key).once("value", function(snap) {
        if (currentUser === snap.val().joinerName) {
            $("#theirName").text(snap.val().createrName)
        } else {
            $("#theirName").text(snap.val().joinerName)
        }
    }).then(function() {
        //makes modal appear and not be closeable
        $("#gameBox").modal({ backdrop: 'static', keyboard: false });
        $("#gameBox").off("click")
        $(document).off("keypress")


        $("#chatBox").html("");
        setupChat(key);
    })

}

function makeMessage(name, message) {
    //make the chat messages and appends in chat box
    let div = $("<div>");
    let newP = $("<p>")
    div.addClass("message");
    newP.text(name + ": " + message);
    div.append(newP);
    //appends and moves chat box down to view new message
    $("#chatBox").append(div).animate({
        scrollTop: div.offset().top
    }, 100)

}

function setupChat(key) {
    //sets up the chat listeners
    gameRef.child(key + "/chat").on("child_added", function(snap) {
            if (snap.val().name !== undefined) {
                makeMessage(snap.val().name, snap.val().message)
            }
        })
        //sets up chat btn submitting to database
    $("#textSubmit").on("click", function() {
        if ($("#textMessage").val().trim() !== "") {
            gameRef.child(key + "/chat").push().set({
                name: currentUser,
                message: $("#textMessage").val().trim()
            })
            $("#textMessage").val("");
        }
    })
}

function quitGame(key) {
    //handles turning off all listeners
    $("#gameBox").modal("hide")
    $(".allGames").show();
    gameRef.child(key + "/chat").off();
    gameRef.child(key).off();
    $("#textSubmit").off("click");
    $("#choiceSubmit").off("click");
    $(".rpsChoice").off("click");
    $("yesPlay").off();
    $("#noPlay").off();
    callGameBtn();
}

function winCheck(yourChoice, theirChoice) {
    let check = {
            Rock: 0,
            Paper: 1,
            Scissors: 2
        }
        /*if (a == b) ties++;
else if ((a - b + 3) % 3 == 1) wins++;
else losses++;*/
    let you = check[yourChoice];
    let them = check[theirChoice];
    if (you === them) {
        return "You Guys Tied!"
    }
    if ((you - them + 3) % 3 === 1) {
        return "You Won!"
    } else {
        return "They Won :/"
    }
}

function gameState(key) {
    //  state: {
    //     open: 0,
    //     joined: 1,
    //     choose: 2,
    //     winner: 3,
    //     playagian: 4,
    //     quit: 5
    // }
    let currentGame = gameRef.child(key);
    let currentChoice = "";
    let theirChoice = "";
    let host = false;
    let yourChoice;
    let otherChoice;
    //cheap way to add the play again object
    let playAgianHtml = '<div> <h1 class="col-md-12">Play agian?</h1><button type="button" class="btn btn-primary" id="yesPlay">Yes</button><button type="button" class="btn btn-danger" id="noPlay">No</button></div>'
        //checks if user is the host
    currentGame.once("value", function(snap) {
            if (snap.val().createrName === currentUser) {
                host = true;
            }
            yourChoice = host?"hostChoice":"joinerChoice";
            otherChoice = host?"joinerChoice":"hostChoice";
        })
        //main game play is manage by state changes in database
    currentGame.child("state").on("value", function(snap) {
        let data = snap.val();
        //if game gets delete end the game
        if (data === null) {
            quitGame(key);
        }
        switch (data) {
            case state.open:
                //turn off new game listener and show waiting screen
                gameRef.orderByChild("state").equalTo(state.open).off()
                $(".allGames").hide()
                $("#gameWaiting").show();
                console.log("game is open")
                //set up chat database inside the current game in database
                currentGame.child("chat").set({
                    chat: true
                });
                //deletes game if player disconnects
                currentGame.onDisconnect().remove()
                break;

            case state.joined:
                //sets up the game modal
                setGameBox(key);
                if (host) $("#gameWaiting").hide();
                if (!host) {
                    //eltes game if disconnected for joined player
                    currentGame.onDisconnect().remove()
                }
                //currentGame.once("value", function(snap) {
                    if (host) {
                        //change game state to next step
                        currentGame.update({
                            state: state.choose
                        })
                    }
                //})


                console.log("game is joined");
                break;

            case state.choose:
                //clears text from last round/game
                $(".winDisplay").html("");
                $("#yourChoice").text("");
                $("#theirChoice").text("");
                $(".rpsChoice").on("click", function() {
                    //set and show current choice
                    currentChoice = $(this).attr("choice");
                    $("#yourChoice").text(currentChoice);
                })
                $("#choiceSubmit").on("click", function() {
                    currentGame.once("value", function(snap) {
                        //set my choice
                        let choiceObj ={};
                        choiceObj[yourChoice] = currentChoice
                            currentGame.update(choiceObj)
                    }).then(function(snap) {
                        //check is other player chose and change game state if they did
                        if (snap.val()[otherChoice] !== "") {
                            currentGame.update({
                                state: state.winner
                            })
                        }
                    })

                })

                break;

            case state.winner:
                $("#choiceSubmit").off("click");
                $(".rpsChoice").off("click");
                currentGame.child(otherChoice).once("value", function(snap) {
                    theirChoice = snap.val();
                    $("#theirChoice").text(theirChoice);
                    if (currentChoice === "" && theirChoice === "") {
                        $(".winDisplay").text("You both didnt pick anything you guys paying attention");
                    } else if (theirChoice === "") {
                        $(".winDisplay").text("They didnt pick anything YOU WIN!")
                    } else if (currentChoice === "") {
                        $(".winDisplay").text("You didnt pick anything You lose")
                    } else {
                        $(".winDisplay").text(winCheck(currentChoice, theirChoice));
                    }
                    if(host){
                        currentGame.update({
                            joinerChoice: "",
                            hostChoice: ""
                        })
                        setTimeout(function() {
                            currentGame.update({
                                state: state.playagian
                            })
                        }, 5000)
                    }
                })
                
                break;

            case state.playagian:
                currentChoice ="";
                console.log("at playagian state");
                $(".winDisplay").html(playAgianHtml);
                $("#yesPlay").on("click", function() {
                    currentGame.once("value", function(snap) {
                        let choiceObj ={};
                        choiceObj[yourChoice]= "yes";
                            currentGame.update(choiceObj)
                      
                    }).then(function(snap) {
                            if (snap.val()[otherChoice] === "yes") {
                                currentGame.update({
                                    joinerChoice: "",
                                    hostChoice: "",
                                    state: state.choose
                                })
                            }
                    })
                    $("#yesPlay").off();
                    $("#noPlay").off();
                })
                $("#noPlay").on("click", function() {
                    currentGame.remove();
                    quitGame();
                })
                break;

            case state.quit:

                break;

        }
    })



}
