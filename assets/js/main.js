$('#loginBox').modal({ backdrop: 'static', keyboard: false })

// $("#loginBox").modal("show")


let database = firebase.database();
let userRef = database.ref("/users");
let gameRef = database.ref("/game");
let currentUser = "";
let state = {
    open: 0,
    joined: 1,
    choose: 2,
    winner: 3,
    playagian: 4,
    quit: 5
}
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
    gameRef.orderByChild("state").equalTo(state.open).on("child_added", function(snap) {
        if (snap.val().createrName !== currentUser) {
            console.log("game Found")
            createGameBtn(snap.key);
        }
    })
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
        let btn = $("<button>");
        btn.text("Join " + name + "'s game");
        btn.attr("data-key", key);
        btn.attr("id", key)
        btn.addClass("btn btn-primary joinGame");
        btn.attr("type", "button");
        $("#gameList").append(btn);
        $(btn).on("click", function() {
            let key = $(this).attr("data-key")
            gameRef.child(key).transaction(function(snap) {
                snap.joinerName = currentUser;
                snap.state = state.joined
                return snap
            }).then(function() {
                $(btn).remove();
                gameRef.orderByChild("state").equalTo(state.open).off()
                $(".allGames").hide()
                gameState(key);
            })

        })
    })
}

function setGameBox(key) {
    let name = ""
    gameRef.child(key).once("value", function(snap) {
        if (currentUser === snap.val().joinerName) {
            $("#theirName").text(snap.val().createrName)
        } else {
            $("#theirName").text(snap.val().joinerName)
        }
    }).then(function() {
        $("#gameBox").modal({ backdrop: 'static', keyboard: false });
        $("#gameBox").off("click")
        $(document).off("keypress")


        $("#chatBox").html("");
        setupChat(key);
    })

}

function makeMessage(name, message) {
    let div = $("<div>");
    let newP = $("<p>")
    div.addClass("message");
    newP.text(name + ": " + message);
    div.append(newP);
    $("#chatBox").append(div).animate({
        scrollTop: div.offset().top
    }, 100)

}

function setupChat(key) {
    gameRef.child(key + "/chat").on("child_added", function(snap) {
        if (snap.val().name !== undefined) {
            makeMessage(snap.val().name, snap.val().message)
        }
    })
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
    let playAgianHtml = '<div> <h1 class="col-md-12">Play agian?</h1><button type="button" class="btn btn-primary" id="yesPlay">Yes</button><button type="button" class="btn btn-danger" id="noPlay">No</button></div>'
    currentGame.once("value", function(snap) {
        if (snap.val().createrName === currentUser) {
            host = true;
        }
    })
    currentGame.child("state").on("value", function(snap) {
        let data = snap.val();
        if (data === null) {
            quitGame(key);
        }
        switch (data) {
            case state.open:
                gameRef.orderByChild("state").equalTo(state.open).off()
                $(".allGames").hide()
                console.log("game is open")
                currentGame.child("chat").set({
                    chat: true
                });
                currentGame.onDisconnect().remove()
                break;

            case state.joined:
                setGameBox(key);
                if (!host) {
                    currentGame.onDisconnect().remove()
                }
                currentGame.once("value", function(snap) {
                    if (host) {
                        currentGame.update({
                            state: state.choose
                        })
                    }
                })


                console.log("game is joined");
                break;

            case state.choose:
                $(".winDisplay").html("");
                $("#yourChoice").text("");
                $("#theirChoice").text("");
                $(".rpsChoice").on("click", function() {
                    currentChoice = $(this).attr("choice");
                    $("#yourChoice").text(currentChoice);
                })
                $("#choiceSubmit").on("click", function() {
                    currentGame.once("value", function(snap) {
                        if (host) {
                            currentGame.update({
                                hostChoice: currentChoice
                            })
                        } else {
                            currentGame.update({
                                joinerChoice: currentChoice
                            })
                        }

                    }).then(function(snap) {
                        if (host) {

                            if (snap.val().joinerChoice !== "") {
                                currentGame.update({
                                    state: state.winner
                                })
                            }

                        } else {

                            if (snap.val().hostChoice !== "") {
                                currentGame.update({
                                    state: state.winner
                                })
                            }

                        }
                    })

                })

                break;

            case state.winner:
                $("#choiceSubmit").off("click");
                $(".rpsChoice").off("click");
                if (host) {
                    currentGame.child("joinerChoice").once("value", function(snap) {
                        theirChoice = snap.val();
                    })
                } else {
                    currentGame.child("hostChoice").once("value", function(snap) {
                        theirChoice = snap.val();
                    })
                }
                $("#theirChoice").text(theirChoice);
                currentGame.update({
                    joinerChoice: "",
                    hostChoice: ""
                })
                if (yourChoice === "") {
                    $(".winDisplay").text("You didnt pick anything You lose")
                } else if (theirChoice === "") {
                    $(".winDisplay").text("They didnt pick anything YOU WIN!")
                } else if (yourChoice === "" && theirChoice === "") {
                    $(".winDisplay").text("You both didnt pick anything you guys paying attention");
                } else {
                    $(".winDisplay").text(winCheck(currentChoice, theirChoice));
                }
                setTimeout(function() {
                    currentGame.update({
                        state: state.playagian
                    })
                }, 5000)
                break;

            case state.playagian:
                console.log("at playagian state");
                $(".winDisplay").html(playAgianHtml);
                $("#yesPlay").on("click", function() {
                    currentGame.once("value", function(snap) {
                        if (host) {
                            currentGame.update({
                                hostChoice: "yes"
                            })
                        } else {
                            currentGame.update({
                                joinerChoice: "yes"
                            })
                        }
                    }).then(function(snap) {
                        if (host) {
                            if (snap.val().joinerChoice === "yes") {
                                currentGame.update({
                                    joinerChoice: "",
                                    hostChoice: "",
                                    state: state.choose
                                })
                            }
                        } else {
                            if (snap.val().hostChoice === "yes") {
                                currentGame.update({
                                    joinerChoice: "",
                                    hostChoice: "",
                                    state: state.choose
                                })
                            }
                        }
                    })
                    $("yesPlay").off();
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
