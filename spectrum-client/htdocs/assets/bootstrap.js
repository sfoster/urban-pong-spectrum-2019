window.onload = function() {
  window.game = new Game();
  game.client = new Client();
  ["welcome", "waiting", "colorpicker", "gameover"].forEach(function(id) {
    let elem = document.getElementById(id);
    let scene = new Scene(elem, {
      id
    });
    game.registerScene(id, scene);
  });
  game.start();
};

