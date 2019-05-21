"use strict";

const TAU = Math.PI + Math.PI;

function radians2degrees(angle) {
  return angle * 180/Math.PI;
}

function degrees2radians(angle) {
  return angle * Math.PI/180;
}

function getHueFromAngle(angle) {
  // could bias towards hues that appear distinct?
  return angle * 180/Math.PI;
}

class ColorWheel {
  constructor(elem, options) {
    this.elem = elem;
    this.options = Object.assign({}, options);
    this.elem.addEventListener("mousedown", this);
    this.dragStartPoint = null;
  }

  get context2d() {
    return this.elem.getContext("2d");
  }

  renderColorWheel(incrementDegrees, radius, maskRadius) {
    let ctx = this.context2d;
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
      let hue = getHueFromAngle(angle);
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
  }

  drawArc(startDegrees, endDegrees) {
    let startAngle = degrees2radians(startDegrees);
    let endAngle = degrees2radians(endDegrees);
    let canvas = this.elem;
    let ctx = canvas.getContext("2d");
    let origin = this.getOriginRect();
    let radius = origin.radius - 5;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(origin.radius, origin.radius);
    ctx.arc(origin.radius, origin.radius, radius, startAngle, endAngle, false);
    ctx.lineTo(origin.radius, origin.radius);
    ctx.stroke();
  }

  handleMove(startPt, endPt) {
    let resultDegrees = this.getAngleBetweenPts(startPt, endPt);
    this.elem.dispatchEvent(new CustomEvent("wheelrotate", {
      bubbles: true,
      detail: resultDegrees,
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

  plotPoint(pt) {
    // pt = this.normalizeCoord(pt);
    let ctx = this.context2d;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'blue';
    console.log("plotPoint: ", pt);
    // let radians = Math.atan2(pt.x, pt.y);
    // console.log("radians: ", radians);
    // let radius = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
    // ctx.moveTo(centerPt.x, centerPt.y);
    // ctx.arc(centerPt.x, centerPt.y,
    //         radius, -radians, 0);
    // ctx.stroke();
  }

  handleEvent(event) {
    switch (event.type) {
      case "mousedown":
        this.dragStartPoint = this.getCoordFromEvent(event);
        this.elem.addEventListener("mousemove", this);
        this.elem.addEventListener("mouseup", this);
        break;
      case "mousemove": {
        let pt = this.getCoordFromEvent(event);
        let distance = this.distanceBetweenPoints(this.dragStartPoint, pt);
        if (distance > 5) {
          // this.handleMove(this.dragStartPoint, pt);
        }
        break;
      }
      case "mouseup": {
        let pt = this.getCoordFromEvent(event);
        let distance = this.distanceBetweenPoints(this.dragStartPoint, pt);
        // console.log(`moved from ${this.dragStartPoint.x},${this.dragStartPoint.y} to ${pt.x},${pt.y}`, distance);
        if (distance > 5) {
          this.handleMove(this.dragStartPoint, pt);
        } else {
          console.log("probably a click");
        }
        this.elem.removeEventListener("mousemove", this);
        this.elem.removeEventListener("mouseup", this);
        break;
      }
    }
  }
  uninit() {
    this.elem.removeEventListener("click", this);
  }
}
