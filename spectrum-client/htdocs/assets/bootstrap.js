window.onload = function() {
  const game = window.game = new Game();
  let scene;
  scene = new WelcomeScene(document.getElementById("welcome"), {
    id: "welcome",
    game
  });
  game.registerScene("welcome", scene);

  scene = new Scene(document.getElementById("waiting"), {
    id: "waiting",
    game
  });
  game.registerScene("waiting", scene);

  scene = new Scene(document.getElementById("colorpicker"), {
    id: "colorpicker",
    game
  });
  game.registerScene("colorpicker", scene);

  scene = new Scene(document.getElementById("gameover"), {
    id: "gameover",
    game
  });
  game.registerScene("gameover", scene);

  game.start();
};

function getPositionForButton(btn) {
  let parent = btn.closest("section[data-position]");
  let position = parent.dataset.position;
  return position.toLowerCase().trim()
}
