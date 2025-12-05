import "./style.css";

document.body.innerHTML = `
  <h1>Draw Pad</h1>
`;

type Point = { x: number; y: number };
const brushThin: number = 1.0;
const brushThick: number = 3.0;
let curBrushSize: number = brushThin;
let toolPreview: Command | null = null;
let toolType: string = "brush";
let stickerString: string;

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

//canvas.addEventListener("drawing-changed", redraw(ctx));
//canvas.addEventListener("tool-changed", redraw(ctx));
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

  constructor(startingPoint: Point, width: number) {
    super();
    this.line = [startingPoint];
    this.brushSize = width;
  }

  override display(ctx: CanvasRenderingContext2D): void {
    if (this.line.length < 1) {
      return;
    }
    ctx.lineWidth = this.brushSize;
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
    ctx.font = "50px sans serif";
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

  constructor(mousePosition: Point, brushSize: number) {
    super();
    this.mouse = mousePosition;
    this.radius = 1.0 * brushSize;
  }

  override display(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, this.radius, 0, 2 * Math.PI);
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
    ctx.font = "50px sans serif";
    ctx.fillText(this.text, this.point.x, this.point.y);
  }

  override drag(point: Point) {
    //console.log("Sticker preview drag");
    this.point = point;
    ctx.font = "50px sans serif";
    ctx.fillText(this.text, this.point.x, this.point.y);
  }
}

//#endregion

//#region Redraw
////////////////////////////////       Redraw Function        ////////////////////////////////////////////////////////
function redraw(drawCTX: CanvasRenderingContext2D) {
  //console.log("redraw called");
  //Clear Canvas & add white background
  drawCTX.clearRect(0, 0, canvas.width, canvas.height);
  drawCTX.fillStyle = "white";
  drawCTX.fillRect(0, 0, 1024, 1024);
  drawCTX.fillStyle = "black";

  commands.forEach((command: Command) => command.display(drawCTX));

  if (toolPreview && !(cursor.active)) {
    toolPreview.display(drawCTX);
  }
}
// #endregion

function createLine(point: Point): Command {
  if (toolType == "brush") {
    return new LineCommand(point, curBrushSize);
  } else {
    return new StickerCommand(point, stickerString);
  }
}

function createPreview(point: Point): Command {
  if (toolType == "brush") {
    return new ToolPreviewCommand(point, curBrushSize);
  } else {
    return new StickerPreviewCommand(point, stickerString);
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
  console.log("mouseup");
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
clearButton.innerHTML = "clear";
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
undoButton.innerHTML = "undo";
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
redoButton.innerHTML = "redo";
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
thinButton.style.backgroundColor = "transparent";
if (curBrushSize == brushThin) {
  thinButton.style.backgroundColor = "yellow";
}
buttonContainer.appendChild(thinButton);

// Event Listener
thinButton.addEventListener("click", () => {
  if (curBrushSize != brushThin) {
    curBrushSize = brushThin;
    thinButton.style.backgroundColor = "yellow";
    thickButton.style.backgroundColor = "transparent";
  }
  toolType = "brush";
});
// #endregion

//#region Thick Button
////////////////////////////////       Thick Button         ////////////////////////////////////////////////////////
// Button
const thickButton = document.createElement("button");
thickButton.innerHTML = "Thick";
thickButton.style.backgroundColor = "transparent";
buttonContainer.appendChild(thickButton);

// Event Listener
thickButton.addEventListener("click", () => {
  if (curBrushSize != brushThick) {
    curBrushSize = brushThick;
    thickButton.style.backgroundColor = "yellow";
    thinButton.style.backgroundColor = "transparent";
  }
  toolType = "brush";
});
// #endregion

//#region Add Button
const addButton = document.createElement("button");
addButton.innerHTML = "+";
addButton.style.backgroundColor = "transparent";
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
exportButton.style.backgroundColor = "transparent";
buttonContainer.appendChild(exportButton);

exportButton.addEventListener("click", () => {
  const exportCanvas: HTMLCanvasElement = document.createElement(
    "canvas",
  ) as HTMLCanvasElement;
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  exportCanvas.setAttribute("width", "1024px");
  exportCanvas.setAttribute("height", "1024px");
  const exportCtx = exportCanvas.getContext(
    "2d",
  ) as CanvasRenderingContext2D;

  exportCtx.scale(4, 4);
  exportCtx.save();
  //redraw(exportCtx);

  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();

  //notify("drawing-changed");
});
//#endregion

function CreateStickerButton(emoji: string) {
  const newButton: HTMLButtonElement = document.createElement(
    "button",
  ) as HTMLButtonElement;
  newButton.className = "sticker-buttons";
  newButton.innerHTML = emoji;

  newButton.addEventListener("click", () => {
    stickerString = emoji;
    toolType = "sticker";
    console.log(toolType);
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
//#endregion
