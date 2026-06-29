export type PhaseStatus = {
  id: string;
  label: string;
  done: boolean;
  status: 'done' | 'current' | 'upcoming';
};

export type ArtifactSummary = {
  id: string;
  title: string;
  path: string;
  relativePath: string;
  phase: string;
  status: 'missing' | 'stub' | 'filled';
  updatedAt: string;
  heading: string;
  preview: string;
};

export type QualityGateResult = {
  overall: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  requiredPass: number;
  requiredTotal: number;
  recommendedPass: number;
  recommendedTotal: number;
  checks: Array<{
    status: 'PASS' | 'WARN' | 'FAIL';
    severity: string;
    name: string;
    fix: string;
  }>;
};

export type NextAction = {
  label: string;
  command: string;
  detail: string;
};

export type ProjectState = {
  target: string;
  projectInitialized: boolean;
  idea: string;
  latestSession: null | {
    name: string;
    path: string;
    idea: string;
  };
  currentPhase?: PhaseStatus;
  phases: PhaseStatus[];
  artifacts: ArtifactSummary[];
  qualityGate: QualityGateResult;
  devPlanGate: QualityGateResult;
  openQuestions: string;
  decisions: string;
  progress: string;
  timeline: Array<{
    at: string;
    phase: string;
    note?: string;
  }>;
  nextAction: NextAction;
  state: Record<string, unknown>;
  phaseOrder: string[];
};

export type ClarificationResponse = {
  status: 'ask' | 'ready' | 'degraded';
  reason?: string;
  questions: string[];
  answers?: Record<string, string>;
  warnings: string[];
  state: Record<string, unknown>;
  runId?: string;
  sessionPath?: string;
  callsPath?: string;
};
