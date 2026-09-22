export type Box = [number, number, number, number];
export function cropBounds(
  boxes: number[][],
  width: number,
  height: number,
  padding = 22,
): Box {
  return boxes.length
    ? [
        Math.max(0, Math.min(...boxes.map((b) => b[0])) - padding),
        Math.max(0, Math.min(...boxes.map((b) => b[1])) - padding),
        Math.min(width, Math.max(...boxes.map((b) => b[2])) + padding),
        Math.min(height, Math.max(...boxes.map((b) => b[3])) + padding),
      ]
    : [0, 0, width, height];
}
export function displayBox(box: number[], crop: Box, scale: number) {
  return {
    left: (box[0] - crop[0]) * scale,
    top: (box[1] - crop[1]) * scale,
    width: (box[2] - box[0]) * scale,
    height: (box[3] - box[1]) * scale,
  };
}
