"use strict";

const TAU = Math.PI + Math.PI;

function radians2degrees(angle) {
  return angle * 180/Math.PI;
}

function degrees2radians(angle) {
  return angle * Math.PI/180;
}

class ColorWheel {
  constructor(elem, options) {
    this.elem = elem || document.createElement("canvas");
    this.options = Object.assign({}, options);
    this.elem.addEventListener("mousedown", this);
    this.elem.addEventListener("touchstart", this);
    this.dragStartPoint = null;
    this.currentPoint = null;
    this.previousPoint = null;
    this.rotationDegrees = 0;
  }

  get context2d() {
    return this.elem.getContext("2d");
  }

  getHueFromAngle(angle) {
    let rotation = radians2degrees(angle);
    // could bias towards hues that appear visually distinct with the target device(s)?
    let hue = this.wheelIncrementDegrees * Math.round(rotation/this.wheelIncrementDegrees);
    return hue;
  }

  render() {
    this.renderColorWheel(
      this.options.incrementDegrees || 15,
      this.options.radius || 300,
      this.options.maskRadius || 100,
    );
  }

  renderColorWheel(incrementDegrees, radius, maskRadius) {
    let ctx = this.context2d;
    this.wheelIncrementDegrees = incrementDegrees;
    let origin = this.getOriginRect();
    let centerPt = {
      x: origin.radius,
      y: origin.radius
    };
    let angle = 0;
    let endAngle;
    const CIRCLE = Math.PI * 2 + 0.0001;
    const incrementAngle = degrees2radians(incrementDegrees);

    for (endAngle = incrementAngle; endAngle <= CIRCLE; endAngle += incrementAngle) {
      angle = endAngle - incrementAngle;
      let hue = this.getHueFromAngle(angle);
      let hslColor = `hsl(${hue.toFixed(2)}, 100%, 50%)`;
      ctx.fillStyle = hslColor;

      ctx.beginPath();
      ctx.moveTo(centerPt.x, centerPt.y);
      // Arc Parameters: x, y, radius, startingAngle (radians), endingAngle (radians), antiClockwise (boolean)
      // console.log("angle: %s, endAngle: %s, hslColor: %s", angle.toFixed(2), endAngle.toFixed(2), hslColor);
      ctx.arc(centerPt.x, centerPt.y, radius, angle, endAngle, false);
      ctx.lineTo(centerPt.x, centerPt.y);
      ctx.fill();
    }
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(centerPt.x, centerPt.y);
    ctx.arc(centerPt.x, centerPt.y, maskRadius, 0, CIRCLE, false);
    ctx.fill();

    for(let i=0; i<12; i++) {
      let angle = i*30;
      let pt = this.getPtFromAngle(angle, 10);
      console.log("Render angle: ", angle, pt.x.toFixed(2), pt.y.toFixed(2));
    }
  }

  drawArc(startDegrees, endDegrees, radius) {
    let startAngle = degrees2radians(startDegrees);
    let endAngle = degrees2radians(endDegrees);
    // endAngle
    let canvas = this.elem;
    let ctx = canvas.getContext("2d");
    let origin = this.getOriginRect();
    if (!radius) {
      radius = origin.radius - 5;
    }
    let startPt = this.getPtFromAngle(startDegrees, radius);
    let endPt = this.getPtFromAngle(endDegrees, radius);
    startPt = this.plotPoint(startPt, 'red');
    endPt = this.plotPoint(endPt, 'black');

    // ctx.moveTo(origin.radius, origin.radius);
    ctx.beginPath();
    ctx.arc(origin.radius, origin.radius, radius, startAngle, endAngle, true);
    ctx.lineTo(origin.radius, origin.radius);
    ctx.strokeStyle = 'black';
    ctx.stroke();
  }

  plotPoint(pt, color) {
    let origin = this.getOriginRect();
    // convert from center (origin) - based coord
    pt = {
      x: pt.x + origin.halfWidth,
      y: origin.halfHeight - pt.y,
    };
    let ctx = this.elem.getContext("2d");
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, 2*Math.PI, false);
    ctx.stroke();
    return pt;
  }

  handleMove(startPt, endPt) {
    let delta = this.getAngleBetweenPts(startPt, endPt);
    let rotation = this.rotationDegrees = this.rotationDegrees + delta;
    // snap to the middle of the color step
    let hue = this.getHueFromAngle(degrees2radians(rotation) - degrees2radians(this.wheelIncrementDegrees/2));
    this.elem.dispatchEvent(new CustomEvent("wheelrotate", {
      bubbles: true,
      detail: {
        delta,
        rotation,
        hue,
      }
    }));
  }

  getAngleBetweenPts(startPt, endPt) {
    let startDegrees = this.getAngleFromPt(startPt);
    let endDegrees = this.getAngleFromPt(endPt);
    let delta = endDegrees - startDegrees;
    // correct for points across the 360-0 boundary
    // stuff will go wonky if the points are more than 180deg apart
    if (delta > 180) {
      endDegrees -= 360;
    } else if (delta <= -180) {
      startDegrees -= 360;
    }
    let resultDegrees = endDegrees - startDegrees;
    return resultDegrees;
  }

  getAngleFromPt(pt) {
    // Note: atan2 takes y, x NOT x, y
    let horizontalAngle = Math.atan2(pt.y, pt.x) % TAU;
    let verticalAngle = Math.atan2(pt.x, pt.y) % TAU;
    let angle = verticalAngle;
    if (angle < 0) {
      angle = TAU + angle;
    }
    return radians2degrees(angle);
  }

  getPtFromAngle(degrees, radius) {
    if (!radius) {
      radius = this.getOriginRect().radius;
    }
    let angle = degrees2radians(degrees);
    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;
    return {
      x, y
    };
  }

  distanceBetweenPoints(p1, p2) {
   let dx = p2.x - p1.x;
   let dy = p2.y - p1.y;
   let distanceSquared = dx * dx + dy * dy;
   return Math.sqrt(distanceSquared);
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
    let normalized = this.normalizeCoord(coord);
    // console.log("got coord from event: ", event, coord, normalized);
    return normalized;
  }

  normalizeCoord(pt) {
    // express x & y coordinates as offsets from center of the wheel
    let origin = this.getOriginRect();
    return {
      x: pt.x - origin.halfWidth,
      y: origin.halfHeight - pt.y,
    };
  }

  startDrag(startPt, pt) {
    this._isDragging = true;
    this.previousPoint = startPt;
    this.currentPoint = pt;
    this._onNextFrame = this.onNextFrame.bind(this);
    window.requestAnimationFrame(this._onNextFrame);
  }

  onNextFrame() {
    if (this.previousPoint && this.currentPoint) {
      this.handleMove(this.previousPoint, this.currentPoint);
      this.previousPoint = this.currentPoint;
    }
    if (this._isDragging) {
      window.requestAnimationFrame(this._onNextFrame);
    }
  }

  handleEvent(event) {
    const DRAG_THRESHOLD = 8;
    let pt = this.getCoordFromEvent(event.changedTouches ? event.changedTouches[0] : event);
    switch (event.type) {
      case "touchstart":
        if (this._isDragging || this.dragStartPoint) {
          this.resetDrag();
        }
        this.dragStartPoint = pt;
        this.elem.addEventListener("touchmove", this);
        this.elem.addEventListener("touchend", this);
        this.elem.addEventListener("touchcancel", this);
        break;

      case "mousedown":
        if (this._isDragging || this.dragStartPoint) {
          this.resetDrag();
        }
        this.dragStartPoint = pt;
        this.elem.addEventListener("mousemove", this);
        this.elem.addEventListener("mouseup", this);
        break;

      case "touchmove":
      case "mousemove": {
        event.preventDefault();
        if (this._isDragging) {
          this.currentPoint = pt;
        } else {
          let distance = this.distanceBetweenPoints(this.dragStartPoint, pt);
          if (distance > DRAG_THRESHOLD) {
            this.startDrag(this.dragStartPoint, pt);
          }
        }
        break;
      }

      case "touchend":
      case "mouseup": {
        let distance = this.distanceBetweenPoints(this.dragStartPoint, pt);
        // console.log(`moved from ${this.dragStartPoint.x},${this.dragStartPoint.y} to ${pt.x},${pt.y}`, distance);
        if (!this._isDragging && distance <= DRAG_THRESHOLD) {
          // jump straight to the clicked point
          console.log("handling click on pt", pt, this.getAngleFromPt(pt));
          this.rotationDegrees = 0;
          // offset by 90deg.
          // TODO: offset is off by ~10 degrees?
          this.handleMove({ x: 1, y: 0 }, pt);
        }
        this.resetDrag();
        break;
      }

      case "touchcancel": {
        this.resetDrag();
        break;
      }
    }
  }

  resetDrag() {
    this._isDragging = false;
    this.currentPoint = this.previousPoint = this.dragStartPoint = null;

    this.elem.removeEventListener("touchend", this);
    this.elem.removeEventListener("touchmove", this);
    this.elem.removeEventListener("touchcancel", this);
    this.elem.removeEventListener("mousemove", this);
    this.elem.removeEventListener("mouseup", this);
  }

  uninit() {
    this.elem.removeEventListener("click", this);
  }
}
