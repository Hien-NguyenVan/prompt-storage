export const AI_MODELS = ["Veo 3.1", "Seedance 2.0", "Kling 3.0"] as const;
export type AIModel = (typeof AI_MODELS)[number];

export const VIDEO_TYPES = [
  { value: "t2v", label: "T2V (Text to Video)" },
  { value: "i2v_multiref", label: "I2V - Multi Reference" },
  { value: "i2v_firstlast", label: "I2V - First & Last Frames" },
] as const;
export type VideoType = (typeof VIDEO_TYPES)[number]["value"];
