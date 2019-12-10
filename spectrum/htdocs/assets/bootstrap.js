window.onload = function() {
  const game = window.game = new Game();
  const _APIMixin = config.mockLocalAPI ? FakeAPIMixin : HttpAPIMixin;
  class Client extends _APIMixin(SpectrumClient) {};

  const client =  game.client = new Client(window.config);
  const sceneArgs = {
    game, client
  };

  let tmplNode = document.querySelector("#content-strings");
  const strings = game.strings = new GameStrings(tmplNode);
  strings.init();

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

  game.registerScene(
    "notavailable",
    new NotAvailableScene(document.getElementById("notavailable"),
              Object.assign({}, sceneArgs, { id: "notavailable" }))
  );

  game.registerScene(
    "startup",
    new InitializeScene(document.getElementById("initializing"),
              Object.assign({}, sceneArgs, { id: "startup" }))
  );
  // start at the welcome screen
  game.switchScene("startup");
};
