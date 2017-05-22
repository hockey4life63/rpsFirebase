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
    $("#chatBox").append(div);
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
    callGameBtn();
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
    let host = false;
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
                $(".rpsChoice").on("click", function() {
                    currentChoice = $(this).attr("choice");
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
                            currentGame.once("value", function(snap) {
                                if (snap.val().joinerChoice !== "") {
                                    currentGame.update({
                                        state: state.winner
                                    })
                                }
                            })
                        } else {
                            currentGame.once("value", function(snap) {
                                if (snap.val().hostChoice !== "") {
                                    currentGame.update({
                                        state: state.winner
                                    })
                                }
                            })
                        }
                    })

                })

                break;

            case state.winner:
                $("#choiceSubmit").off("click")
                $(".rpsChoice").off("click")
                console.log("Made it to Winner State!!!!!")

                break;

            case state.playagian:

                break;

            case state.quit:

                break;

        }
    })



}
