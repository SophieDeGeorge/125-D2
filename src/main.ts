import "./style.css";

document.body.innerHTML = `
  <center><h1>Draw Pad</h1><center>
  
`;

type Point = { x: number; y: number };
const brushThin: number = 1.0;
const brushThick: number = 3.0;
let curBrushSize: number = brushThin;
let toolPreview: Command | null = null;
let toolType: string = "brush";
let stickerString: string;
const stickerSize: string = "30px sans serif";

let curColor: string = "black";

//#region Canvas
////////////////////////////////       Cavnas Creation         ////////////////////////////////////////////////////////

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
document.body.append(canvas);
const buttonContainer = document.createElement("div");
document.body.append(buttonContainer);

// #endregion

//#region Event System
const bus: EventTarget = new EventTarget();

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

bus.addEventListener("drawing-changed", () => {
  redraw(ctx);
});

bus.addEventListener("tool-changed", () => {
  redraw(ctx);
});
//#endregion

//#region Commands
const commands: Command[] = [];
const redoCommands: Command[] = [];

class Command {
  constructor() {}

  drag(_point: Point): void {}
  display(_ctx: CanvasRenderingContext2D): void {}
}
//#endregion

//#region LineCommand
////////////////////////////////       Line Command Class          ////////////////////////////////////////////////////////

class LineCommand extends Command {
  line: Point[] = [];
  brushSize: number;
  color: string;

  constructor(startingPoint: Point, width: number, color: string) {
    super();
    this.line = [startingPoint];
    this.brushSize = width;
    this.color = color;
  }

  override display(ctx: CanvasRenderingContext2D): void {
    if (this.line.length < 1) {
      return;
    }
    ctx.lineWidth = this.brushSize;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.line[0].x, this.line[0].y); // start at the first point
    this.line.forEach((point: Point) => ctx.lineTo(point.x, point.y)); // move endpoint to next point
    ctx.stroke();
  }

  override drag(endPoint: Point): void {
    this.line.push(endPoint);
  }
}
// #endregion

//#region StickerCommand
class StickerCommand extends Command {
  point: Point;
  text: string;

  constructor(point: Point, text: string) {
    super();
    this.point = point;
    this.text = text;
  }

  override display(ctx: CanvasRenderingContext2D): void {
    ctx.font = stickerSize;
    ctx.fillText(this.text, this.point.x, this.point.y);
  }

  override drag(point: Point): void {
    this.point = point;
  }
}
//#endregion

//#region ToolPreviewCommand
////////////////////////////////       Tool Preview Class          ////////////////////////////////////////////////////////

class ToolPreviewCommand extends Command {
  radius: number;
  mouse: Point;
  color: string;

  constructor(mousePosition: Point, brushSize: number, color: string) {
    super();
    this.mouse = mousePosition;
    this.radius = 1.0 * brushSize;
    this.color = color;
  }

  override display(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  override drag(point: Point): void {
    this.mouse = point;
  }
}

//#endregion

//#region StickerPreviewCommand
class StickerPreviewCommand extends Command {
  point: Point;
  text: string;

  constructor(point: Point, text: string) {
    super();
    this.point = point;
    this.text = text;
  }

  override display(ctx: CanvasRenderingContext2D) {
    ctx.font = stickerSize;
    ctx.fillText(this.text, this.point.x, this.point.y);
  }

  override drag(point: Point) {
    this.point = point;
    ctx.font = stickerSize;
    ctx.fillText(this.text, this.point.x, this.point.y);
  }
}

//#endregion

//#region Redraw
////////////////////////////////       Redraw Function        ////////////////////////////////////////////////////////
function redraw(drawCTX: CanvasRenderingContext2D) {
  //Clear Canvas & add white background
  drawCTX.clearRect(0, 0, canvas.width, canvas.height);
  drawCTX.fillStyle = "white";
  drawCTX.fillRect(0, 0, 1024, 1024);
  drawCTX.fillStyle = curColor;

  commands.forEach((command: Command) => command.display(drawCTX));

  if (toolPreview && !(cursor.active)) {
    toolPreview.display(drawCTX);
  }
}
// #endregion

function createLine(point: Point): Command {
  if (toolType == "brush") {
    return new LineCommand(point, curBrushSize, curColor);
  } else {
    return new StickerCommand(point, stickerString);
  }
}

function createPreview(point: Point): Command {
  if (toolType == "brush") {
    return new ToolPreviewCommand(point, curBrushSize, curColor);
  } else {
    return new StickerPreviewCommand(point, stickerString);
  }
}

function randomColor() {
  const temp = Math.floor(Math.random() * 6);
  if (temp == 1) {
    return "black";
  }
  if (temp == 2) {
    return "red";
  }
  if (temp == 3) {
    return "green";
  }
  if (temp == 4) {
    return "blue";
  }
  if (temp == 5) {
    return "yellow";
  } else {
    return "pink";
  }
}

//#region Mouse Input
////////////////////////////////       Mouse Input          ////////////////////////////////////////////////////////
let currentLineCommand: Command;

canvas.addEventListener("mouseenter", (e) => {
  if (cursor.active) {
    currentLineCommand = createLine({ x: e.offsetX, y: e.offsetY });
    commands.push(currentLineCommand);
    notify("drawing-changed");
  }

  toolPreview = createPreview({ x: e.offsetX, y: e.offsetY });
  notify("tool-changed");
});

canvas.addEventListener("mouseout", (_e) => {
  toolPreview = null;
  notify("tool-changed");
});

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;

  toolPreview = null;
  notify("tool-changed");

  currentLineCommand = createLine({ x: e.offsetX, y: e.offsetY });
  commands.push(currentLineCommand);
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    currentLineCommand.drag({ x: e.offsetX, y: e.offsetY });
    notify("drawing-changed");
  } else {
    if (toolPreview) {
      toolPreview.drag({ x: e.offsetX, y: e.offsetY });
    }
    notify("tool-changed");
  }
});

// On mouseUp, stop drawing
canvas.addEventListener("mouseup", (e) => {
  cursor.active = false;
  toolPreview = createPreview({ x: e.offsetX, y: e.offsetY });
  if (toolPreview) {
    toolPreview.drag({ x: e.offsetX, y: e.offsetY });
  }
  notify("tool-changed");
});
//#endregion

//#region Buttons
//#region Clear Button
////////////////////////////////       Clear Button         ////////////////////////////////////////////////////////
// Clear Button
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
clearButton.className = "function-buttons";
buttonContainer.appendChild(clearButton);

// Clear Button Event Listener
clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  notify("drawing-changed");
});
// #endregion

//#region Undo Button
////////////////////////////////       Undo Button         ////////////////////////////////////////////////////////
// Undo Button
const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
undoButton.className = "function-buttons";
buttonContainer.appendChild(undoButton);

// Undo Button Event Listener
undoButton.addEventListener("click", () => {
  if (commands.length < 1) {
    return;
  }
  redoCommands.push(commands.pop() as LineCommand);
  notify("drawing-changed");
});
// #endregion

//#region Redo Button
////////////////////////////////       Redo Button         ////////////////////////////////////////////////////////
// Button
const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
redoButton.className = "function-buttons";
buttonContainer.appendChild(redoButton);

// Redo button event listener
redoButton.addEventListener("click", () => {
  if (redoCommands.length < 1) {
    return;
  }
  commands.push(redoCommands.pop() as LineCommand);
  notify("drawing-changed");
});
// #endregion

//#region Thin Button
////////////////////////////////       Thin Button         ////////////////////////////////////////////////////////
// Button
const thinButton = document.createElement("button");
thinButton.innerHTML = "Thin";
thinButton.className = "tool-bar";
thinButton.style.backgroundColor = "yellow";

buttonContainer.appendChild(thinButton);

// Event Listener
thinButton.addEventListener("click", () => {
  curColor = randomColor();
  curBrushSize = brushThin;
  thinButton.style.backgroundColor = curColor;
  thickButton.style.backgroundColor = "transparent";

  toolType = "brush";
});
// #endregion

//#region Thick Button
////////////////////////////////       Thick Button         ////////////////////////////////////////////////////////
// Button
const thickButton = document.createElement("button");
thickButton.innerHTML = "Thick";
thickButton.className = "tool-bar";
buttonContainer.appendChild(thickButton);

// Event Listener
thickButton.addEventListener("click", () => {
  curColor = randomColor();
  curBrushSize = brushThick;
  thickButton.style.backgroundColor = curColor;
  thinButton.style.backgroundColor = "transparent";

  toolType = "brush";
});
// #endregion

function CreateStickerButton(emoji: string) {
  const newButton: HTMLButtonElement = document.createElement(
    "button",
  ) as HTMLButtonElement;
  newButton.className = "sticker-buttons";
  newButton.innerHTML = emoji;

  newButton.addEventListener("click", () => {
    stickerString = emoji;
    toolType = "sticker";
  });
  buttonContainer.appendChild(newButton);
}

//#region Sticker Buttons
const stickerButtons: string[] = [];
stickerButtons.push("👁️");
stickerButtons.push("🐶");
stickerButtons.push("🥞");

stickerButtons.forEach((element) => {
  CreateStickerButton(element);
});
//#endregion
//#region Add Button
const addButton = document.createElement("button");
addButton.innerHTML = "Add";
addButton.className = "options";
buttonContainer.appendChild(addButton);

addButton.addEventListener("click", () => {
  const result: string | null = prompt("Add New Sticker", "🧝");
  if (result) {
    CreateStickerButton(result);
  }
});
//#endregion

//#region Export Button
const exportButton = document.createElement("button");
exportButton.innerHTML = "Export";
exportButton.className = "options";
buttonContainer.appendChild(exportButton);

exportButton.addEventListener("click", () => {
  const exportCanvas: HTMLCanvasElement = document.createElement(
    "canvas",
  ) as HTMLCanvasElement;
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx: CanvasRenderingContext2D = exportCanvas.getContext(
    "2d",
  ) as CanvasRenderingContext2D;
  exportCtx.scale(4, 4);
  exportCtx.textAlign = "center";
  redraw(exportCtx);

  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});
//#endregion
//#endregion
