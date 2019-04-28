const config = {
  type: Phaser.AUTO,
  scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-example',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 900,
        height: 1600
    },
  parent: "phaser-example",
  // autoCenter: Phaser.Scale.CENTER_BOTH,
  scene: {
    preload: preload,
    create: create
  }
};

// let fs_el = document.getElementById("container");
// fs_el.requestFullscreen();
// // go full-screen
// if (fs_el.requestFullscreen) {
// 	fs_el.requestFullscreen();
// } else if (fs_el.webkitRequestFullscreen) {
// 	fs_el.webkitRequestFullscreen();
// } else if (fs_el.mozRequestFullScreen) {
// 	fs_el.mozRequestFullScreen();
// } else if (fs_el.msRequestFullscreen) {
// 	fs_el.msRequestFullscreen();
// }

const game = new Phaser.Game(config);

function preload() {
  this.load.image("logo", "cpu_cooler.jpg");
}

var colors = [0xff0000, 0x00ff00, 0x0000ff]
var n_rows = 4;
var row_height = 200;

class ColorDot extends Phaser.GameObjects.Container {
  constructor(scene, x, y, color1, color2, text, targetScene) {
    super(scene);
    this.scene = scene;
    this.x = x;
    this.y = y;
 
    this.graphics = this.scene.add.graphics();
    var circle = new Phaser.Geom.Circle(50, 50, 100);
    this.graphics.fillStyle(0xff0000, 1.0);   // color: 0xRRGGBB
    this.graphics.fillCircleShape(circle);

    // Phaser.Display.Align.In.Center(this.graphics);
 
    this.add(this.graphics);
 
    // this.button.on('pointerdown', function () {
    //   this.scene.scene.start(targetScene);
    // }.bind(this));
 
    // this.button.on('pointerover', function () {
    //   this.button.setTexture(key2);
    // }.bind(this));
    //
    // this.button.on('pointerout', function () {
    //   this.button.setTexture(key1);
    // }.bind(this));
 
    this.scene.add.existing(this);
  }
}

function create() {
  // this.add.image(400, 300, 'logo');

  for (let i=0; i<n_rows; i++) {
    let row_container = this.add.container(0, i*row_height);
    for (let j=0; j<colors.length; j++) {

       	
      this.colorDot = new ColorDot(this, 400, 500, 0xff0000, 0x00ff00, 'Menu', 'Title');

      // let circle_graphics = new Phaser.GameObjects.Graphics();
      // row_container.add(circle_graphics);
      // var circle = new Phaser.Geom.Circle(5, 5, 300);
      // graphics.fillStyle(col, 1.0);   // color: 0xRRGGBB
      // graphics.fillCircleShape(circle);
    }
  }

  // var graphics = this.add.graphics();
  // var circle = new Phaser.Geom.Circle(900/2, 1600/2, 300);
  // // graphics.strokeCircleShape(circle);
  // graphics.fillStyle(0xff0000, 1.0);   // color: 0xRRGGBB
  // graphics.fillCircleShape(circle);
}


