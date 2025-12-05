import "./style.css";

document.body.innerHTML = `
  <h1>Draw Pad</h1>
`;

type Point = { x: number; y: number };

const lines: LineCommand[] = [];
const redoLines: LineCommand[] = [];
let curLine: LineCommand;
const brushThin: number = 1.0;
const brushThick: number = 3.0;
let curBrushSize: number = brushThin;
let toolPreview: ToolPreviewCommand | null = null;
let stickerPreview: StickerPreviewCommand | null = null;
let brushType: string = "brush";
let stickerString: string;
let curSticker: StickerCommand;
const stickers: StickerCommand[] = [];
const redoStickers: StickerCommand[] = [];

//#region Canvas
////////////////////////////////       Cavnas Creation         ////////////////////////////////////////////////////////

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const cursor = { active: false, x: 0, y: 0 };
canvas.width = 256;
canvas.height = 256;
canvas.style.cursor = "none";
document.body.append(canvas);
const buttonContainer = document.createElement("div");
document.body.append(buttonContainer);

canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-changed", redraw);
// #endregion

//#region Event System
const bus: EventTarget = new EventTarget();

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

bus.addEventListener("drawing-changed", () => {
  redraw();
});

bus.addEventListener("tool-changed", () => {
  redraw();
});
//#endregion

//#region Mouse Input
////////////////////////////////       Mouse Input          ////////////////////////////////////////////////////////
canvas.addEventListener("mouseover", (e) => {
  if (cursor.active == false) {
    if (brushType == "brush") {
      toolPreview = new ToolPreviewCommand(
        { x: e.offsetX, y: e.offsetY },
        curBrushSize,
      );
    }

    stickerPreview = new StickerPreviewCommand(
      { x: e.offsetX, y: e.offsetY },
      stickerString,
    );
    //canvas.dispatchEvent(new Event("tool-changed"));
    notify("tool-changed");
  }
});

canvas.addEventListener("mouseenter", (e) => {
  if (brushType == "brush") {
    toolPreview = new ToolPreviewCommand(
      { x: e.offsetX, y: e.offsetY },
      curBrushSize,
    );
  }

  stickerPreview = new StickerPreviewCommand(
    { x: e.offsetX, y: e.offsetY },
    stickerString,
  );
  //canvas.dispatchEvent(new Event("tool-changed"));
  notify("tool-changed");
});

canvas.addEventListener("mouseout", (_e) => {
  toolPreview = null;
  stickerPreview = null;
  //canvas.dispatchEvent(new Event("tool-changed"));
  notify("tool-changed");
  console.log("mouse out");
});

canvas.addEventListener("mousedown", (e) => {
  toolPreview = null;
  stickerPreview = new StickerPreviewCommand(
    { x: e.offsetX, y: e.offsetY },
    stickerString,
  );
  notify("tool-changed");
  cursor.active = true;

  if (brushType == "brush") {
    curLine = new LineCommand({ x: e.offsetX, y: e.offsetY }, curBrushSize);
    lines.push(curLine);
  }
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    if (brushType == "brush") {
      curLine.drag({ x: e.offsetX, y: e.offsetY });
    } else if (brushType == "sticker" && stickerPreview) {
      stickerPreview.drag({ x: e.offsetX, y: e.offsetY });
    }

    notify("drawing-changed");
  } else {
    toolPreview = new ToolPreviewCommand(
      { x: e.offsetX, y: e.offsetY },
      curBrushSize,
    );
    stickerPreview = new StickerPreviewCommand(
      { x: e.offsetX, y: e.offsetY },
      stickerString,
    );
    //canvas.dispatchEvent(new Event("tool-changed"));
    notify("tool-changed");
  }
});

// On mouseUp, stop drawing
canvas.addEventListener("mouseup", (e) => {
  cursor.active = false;
  if (brushType == "sticker") {
    curSticker = new StickerCommand(
      { x: e.offsetX, y: e.offsetY },
      stickerString,
    );
    stickers.push(curSticker);

    notify("drawing-changed");
  }
});
//#endregion

//#region LineCommand
////////////////////////////////       Line Command Class          ////////////////////////////////////////////////////////

class LineCommand {
  line: Point[] = [];
  brushSize: number;

  constructor(startingPoint: Point, width: number) {
    this.line = [startingPoint];
    this.brushSize = width;
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.line.length < 1) {
      return;
    }
    ctx.lineWidth = this.brushSize;
    ctx.beginPath();
    ctx.moveTo(this.line[0].x, this.line[0].y); // start at the first point
    this.line.forEach((point: Point) => ctx.lineTo(point.x, point.y)); // move endpoint to next point
    ctx.stroke();
  }

  drag(endPoint: Point) {
    this.line.push(endPoint);
  }
}
// #endregion

class StickerCommand {
  point: Point;
  text: string;

  constructor(point: Point, text: string) {
    this.point = point;
    this.text = text;
  }

  displaySticker(ctx: CanvasRenderingContext2D) {
    if (ctx) {
      ctx.font = "50px sans serif";
      ctx.fillText(this.text, this.point.x, this.point.y);
    }
  }
}

//#region ToolPreviewCommand
////////////////////////////////       Tool Preview Class          ////////////////////////////////////////////////////////

class ToolPreviewCommand {
  radius: number;
  mouse: Point;

  constructor(mousePosition: Point, brushSize: number) {
    this.mouse = mousePosition;
    this.radius = 1.0 * brushSize;
  }

  DrawPreview(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.stroke();
  }
}

class StickerPreviewCommand {
  point: Point;
  text: string;

  constructor(point: Point, text: string) {
    this.point = point;
    this.text = text;
  }

  DrawStickerPreview(ctx: CanvasRenderingContext2D) {
    ctx.font = "50px sans serif";
    ctx.fillText(this.text, this.point.x, this.point.y);
  }

  drag(point: Point) {
    console.log("Sticker preview drag");
    this.point = point;
    if (ctx) {
      ctx.font = "50px sans serif";
      ctx.fillText(this.text, this.point.x, this.point.y);
    }
  }
}

//#endregion

//#region Redraw
////////////////////////////////       Redraw Function        ////////////////////////////////////////////////////////
function redraw() {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas from 0,0 to maxwidth, maxheight
    lines.forEach((line: LineCommand) => line.display(ctx));
    if (toolPreview && (brushType == "brush")) {
      toolPreview.DrawPreview(ctx);
    }
    stickers.forEach((sticker: StickerCommand) => sticker.displaySticker(ctx));
    if (stickerPreview && (brushType == "sticker")) {
      stickerPreview.DrawStickerPreview(ctx);
    }
  }
}
// #endregion

//#region Clear Button
////////////////////////////////       Clear Button         ////////////////////////////////////////////////////////
// Clear Button
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
//document.body.append(clearButton);
buttonContainer.appendChild(clearButton);

// Clear Button Event Listener
if (ctx) {
  clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.splice(0, lines.length);
    stickers.splice(0, stickers.length);
  });
}
// #endregion

//#region Undo Button
////////////////////////////////       Undo Button         ////////////////////////////////////////////////////////
// Undo Button
const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
buttonContainer.appendChild(undoButton);

// Undo Button Event Listener
undoButton.addEventListener("click", () => {
  if (ctx && (lines.length > 0)) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (brushType == "brush") {
      redoLines.push(lines.pop() as LineCommand);
    }
  }
  if (ctx && (stickers.length > 0)) {
    if (brushType == "sticker") {
      redoStickers.push(stickers.pop() as StickerCommand);
    }
  }

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
  if (ctx && (redoLines.length > 0)) {
    if (brushType == "brush") {
      lines.push(redoLines.pop() as LineCommand);
    }
  }
  if (ctx && (redoStickers.length > 0)) {
    if (brushType == "sticker") {
      stickers.push(redoStickers.pop() as StickerCommand);
    }
  }

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
  brushType = "brush";
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
  brushType = "brush";
});
// #endregion

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

function CreateStickerButton(emoji: string) {
  const newButton: HTMLButtonElement = document.createElement(
    "button",
  ) as HTMLButtonElement;
  newButton.className = "sticker-buttons";
  newButton.innerHTML = emoji;

  newButton.addEventListener("click", () => {
    stickerString = emoji;
    brushType = "sticker";
    console.log(brushType);
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
