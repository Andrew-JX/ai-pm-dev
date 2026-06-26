export const prdQuestions = [
  {
    key: 'idea',
    label: 'Product idea',
    prompt: 'What product do you want to build in one sentence?',
    promptZh: '用一句话描述你想做的产品是什么？',
  },
  {
    key: 'targetUsers',
    label: 'Target users',
    prompt: 'Who is the first user group this product should serve?',
    promptZh: '第一批目标用户是谁？',
  },
  {
    key: 'painPoints',
    label: 'Pain points',
    prompt: 'What is the sharpest user pain or scenario?',
    promptZh: '最尖锐的用户痛点或场景是什么？',
  },
  {
    key: 'currentWorkaround',
    label: 'Current workaround',
    prompt: 'How do users solve this problem today?',
    promptZh: '用户现在是怎么解决这个问题的？',
  },
  {
    key: 'coreWorkflow',
    label: 'Core workflow',
    prompt: 'What core workflow takes users from entry to value?',
    promptZh: '从进入到获得价值的核心流程是什么？',
  },
  {
    key: 'mvpScope',
    label: 'MVP must-haves',
    prompt: 'List the v1 must-haves — at most 3, separated by semicolons (a comma stays inside one item). More than 3 means you have not prioritized.',
    promptZh: '列出 v1 的必做项 —— 最多 3 个，用分号分隔（逗号算同一条内部）。超过 3 个就是还没定优先级。',
  },
  {
    key: 'oneThing',
    label: 'The one thing',
    prompt: 'If you could ship only ONE of those, which one proves the idea?',
    promptZh: '如果只能上线其中一个，哪一个能验证这个想法？',
  },
  {
    key: 'nonGoals',
    label: 'Non-goals',
    prompt: 'Name at least one thing you are deliberately NOT doing in v1 (and why).',
    promptZh: '至少说出一件 v1 故意不做的事（以及为什么）。',
  },
  {
    key: 'dataModel',
    label: 'Data model',
    prompt: 'What data must the product record or generate?',
    promptZh: '产品必须记录或生成哪些数据？',
  },
  {
    key: 'deterministicRules',
    label: 'Deterministic rules',
    prompt: 'Which calculations or decisions must be deterministic rather than AI-generated?',
    promptZh: '哪些计算或决策必须是确定性的，而不是由 AI 生成？',
    aiRelated: true,
  },
  {
    key: 'aiBoundaries',
    label: 'AI boundaries',
    prompt: 'What should AI do, and what should AI never decide by itself?',
    promptZh: 'AI 应该做什么，又绝不能自己决定什么？',
    aiRelated: true,
  },
  {
    key: 'trustMechanism',
    label: 'Trust mechanism',
    prompt: 'What evidence, sources, or state should be shown behind AI output?',
    promptZh: 'AI 输出背后应展示哪些证据、来源或状态？',
    aiRelated: true,
  },
  {
    key: 'risks',
    label: 'Risks',
    prompt: 'What privacy, safety, permission, or misleading-output risks matter?',
    promptZh: '有哪些隐私、安全、权限或误导性输出方面的风险？',
  },
  {
    key: 'acceptanceCriteria',
    label: 'Primary success metric',
    prompt: 'One measurable signal that v1 worked (a single number or observable result).',
    promptZh: '一个可衡量的成功信号（单一数字或可观察的结果）。',
  },
];

export const projectTypes = ['ai-tool', 'saas', 'consumer', 'internal-tool', 'general'];

// AI-specific questions only apply to AI-centric products. For other declared types
// they are skipped and recorded as not-applicable, instead of forcing blank answers.
export function questionsForType(type) {
  if (!type || type === 'ai-tool' || type === 'general') {
    return prdQuestions;
  }
  return prdQuestions.filter((question) => !question.aiRelated);
}

export function questionText(question, index, lang) {
  const body = lang === 'zh' ? question.promptZh : question.prompt;
  return `${index + 1}. ${body}`;
}

export function parseQuickPrdStdin(stdin) {
  const trimmed = stdin.trim();
  if (trimmed.startsWith('{')) {
    try {
      return { kind: 'json', values: JSON.parse(trimmed) };
    } catch {
      throw new Error('Invalid JSON stdin for quick PRD input.');
    }
  }
  return { kind: 'lines', lines: stdin.split(/\r?\n/) };
}
