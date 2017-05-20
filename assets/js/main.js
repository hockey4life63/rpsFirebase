$('.modal').modal({ backdrop: 'static', keyboard: false })
$(".modal").modal("show")

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
    }
    newRef.set(newItem).then(function() {
        gameState(newRef.key)
    })
    $(this).addClass("disabled").off()
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
            console.log(snap.key)
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

function gameState(key) {
    // 	state: {
    //     open: 0,
    //     joined: 1,
    //     choose: 2,
    //     winner: 3,
    //     playagian: 4,
    //     quit: 5
    // }
    let currentGame = gameRef.child(key);

    currentGame.on("value", function(snap) {
        let data = snap.val();
        switch (data.state) {
            case state.open:
                gameRef.orderByChild("state").equalTo(state.open).off()
                $(".allGames").hide()
                console.log("game is open")
                break;

            case state.joined:

                console.log("game is joined");
                break;

            case state.choose:

                break;

            case state.winner:

                break;

            case state.playagian:

                break;

            case state.quit:

                break;

        }
    })



}
