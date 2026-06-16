import type { FrontendAnalysis, MobileDeviceProfile, ScanCoverageScore } from "../../types/platform";

const pct = (tested: number, total: number) => (total <= 0 ? 100 : Math.round((tested / total) * 100));
const bounded = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const calculateScanCoverageScore = (analysis: FrontendAnalysis): ScanCoverageScore => {
  const pageUrls = new Set(analysis.pages.map((page) => page.url));
  const testedPageUrls = new Set(analysis.interactionResults.map((interaction) => interaction.pageUrl));
  const formsDetected = analysis.pages.reduce((total, page) => total + page.forms.length, 0);
  const buttonsDetected = analysis.pages.reduce((total, page) => total + page.buttons.length, 0);
  const linksDetected = analysis.pages.reduce((total, page) => total + page.links.length, 0);
  const formsTested = new Set(
    analysis.interactionResults
      .filter((interaction) => /form|submit|input|button/i.test(`${interaction.text} ${interaction.selector}`))
      .map((interaction) => interaction.buttonId),
  ).size;
  const buttonsTested = analysis.interactionResults.length;
  const linksValidated = analysis.navigationGraph.filter((edge) => edge.action).length;
  const endpointUrls = new Set(analysis.networkRequests.map((request) => request.url));
  const analyzedEndpointUrls = new Set(analysis.apiAssertions.map((assertion) => assertion.url));
  const devices = Array.from(
    new Set(
      [
        ...analysis.pages.map((page) => page.deviceName),
        ...analysis.interactionResults.map((interaction) => interaction.deviceName),
        ...analysis.runtimeFindings.map((finding) => finding.deviceName),
      ].filter(Boolean) as MobileDeviceProfile[],
    ),
  );

  const componentScores = [
    pct(testedPageUrls.size || pageUrls.size, pageUrls.size),
    pct(formsTested, formsDetected),
    pct(buttonsTested, buttonsDetected || analysis.interactiveElements.length),
    pct(linksValidated, linksDetected),
    devices.length > 0 ? Math.min(100, devices.length * 25) : 0,
    pct(analyzedEndpointUrls.size, endpointUrls.size),
  ];

  return {
    pagesDiscovered: pageUrls.size,
    pagesTested: testedPageUrls.size || pageUrls.size,
    formsDetected,
    formsTested,
    buttonsDetected: buttonsDetected || analysis.interactiveElements.length,
    buttonsTested,
    linksDetected,
    linksValidated,
    mobileDevicesTested: devices,
    apiEndpointsObserved: endpointUrls.size,
    apiEndpointsAnalyzed: analyzedEndpointUrls.size,
    overallScore: bounded(componentScores.reduce((total, score) => total + score, 0) / componentScores.length),
  };
};
