import "./style.css";

document.body.innerHTML = `
  <h1>Draw Pad</h1>
`;

type Point = { x: number; y: number };

const lines: LineCommand[] = [];
const redoLines: LineCommand[] = [];
let curLine: LineCommand;

////////////////////////////////       Cavnas Creation         ////////////////////////////////////////////////////////

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };
canvas.width = 256;
canvas.height = 256;
document.body.append(canvas);

canvas.addEventListener("drawing-changed", redraw);

////////////////////////////////       Mouse Input          ////////////////////////////////////////////////////////

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;

  curLine = new LineCommand({ x: e.offsetX, y: e.offsetY });
  lines.push(curLine);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    curLine.drag({ x: e.offsetX, y: e.offsetY });
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// On mouseUp, stop drawing
canvas.addEventListener("mouseup", (_e) => {
  cursor.active = false;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

class LineCommand {
  line: Point[] = [];

  constructor(startingPoint: Point) {
    this.line = [startingPoint];
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.line.length < 1) {
      return;
    }
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(this.line[0].x, this.line[0].y); // start at the first point
    this.line.forEach((point: Point) => ctx.lineTo(point.x, point.y)); // move endpoint to next point
    ctx.stroke();
  }

  drag(endPoint: Point) {
    this.line.push(endPoint);
  }
}

////////////////////////////////       Redraw         ////////////////////////////////////////////////////////
function redraw() {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas from 0,0 to maxwidth, maxheight
    lines.forEach((line: LineCommand) => line.display(ctx));
    console.log("finished redraw");
  }
}

////////////////////////////////       Clear Button         ////////////////////////////////////////////////////////
// Clear Button
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

// Clear Button Event Listener
if (ctx) {
  clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.splice(0, lines.length);
  });
}

////////////////////////////////       Undo Button         ////////////////////////////////////////////////////////
// Undo Button
const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

// Undo Button Event Listener
undoButton.addEventListener("click", () => {
  if (ctx && (lines.length > 0)) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redoLines.push(lines.pop() as LineCommand);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

////////////////////////////////       Redo Button         ////////////////////////////////////////////////////////
// Redo Button
const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

// Redo button event listener
redoButton.addEventListener("click", () => {
  if (ctx && (redoLines.length > 0)) {
    lines.push(redoLines.pop() as LineCommand);
  }
  canvas.dispatchEvent(new Event("drawing-changed")); // Repeating code, Make function
});
