import { expect, it } from "vitest";
import { cropBounds, displayBox } from "./geometry";
it("clips crop bounds to the PDF page", () =>
  expect(cropBounds([[5, 10, 100, 50]], 120, 80, 22)).toEqual([0, 0, 120, 72]));
it("keeps top-left coordinates without a second vertical flip", () =>
  expect(displayBox([72, 90, 144, 110], [50, 70, 160, 140], 2)).toEqual({
    left: 44,
    top: 40,
    width: 144,
    height: 40,
  }));
it("rotated displayed page scales the same way", () =>
  expect(displayBox([700, 72, 740, 140], [690, 60, 760, 160], 0.5)).toEqual({
    left: 5,
    top: 6,
    width: 20,
    height: 34,
  }));
