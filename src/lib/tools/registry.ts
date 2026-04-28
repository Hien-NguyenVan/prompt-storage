export type ToolEntry = {
  slug: string;
  name: string;
  description: string;
};

export const TOOLS: ToolEntry[] = [
  {
    slug: "image-grid-splitter",
    name: "Cắt ảnh lưới",
    description: "Tự động phát hiện và cắt từng ô ảnh con trong ảnh lưới (grid).",
  },
];

export function getTool(slug: string): ToolEntry | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
