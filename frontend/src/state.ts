import { create } from "zustand";
type ViewState = {
  selected: string | null;
  selectedLink: string | null;
  expanded: string[];
  focus: boolean;
  setSelected: (id: string | null) => void;
  setLink: (id: string | null) => void;
  toggle: (id: string) => void;
  setFocus: (value: boolean) => void;
  reset: () => void;
};
export const useView = create<ViewState>((set) => ({
  selected: null,
  selectedLink: null,
  expanded: [],
  focus: false,
  setSelected: (id) => set({ selected: id, selectedLink: null }),
  setLink: (id) => set({ selectedLink: id, selected: null }),
  toggle: (id) =>
    set((s) => ({
      expanded: s.expanded.includes(id)
        ? s.expanded.filter((k) => k !== id)
        : [...s.expanded, id],
    })),
  setFocus: (value) => set({ focus: value }),
  reset: () =>
    set({ selected: null, selectedLink: null, expanded: [], focus: false }),
}));
