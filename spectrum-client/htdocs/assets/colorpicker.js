"use strict";

const TAU = Math.PI + Math.PI;

function radians2degrees(angle) {
  return angle * 180/Math.PI;
}

function degrees2radians(angle) {
  return angle * Math.PI/180;
}

class ColorDisc {
  constructor(elem, options) {
    this.elem = elem || document.createElement("canvas");
    this.elem.classList.add("colordisc");
    this.options = Object.assign({}, options);
    this.elem.addEventListener("click", this);
    this.currentAngle = options.currentAngle || 0;
  }

  get context2d() {
    return this.elem.getContext("2d");
  }

  getHueFromAngle(angle) {
    let rotation = radians2degrees(angle);
    // could bias towards hues that appear visually distinct with the target device(s)?
    let hue = this.options.incrementDegrees * Math.floor(rotation/this.options.incrementDegrees);
    return hue;
  }

  render() {
    this._render(
      degrees2radians(this.options.incrementDegrees || 15),
      this.options.radius || 300,
      this.options.innerRadius || 100,
    );
  }

  _render(incrementRadians, radius, innerRadius) {
    let origin = this.getOriginRect();
    let centerPt = {
      x: origin.radius,
      y: origin.radius
    };
    let startAngle = 0;
    let endAngle;
    const CIRCLE = Math.PI * 2 + 0.0001;

    for (endAngle = incrementRadians; endAngle < CIRCLE; endAngle += incrementRadians) {
      startAngle = endAngle - incrementRadians;
      let hue = this.getHueFromAngle(startAngle);
      let hslColor = this.getCssColorFromHue(hue);

      this.drawSlice(
        centerPt,
        startAngle, endAngle, radius, innerRadius,
        hslColor, "#ffffff"
      );
    }
  }

  drawSlice(origin, startAngle, endAngle, radius, innerRadius, fillColor, outlineColor) {
    let ctx = this.context2d;
    let path = new Path2D();
    let startPt = this.getPtFromAngle(startAngle, radius, origin);
    let endPt = this.getPtFromAngle(endAngle, radius, origin);
    let innerStartPt = this.getPtFromAngle(startAngle, innerRadius, origin);
    let calculatedAngle = this.getAngleFromPt(innerStartPt);
    let innerEndPt = this.getPtFromAngle(endAngle, innerRadius, origin);
    path.moveTo(innerStartPt.x, innerStartPt.y);
    path.arc(origin.x, origin.y, innerRadius, startAngle, endAngle);
    path.lineTo(endPt.x, endPt.y);
    path.arc(origin.x, origin.y, radius, endAngle, startAngle, true);

    path.closePath();
    if (fillColor) {
      // console.log("drawSlice: ", radians2degrees(startAngle), innerStartPt, fillColor);
      ctx.fillStyle = fillColor;
      ctx.fill(path);
    }
    if (outlineColor) {
      ctx.strokeStyle = outlineColor;
      ctx.stroke(path);
    }
  }

  getCssColorFromHue(hue) {
    return `hsl(${hue.toFixed(2)}, 100%, 50%)`;
  }

  setCurrentAngle(angle) {
    this.currentAngle = angle;
    // snap to the middle of the color step
    let hue = this.getHueFromAngle(angle);
    this.elem.dispatchEvent(new CustomEvent("colorchange", {
      bubbles: true,
      detail: {
        hue,
        cssColor: this.getCssColorFromHue(hue),
        degrees: radians2degrees(angle),
        radians: angle,
      }
    }));
  }

  plotPoint(pt, color="#ffffff") {
    let ctx = this.elem.getContext("2d");
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, 2*Math.PI, false);
    ctx.stroke();
    return pt;
  }

  getAngleFromPt(pt) {
    // pt is offsets from the center of the circle
    // Note: atan2 takes y, x NOT x, y
    let horizontalAngle = Math.atan2(pt.y, pt.x) % TAU;
    let verticalAngle = Math.atan2(pt.x, pt.y) % TAU;
    let angle = horizontalAngle;
    if (angle < 0) {
      angle = TAU + angle;
    }
    return angle;
  }

  getPtFromAngle(angle, radius, origin) {
    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;
    return {
      x: origin ? x + origin.x : x,
      y: origin ? y + origin.y : y,
    };
  }

  getOriginRect() {
    if (!this._origin) {
      let rect = this.elem.getBoundingClientRect();
      this._origin = {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        x: rect.x,
        y: rect.y,
        top: rect.top,
        halfWidth: rect.width/2,
        halfHeight: rect.height/2,
        radius: rect.width/2,
      };
    }
    return this._origin;
  }

  getCoordFromEvent(event) {
    let origin = this.getOriginRect();
    let coord = {
      x: event.pageX - origin.x,
      y: event.pageY - origin.y,
    };
    return coord;
  }

  normalizeCoord(pt) {
    // express x & y coordinates as offsets from center of the wheel
    let origin = this.getOriginRect();
    return {
      x: pt.x - origin.halfWidth,
      y: pt.y - origin.halfHeight,
    };
  }

  handleEvent(event) {
    let pt = this.getCoordFromEvent(event.changedTouches ? event.changedTouches[0] : event);
    switch (event.type) {
      case "click": {
        let normalizedPt = this.normalizeCoord(pt);
        let angle = this.getAngleFromPt(normalizedPt);
        this.plotPoint(pt); // using 0,0 from top left
        console.log("handling click", radians2degrees(angle), pt, normalizedPt, this.getHueFromAngle(angle));
        this.setCurrentAngle(angle);
        break;
      }
    }
  }

  uninit() {
    this.elem.removeEventListener("click", this);
  }
}

class ColorPicker {
  constructor(elem, options={}) {
    this.clickTarget = elem;
    this.options = options;
    this.containerNode = options.containerNode || document.body;
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("offscreen");
  }
  handleEvent(event) {
    if (event.type == "colorchange") {
      this.detach();
    }
  }
  render(options={}) {
    let size;
    Object.assign(this.options, options);
    if (this.options.radius) {
      size = this.options.radius * 2;
    } else {
      let dims = this.containerNode.getBoundingClientRect();
      size = Math.min(dims.width, dims.height);
    }
    let canvas = this.canvas;
    console.log("creating canvas with size: " + size);
    canvas.width = canvas.height = size;
    this.containerNode.appendChild(canvas);

    this.colorDisc = options.colorWheel || new ColorDisc(canvas, {
      incrementDegrees: this.options.incrementDegrees || 15,
      radius: size / 2 - 10,
    });
  }
  attachTo(elem) {
    if (this.clickTarget) {
      this.detach();
    }
    this.clickTarget = elem;
    this.colorDisc.elem.classList.remove("offscreen");
    this.clickTarget.classList.add("selected");
    this.colorDisc.render();
    this.colorDisc.elem.addEventListener("colorchange", this);
  }
  detach() {
    this.clickTarget.classList.remove("selected");
    this.colorDisc.elem.classList.add("offscreen");
    this.colorDisc.elem.removeEventListener("colorchange", this);
  }
}
