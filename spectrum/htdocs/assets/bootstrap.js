window.onload = function() {
  const game = window.game = new Game();

  class Client extends FakeAPIMixin(SpectrumClient) {};

  const client =  game.client = new Client(window.config);
  const sceneArgs = {
    game, client
  };
  game.registerScene(
    "welcome",
    new WelcomeScene(document.getElementById("welcome"),
                     Object.assign({}, sceneArgs, { id: "welcome" }))
  );

  game.registerScene(
    "colorpicker",
    new ColorPickerScene(
      document.getElementById("colorpicker"),
      Object.assign({}, sceneArgs, {
        id: "colorpicker",
        colorCount: 2,
      })
    )
  );

  game.registerScene(
    "gameover",
    new GameOverScene(document.getElementById("gameover"),
              Object.assign({}, sceneArgs, { id: "gameover" }))
  );
  // start at the welcome screen
  game.switchScene("welcome");
};
