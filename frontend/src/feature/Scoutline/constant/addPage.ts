export const FREQUENCIES = ["5 min", "15 min", "Hourly", "Daily"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const STAGES = ["Configure", "Review Script", "Preview", "Approve"] as const;
export type AddPageStage = 0 | 1 | 2 | 3;

export type ScriptStatus = "idle" | "writing" | "ready" | "error";
export type PreviewStatus = "idle" | "running" | "done" | "error";

export type AddPageConfig = {
  url: string;
  name: string; // optional; derived from the URL when left empty
  description: string;
  includeImages: boolean;
  frequency: Frequency;
  postsPerRun: number;
  tags: string[];
};

// What the page hands back once the user approves the preview.
export type NewPageDraft = AddPageConfig & {
  script: string;
  scriptDraftId: string;
};

export const INITIAL_CONFIG: AddPageConfig = {
  url: "",
  name: "",
  description: "Post text, date, reactions and photos from each new post",
  includeImages: true,
  frequency: "15 min",
  postsPerRun: 3,
  tags: [],
};