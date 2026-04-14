import type { VideoType } from "./constants";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "staff";
};

export type ImageRef = {
  id: string;
  set_id: string;
  name: string;
  prompt_text: string;
  order_index: number;
  created_at: string;
};

export type SubVideo = {
  id: string;
  set_id: string;
  order_index: number;
  type: VideoType;
  video_prompt: string;
  video_ref_source_order: number | null;
  created_at: string;
};

export type SubVideoImageRef = {
  sub_video_id: string;
  image_ref_id: string;
};

export type SubVideoFrameRef = {
  id: string;
  sub_video_id: string;
  position: "first" | "last";
  image_ref_id: string | null;
  source_video_order: number | null;
};

export type PromptSet = {
  id: string;
  name: string;
  model: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PromptSetWithCreator = PromptSet & {
  creator: { email: string; full_name: string | null } | null;
  video_count: number;
};

export type FullPromptSet = PromptSet & {
  image_refs: ImageRef[];
  sub_videos: (SubVideo & {
    image_refs: string[];
    frame_refs: SubVideoFrameRef[];
  })[];
};
