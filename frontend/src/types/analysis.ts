export type AnalysisResponse = {
  runId: string;
  frontend: {
    interactiveElements: Array<{
      id?: string;
      pageUrl?: string;
      text: string;
      selector: string;
    }>;
    navigationGraph: Array<{
      from: string;
      to: string;
      action: string;
      interactionId?: string;
      result?: "PASS" | "FAIL";
    }>;
    coverageReport: {
      total_buttons: number;
      tested: number;
      passed: number;
      failed: number;
      coverage: string;
    };
    interactionResults: Array<{
      buttonId: string;
      pageUrl: string;
      text: string;
      action?: "click" | "fill" | "check" | "select";
      selector: string;
      result: "PASS" | "FAIL";
      error: string | null;
      issueSummary?: string;
      screenshotUrl?: string;
      beforeScreenshotUrl?: string;
      afterScreenshotUrl?: string;
      beforeDomSnippet?: string;
      afterDomSnippet?: string;
      domDiffSummary?: string;
      passReasons?: string[];
      behaviorSignals?: {
        urlChanged: boolean;
        domChanged: boolean;
        apiCallTriggered: boolean;
        consoleTriggered: boolean;
        elementStateChanged: boolean;
        hoverChanged: boolean;
        keyboardTriggered: boolean;
        dialogOpened: boolean;
        popupOpened: boolean;
        downloadTriggered: boolean;
      };
    }>;
    failureClusters: Array<{
      clusterId: string;
      title: string;
      summary: string;
      occurrences: number;
      pages: string[];
      interactionIds: string[];
      screenshotUrl?: string;
      suggestions: string[];
    }>;
    runtimeFindings: Array<{
      findingId: string;
      severity: "low" | "medium" | "high";
      type: string;
      pageUrl: string;
      summary: string;
      details: string;
      evidence: string[];
      screenshotUrl?: string;
      relatedInteractionId?: string;
    }>;
    apiAssertions: Array<{
      assertionId: string;
      url: string;
      method: string;
      pageUrl?: string;
      status?: number;
      latencyMs?: number;
      passed: boolean;
      issues: string[];
      responseShape?: string[];
    }>;
    baseUrl: string;
    pages: Array<{
      url: string;
      title: string;
      routePath: string;
      depth: number;
      headings: string[];
      buttons: Array<{
        text: string;
        selector: string;
      }>;
      links: Array<{
        text: string;
        selector: string;
      }>;
      forms: Array<{
        selector: string;
      }>;
      interactionNotes: string[];
      previewImageUrl?: string;
      htmlPreview?: string;
    }>;
    warnings: string[];
  };
  testCases: Array<{
    testId: string;
    priority: string;
    category: string;
    title: string;
    description: string;
    steps: string[];
    expectedResult: string;
    sourcePage: string;
    status?: "PASS" | "FAIL";
    issueSummary?: string;
    screenshotUrl?: string;
    beforeScreenshotUrl?: string;
    afterScreenshotUrl?: string;
    domDiffSummary?: string;
    suggestions?: string[];
    sourceKind?: "failure_cluster" | "runtime_finding" | "scenario" | "page_smoke";
    sourceLabel?: string;
    affectedFlow?: string;
    userImpact?: string;
    confidence?: "high" | "medium" | "low";
    ownerHint?: string;
    evidenceItems?: string[];
  }>;
  backendValidation: {
    provided: boolean;
    matchedEndpoints: string[];
    mismatchedEndpoints?: string[];
    observations: string[];
  };
  report: {
    overview?: {
      title: string;
      summary: string;
      details: string[];
    };
    issues?: {
      title: string;
      summary: string;
      details: string[];
    };
    performance?: {
      title: string;
      summary: string;
      details: string[];
    };
    mermaidFlowchart: string;
    pdfOutline: string[];
  };
};

export type AnalysisSubmission = {
  targetUrl: string;
  backend: {
    githubRepoUrl?: string;
    uploadedPath?: string;
  };
  auth?: {
    storageStatePath?: string;
    login?: {
      url?: string;
      waitForSelector?: string;
      waitForUrlIncludes?: string;
      headed?: boolean;
      manualCheckpoint?: {
        enabled: boolean;
        instructions?: string;
        checkpointLabel?: string;
        timeoutSeconds?: number;
      };
    };
  };
  options: {
    maxPages: number;
    maxLinksPerPage: number;
    maxDepth: number;
    maxInteractionsPerPage: number;
    domainAllowlist?: string[];
    excludePathPatterns?: string[];
    respectRobotsTxt?: boolean;
    streamHtmlPreview?: boolean;
    crawlProfile?: "auto" | "generic" | "youtube" | "ecommerce" | "dashboard" | "auth-heavy";
    strictBehaviorMode?: boolean;
    promptForLogin?: boolean;
    loginPrompt?: {
      enabled: boolean;
      instructions?: string;
      checkpointLabel?: string;
      timeoutSeconds?: number;
      autoContinueWithoutLogin?: boolean;
    };
  };
};

export type AnalysisOptions = AnalysisSubmission["options"];

export type SavedProject = {
  id: string;
  name: string;
  targetUrl: string;
  repoUrl: string;
  uploadedPath: string;
  pinned: boolean;
  lastUsedAt: string;
};

export type AnalysisRun = {
  runId: string;
  status: "queued" | "running" | "awaiting_checkpoint" | "completed" | "failed";
  parentRunId?: string;
  retryOfRunId?: string;
  request: AnalysisSubmission;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  expectedDurationSeconds?: number;
  logs: Array<{
    timestamp: string;
    level: "info" | "warn" | "error";
    scope: string;
    message: string;
  }>;
  artifacts?: Array<{
    artifactId: string;
    kind: string;
    publicUrl: string;
    relatedPageUrl?: string;
    relatedInteractionId?: string;
  }>;
  pages: AnalysisResponse["frontend"]["pages"];
  interactions: AnalysisResponse["frontend"]["interactionResults"];
  failureClusters: AnalysisResponse["frontend"]["failureClusters"];
  progress: {
    stageKey: string;
    stageLabel: string;
    summary: string;
    technical: string;
    currentPageUrl?: string;
    currentInteractionId?: string;
    expectedDurationSeconds?: number;
    pagesDiscovered?: number;
    interactionsDetected?: number;
    interactionsTested?: number;
    completedPages?: number;
    lastSuccessfulAction?: {
      label: string;
      pageUrl: string;
      interactionId?: string;
      at: string;
    };
    checkpoint?: {
      kind?: "manual_auth" | "login_choice";
      label: string;
      instructions: string;
      expiresAt?: string;
      loginUrl?: string;
      allowedActions?: Array<"continue_without_login" | "continue_after_login">;
      autoContinueWithoutLogin?: boolean;
    };
    liveSession?: {
      url: string;
      title: string;
      html?: string;
      previewImageUrl?: string;
      capturedAt: string;
      consoleEvents: string[];
      networkEvents: string[];
    };
    pagesPreview?: Array<{
      url: string;
      title: string;
      routePath: string;
      interactiveCount: number;
      headings: string[];
      buttons: string[];
      links: string[];
      previewImageUrl?: string;
      htmlPreview?: string;
    }>;
  };
  result?: AnalysisResponse;
  error?: string;
};

export type ProcessingStage = {
  label: string;
  summary: string;
  technical: string;
};

export type GlobalFilters = {
  website: string;
  route: string;
  status: "all" | "PASS" | "FAIL" | "queued" | "running" | "completed" | "failed";
  severity: "all" | "high" | "medium" | "low";
  issueType: string;
};

export type AppView =
  | "overview"
  | "run"
  | "pages"
  | "findings"
  | "tests"
  | "report"
  | "history"
  | "compare"
  | "profile";
