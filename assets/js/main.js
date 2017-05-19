$('.modal').modal({ backdrop: 'static', keyboard: false })
$(".modal").modal("show")

let database = firebase.database();
let userRef = database.ref("/users");
let gameRef = database.ref("/game");
let currentUser = "";

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
    let key = "";
    gameRef.push().set({
        createrName: currentUser,
        joinerName: "",
        state: 0,

    })
    $(this).addClass("disabled").off()

})

function callGameBtn() {
    gameRef.orderByChild("state").equalTo(0).on("value", function(snap) {
        if (snap.val().createrName !== currentUser) {
            createGameBtn(snap.key);
        }
    })
}

function createGameBtn(key) {
    let btn = $("<button>");
    btn.text("Join game");
    btn.attr("data-key", key);
    btn.addClass("btn btn-primary joinGame");
    btn.attr("type", "button");
    $("#gameList").append(btn);
    $(btn).on("click", function() {
        gameRef.child($(this).attr("data-key")).update({
            joinerName: currentUser
        })
    })
}
