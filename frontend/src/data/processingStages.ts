import type { ProcessingStage } from "../types/analysis";

export const processingStages: ProcessingStage[] = [
  {
    label: "Preparing analysis job",
    summary: "Checking the input and preparing the run.",
    technical: "Validate request payload and initialize execution settings.",
  },
  {
    label: "Crawling frontend routes",
    summary: "Opening the site and finding interactive areas.",
    technical: "Load the page and scan visible buttons, links, inputs, and button-like controls.",
  },
  {
    label: "Mapping navigation flow",
    summary: "Tracking what each action changes.",
    technical: "Record URL transitions, DOM updates, and request activity per interaction.",
  },
  {
    label: "Generating test cases",
    summary: "Turning findings into checks.",
    technical: "Generate structured functional, edge, negative, and UX test scenarios.",
  },
  {
    label: "Correlating backend signals",
    summary: "Matching frontend actions with backend signals.",
    technical: "Compare observed requests with provided repository or upload context.",
  },
  {
    label: "Assembling report artifacts",
    summary: "Building the final output.",
    technical: "Compile coverage, flowchart, results, and report-ready artifacts.",
  },
] as const;
