window.onload = function() {
  const game = window.game = new Game();
  const player = game.player = {
    id: uuidv4(),
  };
  const client =  game.client = new Client(player, {});
  const options = {
    game, player, client
  }
  game.registerScene(
    "welcome",
    new WelcomeScene(document.getElementById("welcome"),
                     Object.assign({}, options, { id: "welcome" }))
  );

  game.registerScene(
    "waitingforopponent",
    new WaitingForOpponentScene(document.getElementById("waitingforopponent"),
                                Object.assign({}, options, { id: "waitingforopponent" }))
  );

  game.registerScene(
    "waiting",
    new Scene(document.getElementById("waiting"),
              Object.assign({}, options, { id: "waiting" }))
  );

  game.registerScene(
    "colorpicker",
    new ColorPickerScene(document.getElementById("colorpicker"),
              Object.assign({}, options, { id: "colorpicker" }))
  );

  game.registerScene(
    "gameover",
    new Scene(document.getElementById("gameover"),
              Object.assign({}, options, { id: "gameover" }))
  );
};

function getPositionForButton(btn) {
  let parent = btn.closest("section[data-position]");
  let position = parent.dataset.position;
  return position.toLowerCase().trim()
}
