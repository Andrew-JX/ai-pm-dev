#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const typeMap = {
  spec: 'product-spec-builder',
  product: 'product-spec-builder',
  requirement: 'product-spec-builder',
  brief: 'design-brief-builder',
  design: 'design-maker',
  plan: 'dev-planner',
  dev: 'dev-planner',
  build: 'dev-builder',
  implement: 'dev-builder',
  bug: 'bug-fixer',
  fix: 'bug-fixer',
  review: 'code-review',
  release: 'release-builder',
};

const routes = [
  {
    skill: 'bug-fixer',
    keywords: ['报错', '错误', '异常', '失败', 'fail', 'error', 'bug', '500', '不符合预期', '修复'],
    instruction: '先收集证据、复现或定位根因，不要直接猜测修复。',
  },
  {
    skill: 'code-review',
    keywords: ['review', '审查', '检查代码', '找风险', '有没有问题', '代码质量'],
    instruction: '按严重程度输出风险、行为回归、测试缺口和文档缺口。',
  },
  {
    skill: 'release-builder',
    keywords: ['发布', '上线', '交付', 'release', 'deploy', '构建', 'ready'],
    instruction: '生成 release checklist，验证构建、测试、配置、回滚和用户路径。',
  },
  {
    skill: 'dev-planner',
    keywords: ['计划', '技术方案', '开发步骤', '怎么开发', '开始开发', '先给技术', '先给 plan', '不要写代码', 'plan', 'planner'],
    instruction: '先给 Plan，不要直接写代码；列出文件、风险和验证方式。',
  },
  {
    skill: 'dev-builder',
    keywords: ['开始实现', '实现', '写代码', 'build', 'execute', '计划确认', '按计划'],
    instruction: '严格按已确认计划执行；超过 5 个文件先停下拆分。',
  },
  {
    skill: 'design-maker',
    keywords: ['页面', '原型', '视觉', '界面', '组件布局', 'design', 'prototype', 'ui'],
    instruction: '输出界面方案、组件、状态、交互和响应式规则。',
  },
  {
    skill: 'design-brief-builder',
    keywords: ['设计规范', '设计说明', 'ux', '交互约束', '信息架构', 'design brief'],
    instruction: '把产品目标转成 UI/UX 约束，不直接做高保真页面。',
  },
  {
    skill: 'product-spec-builder',
    keywords: ['想法', '需求', '功能', '产品', '用户问题', 'spec', 'requirement', 'feature'],
    instruction: '先澄清需求、范围、非目标和验收标准。',
  },
];

const phaseBySkill = {
  'product-spec-builder': 'Product Spec',
  'design-brief-builder': 'Design Brief',
  'design-maker': 'Design',
  'dev-planner': 'Dev Plan',
  'dev-builder': 'Build',
  'bug-fixer': 'Bug Fix',
  'code-review': 'Code Review',
  'release-builder': 'Release',
};

function printHelp() {
  console.log(`AI PM Dev Agent v0.3 task starter

Usage:
  node scripts/start-task.mjs --task "<task>" [options]

Options:
  --task <text>       Task description.
  --type <type>       Force route: spec, brief, design, plan, build, bug, review, release.
  --target <path>     Target project root for --save. Defaults to current directory.
  --save              Save prompt to memory/current-task-prompt.md.
  -h, --help          Show this help.

Examples:
  node scripts/start-task.mjs --task "我想开始实现登录功能，请先给技术计划"
  node scripts/start-task.mjs --type bug --task "页面提交后报 500"
`);
}

function parseArgs(argv) {
  const options = {
    task: '',
    type: '',
    target: process.cwd(),
    save: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--task') {
      options.task = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--type') {
      options.type = (argv[index + 1] ?? '').toLowerCase();
      index += 1;
    } else if (arg === '--target') {
      options.target = argv[index + 1] ?? process.cwd();
      index += 1;
    } else if (arg === '--save') {
      options.save = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function selectRoute(task, type) {
  if (type) {
    const skill = typeMap[type];
    if (!skill) {
      throw new Error(`Unknown --type "${type}". Use one of: ${Object.keys(typeMap).join(', ')}`);
    }
    return routes.find((route) => route.skill === skill) ?? {
      skill,
      instruction: '按所选 Skill 的流程工作。',
    };
  }

  const normalized = task.toLowerCase();
  return routes.find((route) => route.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) ?? routes[routes.length - 1];
}

function buildPrompt(task, route) {
  return `# AI PM Dev Task Prompt

Selected Skill: ${route.skill}
Skill Path: skills/${route.skill}/SKILL.md

请先阅读 CLAUDE.md，并按其中的 AI PM Dev Agent 流程工作。
然后阅读 ${`skills/${route.skill}/SKILL.md`}，按该 Skill 的输入、流程、输出和停止条件执行。

本次任务：
${task}

执行要求：
- ${route.instruction}
- 如果是开发任务，先读取项目本地规则和相关 docs。
- 不要扩大任务范围。
- 完成后说明验证结果、剩余风险，以及是否需要记录到 memory。
`;
}

function savePrompt(target, prompt, task, route) {
  if (!existsSync(target)) {
    throw new Error(`Target directory does not exist: ${target}`);
  }
  const targetRoot = resolve(target);
  const promptPath = join(targetRoot, 'memory', 'current-task-prompt.md');
  const statePath = join(targetRoot, '.ai-pm-dev', 'state.json');
  const state = {
    version: '0.4.0',
    task,
    skill: route.skill,
    phase: phaseBySkill[route.skill] ?? 'Unknown',
    skillPath: `skills/${route.skill}/SKILL.md`,
    nextStep: route.instruction,
    updatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(promptPath), { recursive: true });
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(promptPath, prompt, 'utf8');
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return { promptPath, statePath };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    if (!options.task.trim()) {
      throw new Error('Missing required --task "<task>".');
    }
    const route = selectRoute(options.task, options.type);
    const prompt = buildPrompt(options.task, route);
    console.log(prompt);
    if (options.save) {
      const { promptPath, statePath } = savePrompt(options.target, prompt, options.task, route);
      console.log(`Saved prompt: ${promptPath}`);
      console.log(`Saved state: ${statePath}`);
    }
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
