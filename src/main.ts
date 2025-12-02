import "./style.css";

document.body.innerHTML = `
  <h1>Draw Pad</h1>
`;

type Point = { x: number; y: number };
type Line = Point[];
let curLine: Line;
let lines: Line[] = [];

////////////////////////////////       Cavnas Creation         ////////////////////////////////////////////////////////
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.append(canvas);

const ctx = canvas.getContext("2d");

const cursor = { active: false, x: 0, y: 0 };

////////////////////////////////       Canvas Event Listeners          ////////////////////////////////////////////////////////

canvas.addEventListener("drawing-changed", redraw);

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
  curLine = [];
  lines.push(curLine);
  curLine.push({ x: cursor.x, y: cursor.y });
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    curLine.push({ x: cursor.x, y: cursor.y });
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// On mouseUp, stop drawing
canvas.addEventListener("mouseup", (_e) => {
  cursor.active = false;
  curLine = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

////////////////////////////////       Redraw         ////////////////////////////////////////////////////////
function redraw() {
  console.log("redraw");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas from 0,0 to maxwidth, maxheight
    for (const line of lines) { // For each line in lines array,
      if (line.length > 1) {
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y); // Set line start point at line[0]
        for (const point of line) {
          ctx.lineTo(point.x, point.y); // Set line endpoint to pointxy
        }
        ctx.stroke(); // Draw line from line[0] to point
      }
    }
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
    lines = [];
  });
}
