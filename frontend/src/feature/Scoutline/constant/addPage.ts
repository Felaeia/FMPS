export const FREQUENCIES = ["5 min", "15 min", "Hourly", "Daily"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

// Labels for the progress pills. "Live" is reached when the page is handed
// off to monitoring, so this screen itself only ever shows stages 0 to 2.
export const STAGES = ["Configure", "Script", "Preview", "Live"] as const;
export type AddPageStage = 0 | 1 | 2;

export type ScriptStatus = "idle" | "writing" | "ready";
export type PreviewStatus = "idle" | "running" | "done";

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
export type NewPageDraft = AddPageConfig & { script: string };

export const INITIAL_CONFIG: AddPageConfig = {
  url: "",
  name: "",
  description: "Post text, date, reactions and photos from each new post",
  includeImages: true,
  frequency: "15 min",
  postsPerRun: 3,
  tags: [],
};