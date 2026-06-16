export type TestPriority = "P0" | "P1" | "P2" | "P3";
export type AnalysisRunStatus =
  | "queued"
  | "running"
  | "awaiting_checkpoint"
  | "completed"
  | "failed";
export type TestCategory =
  | "functional"
  | "negative"
  | "boundary"
  | "edge"
  | "ux"
  | "integration"
  | "performance";
export type LogLevel = "info" | "warn" | "error";
export type FindingSeverity = "low" | "medium" | "high";
export type FindingType =
  | "console_error"
  | "request_failure"
  | "js_exception"
  | "visual_regression"
  | "accessibility"
  | "api_contract"
  | "boundary_limit"
  | "api_security";
export type MobileDeviceProfile = "Desktop" | "iPhone 15" | "Pixel 7" | "Galaxy S23" | "iPad";
export type ScenarioPackType =
  | "auth"
  | "search"
  | "cart"
  | "forms"
  | "pagination"
  | "tables"
  | "filters"
  | "uploads";

export interface BrowserCookieInput {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface ManualCheckpointConfig {
  enabled: boolean;
  instructions?: string;
  checkpointLabel?: string;
  timeoutSeconds?: number;
}

export type LoginPromptAction = "continue_without_login" | "continue_after_login";

export interface LoginPromptConfig {
  enabled: boolean;
  instructions?: string;
  checkpointLabel?: string;
  timeoutSeconds?: number;
  autoContinueWithoutLogin?: boolean;
}

export interface LoginFlowConfig {
  url?: string;
  waitForSelector?: string;
  waitForUrlIncludes?: string;
  headed?: boolean;
  manualCheckpoint?: ManualCheckpointConfig;
}

export interface AuthConfig {
  storageStatePath?: string;
  cookies?: BrowserCookieInput[];
  headers?: Record<string, string>;
  login?: LoginFlowConfig;
}

export interface AnalysisRequest {
  targetUrl: string;
  operator?: {
    email?: string;
    name?: string;
  };
  backend?: {
    githubRepoUrl?: string;
    uploadedPath?: string;
  };
  auth?: AuthConfig;
  options?: {
    maxPages?: number;
    maxLinksPerPage?: number;
    maxDepth?: number;
    maxInteractionsPerPage?: number;
    domainAllowlist?: string[];
    excludePathPatterns?: string[];
    includeScreenshots?: boolean;
    runBackendValidation?: boolean;
    respectRobotsTxt?: boolean;
    streamHtmlPreview?: boolean;
    crawlProfile?: "auto" | "generic" | "youtube" | "ecommerce" | "dashboard" | "auth-heavy";
    deviceProfile?: MobileDeviceProfile;
    mobileDevices?: MobileDeviceProfile[];
    strictBehaviorMode?: boolean;
    promptForLogin?: boolean;
    loginPrompt?: LoginPromptConfig;
    resumeFrom?: ResumeState;
  };
}

export interface ResumeState {
  previousRunId: string;
  mode: "failed_page" | "failed_interaction";
  pageUrl?: string;
  interactionId?: string;
  completedPageUrls?: string[];
  completedInteractionIds?: string[];
}

export interface RunLogEntry {
  logId?: string;
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
}

export interface ArtifactRecord {
  artifactId: string;
  runId: string;
  kind:
    | "preview"
    | "interaction_failure"
    | "interaction_before"
    | "interaction_after"
    | "scenario"
    | "boundary";
  relatedPageUrl?: string;
  relatedInteractionId?: string;
  fileName: string;
  absolutePath: string;
  publicUrl: string;
  createdAt: string;
}

export interface LiveSessionSnapshot {
  url: string;
  title: string;
  html?: string;
  previewImageUrl?: string;
  capturedAt: string;
  consoleEvents: string[];
  networkEvents: string[];
}

export interface ProgressUpdate {
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
  pagesPreview?: LivePagePreview[];
  liveSession?: LiveSessionSnapshot;
  checkpoint?: {
    kind?: "manual_auth" | "login_choice";
    label: string;
    instructions: string;
    expiresAt?: string;
    loginUrl?: string;
    allowedActions?: LoginPromptAction[];
    autoContinueWithoutLogin?: boolean;
  };
}

export interface CrawlElement {
  id?: string;
  pageUrl?: string;
  tag: string;
  text: string;
  selector: string;
  href?: string;
  type?: string;
  role?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  selector: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export interface FormDescriptor {
  selector: string;
  method: string;
  action: string;
  fields: FormField[];
}

export interface PageAnalysis {
  url: string;
  title: string;
  routePath: string;
  depth: number;
  headings: string[];
  buttons: CrawlElement[];
  links: CrawlElement[];
  inputs: CrawlElement[];
  forms: FormDescriptor[];
  discoveredLinks: string[];
  interactionNotes: string[];
  previewImageUrl?: string;
  htmlPreview?: string;
  deviceName?: MobileDeviceProfile;
}

export interface LivePagePreview {
  url: string;
  title: string;
  routePath: string;
  interactiveCount: number;
  headings: string[];
  buttons: string[];
  links: string[];
  previewImageUrl?: string;
  htmlPreview?: string;
}

export interface NavigationEdge {
  from: string;
  to: string;
  action: string;
  interactionId?: string;
  result?: "PASS" | "FAIL";
}

export interface NetworkObservation {
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  pageUrl?: string;
  failed?: boolean;
  failureText?: string;
  latencyMs?: number;
  contentType?: string;
  responseShape?: string[];
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  deviceName?: MobileDeviceProfile;
}

export interface FailureCluster {
  clusterId: string;
  title: string;
  summary: string;
  occurrences: number;
  pages: string[];
  interactionIds: string[];
  screenshotUrl?: string;
  suggestions: string[];
}

export interface RuntimeFinding {
  findingId: string;
  type: FindingType;
  severity: FindingSeverity;
  pageUrl: string;
  summary: string;
  details: string;
  evidence: string[];
  screenshotUrl?: string;
  relatedInteractionId?: string;
  deviceName?: MobileDeviceProfile;
  rootCause?: RootCauseAnalysis;
}

export interface ScenarioPackResult {
  scenarioId: string;
  pack: ScenarioPackType;
  pageUrl: string;
  pageTitle: string;
  status: "PASS" | "FAIL" | "INFO";
  summary: string;
  details: string[];
  screenshotUrl?: string;
  suggestions: string[];
  deviceName?: MobileDeviceProfile;
}

export interface ApiAssertion {
  assertionId: string;
  url: string;
  method: string;
  pageUrl?: string;
  status?: number;
  latencyMs?: number;
  passed: boolean;
  issues: string[];
  responseShape?: string[];
  deviceName?: MobileDeviceProfile;
}

export interface FrontendAnalysis {
  baseUrl: string;
  pages: PageAnalysis[];
  interactiveElements: CrawlElement[];
  interactionResults: InteractionResult[];
  navigationGraph: NavigationEdge[];
  networkRequests: NetworkObservation[];
  coverageReport: CoverageReport;
  failureClusters: FailureCluster[];
  runtimeFindings: RuntimeFinding[];
  scenarioResults: ScenarioPackResult[];
  apiAssertions: ApiAssertion[];
  securityFindings: ApiSecurityFinding[];
  coverageScore: ScanCoverageScore;
  rootCauseAnalyses: RootCauseAnalysis[];
  mobileComparison?: MobileComparisonSummary;
  warnings: string[];
}

export interface InteractionResult {
  buttonId: string;
  pageUrl: string;
  text: string;
  action: "click" | "fill" | "check" | "select";
  selector: string;
  beforeUrl: string;
  afterUrl: string;
  result: "PASS" | "FAIL";
  error: string | null;
  issueSummary?: string;
  domChanged: boolean;
  apiCallTriggered: boolean;
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
  screenshotPath?: string;
  screenshotUrl?: string;
  deviceName?: MobileDeviceProfile;
}

export interface CoverageReport {
  total_buttons: number;
  tested: number;
  passed: number;
  failed: number;
  coverage: string;
}

export interface GeneratedTestCase {
  testId: string;
  category: TestCategory;
  priority: TestPriority;
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
  deviceName?: MobileDeviceProfile;
}

export interface RootCauseAnalysis {
  findingId: string;
  probableRootCause: string;
  technicalExplanation: string;
  userImpact: string;
  suggestedFix: string;
  confidenceScore: number;
  evidence: string[];
}

export interface ApiSecurityFinding {
  securityFindingId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  category:
    | "unauthenticated_sensitive_endpoint"
    | "missing_authentication_headers"
    | "unsafe_cors"
    | "sensitive_data_exposure"
    | "error_spike"
    | "missing_rate_limit_signal"
    | "insecure_http_usage";
  requestUrl: string;
  method: string;
  pageUrl?: string;
  status?: number;
  evidence: string[];
  remediation: string;
  deviceName?: MobileDeviceProfile;
}

export interface ScanCoverageScore {
  pagesDiscovered: number;
  pagesTested: number;
  formsDetected: number;
  formsTested: number;
  buttonsDetected: number;
  buttonsTested: number;
  linksDetected: number;
  linksValidated: number;
  mobileDevicesTested: MobileDeviceProfile[];
  apiEndpointsObserved: number;
  apiEndpointsAnalyzed: number;
  overallScore: number;
}

export interface MobileComparisonSummary {
  devicesTested: MobileDeviceProfile[];
  commonIssueIds: string[];
  deviceOnlyIssues: Array<{
    deviceName: MobileDeviceProfile;
    findingIds: string[];
  }>;
  summary: string;
}

export interface BackendValidationResult {
  provided: boolean;
  ownershipSignals: string[];
  matchedEndpoints: string[];
  mismatchedEndpoints: string[];
  observations: string[];
}

export interface ReportSection {
  title: string;
  summary: string;
  details: string[];
}

export interface AnalysisReport {
  runId: string;
  generatedAt: string;
  overview: ReportSection;
  issues: ReportSection;
  performance: ReportSection;
  mermaidFlowchart: string;
  pdfOutline: string[];
}

export interface PlatformAnalysisResult {
  runId: string;
  request: AnalysisRequest;
  frontend: FrontendAnalysis;
  testCases: GeneratedTestCase[];
  backendValidation: BackendValidationResult;
  report: AnalysisReport;
  rootCauseAnalyses: RootCauseAnalysis[];
  securityFindings: ApiSecurityFinding[];
  coverageScore: ScanCoverageScore;
  mobileComparison?: MobileComparisonSummary;
}

export interface AnalysisRunView {
  runId: string;
  status: AnalysisRunStatus;
  parentRunId?: string;
  retryOfRunId?: string;
  request: AnalysisRequest;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  expectedDurationSeconds?: number;
  progress: ProgressUpdate;
  logs: RunLogEntry[];
  artifacts: ArtifactRecord[];
  pages: PageAnalysis[];
  interactions: InteractionResult[];
  failureClusters: FailureCluster[];
  result?: PlatformAnalysisResult;
  error?: string;
}
