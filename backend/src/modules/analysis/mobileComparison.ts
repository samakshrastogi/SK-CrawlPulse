import type { FrontendAnalysis, MobileComparisonSummary, MobileDeviceProfile } from "../../types/platform";

const signatureOf = (summary: string, pageUrl: string) => `${summary.toLowerCase()}::${pageUrl}`;

export const buildMobileComparison = (analysis: FrontendAnalysis): MobileComparisonSummary | undefined => {
  const devices = Array.from(
    new Set(analysis.runtimeFindings.map((finding) => finding.deviceName).filter(Boolean) as MobileDeviceProfile[]),
  );

  if (devices.length <= 1) {
    return undefined;
  }

  const signatureDevices = new Map<string, Set<MobileDeviceProfile>>();
  const signatureFindings = new Map<string, string[]>();

  analysis.runtimeFindings.forEach((finding) => {
    if (!finding.deviceName) {
      return;
    }

    const signature = signatureOf(finding.summary, finding.pageUrl);
    const deviceSet = signatureDevices.get(signature) ?? new Set<MobileDeviceProfile>();
    deviceSet.add(finding.deviceName);
    signatureDevices.set(signature, deviceSet);
    signatureFindings.set(signature, [...(signatureFindings.get(signature) ?? []), finding.findingId]);
  });

  const commonIssueIds = Array.from(signatureDevices.entries())
    .filter(([, deviceSet]) => devices.every((device) => deviceSet.has(device)))
    .flatMap(([signature]) => signatureFindings.get(signature) ?? []);

  const deviceOnlyIssues = devices.map((deviceName) => ({
    deviceName,
    findingIds: analysis.runtimeFindings
      .filter((finding) => finding.deviceName === deviceName)
      .filter((finding) => (signatureDevices.get(signatureOf(finding.summary, finding.pageUrl))?.size ?? 0) === 1)
      .map((finding) => finding.findingId),
  }));

  return {
    devicesTested: devices,
    commonIssueIds,
    deviceOnlyIssues,
    summary: `${devices.length} device profiles were tested. ${commonIssueIds.length} issue signal${commonIssueIds.length === 1 ? "" : "s"} appeared across all devices, and ${deviceOnlyIssues.reduce((total, item) => total + item.findingIds.length, 0)} issue signal${deviceOnlyIssues.reduce((total, item) => total + item.findingIds.length, 0) === 1 ? "" : "s"} were device-specific.`,
  };
};
