import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ArtifactSummary, ProjectState } from './types';
import './styles.css';

const defaultTarget = new URLSearchParams(window.location.search).get('target') || '';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.result?.stderr || 'Request failed');
  }
  return data;
}

function statusLabel(status: ArtifactSummary['status']) {
  if (status === 'filled') return 'Ready';
  if (status === 'stub') return 'Stub';
  return 'Missing';
}

function gateClass(overall: string) {
  if (overall === 'PASS') return 'good';
  if (overall === 'WARN') return 'warn';
  if (overall === 'FAIL') return 'bad';
  return 'muted';
}

function App() {
  const [target, setTarget] = useState(defaultTarget);
  const [state, setState] = useState<ProjectState | null>(null);
  const [idea, setIdea] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function loadProject(nextTarget = target) {
    setBusy('Loading project');
    setMessage('');
    try {
      const query = nextTarget ? `?target=${encodeURIComponent(nextTarget)}` : '';
      const data = await requestJson<ProjectState>(`/api/project${query}`);
      setState(data);
      setTarget(data.target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    loadProject();
  }, []);

  const currentArtifacts = useMemo(() => {
    if (!state?.currentPhase) return state?.artifacts || [];
    return state.artifacts.filter((item) => item.phase === state.currentPhase?.id || ['questions', 'progress', 'decisions'].includes(item.id));
  }, [state]);

  async function submitIdea(event: FormEvent) {
    event.preventDefault();
    if (!idea.trim()) return;
    setBusy('Generating quick PRD');
    setMessage('');
    try {
      const data = await requestJson<{ project: ProjectState; result: { stdout: string } }>('/api/prd', {
        method: 'POST',
        body: JSON.stringify({ target, idea }),
      });
      setState(data.project);
      setIdea('');
      setMessage(data.result.stdout || 'PRD generated');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function runCheck() {
    setBusy('Running PRD check');
    setMessage('');
    try {
      const data = await requestJson<{ project: ProjectState; result: { stdout: string } }>('/api/check', {
        method: 'POST',
        body: JSON.stringify({ target }),
      });
      setState(data.project);
      setMessage(data.result.stdout || 'Check complete');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function recordCheckpoint() {
    setBusy('Recording checkpoint');
    setMessage('');
    try {
      const data = await requestJson<{ project: ProjectState; result: { stdout: string } }>('/api/checkpoint', {
        method: 'POST',
        body: JSON.stringify({ target, phase: state?.currentPhase?.id || 'build', note }),
      });
      setState(data.project);
      setNote('');
      setMessage(data.result.stdout || 'Checkpoint recorded');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function recordDecision() {
    if (!decision.trim()) return;
    setBusy('Recording decision');
    setMessage('');
    try {
      const data = await requestJson<{ project: ProjectState; result: { stdout: string } }>('/api/decision', {
        method: 'POST',
        body: JSON.stringify({ target, decision }),
      });
      setState(data.project);
      setDecision('');
      setMessage(data.result.stdout || 'Decision recorded');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">AI PM Dev Phase 1</p>
          <h1>产品化工作台</h1>
        </div>
        <form className="target-form" onSubmit={(event) => { event.preventDefault(); loadProject(target); }}>
          <label htmlFor="target">项目路径</label>
          <div className="target-row">
            <input id="target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="E:\studyspace\my-product" />
            <button type="submit" disabled={Boolean(busy)}>刷新</button>
          </div>
        </form>
      </section>

      <section className="workspace-grid">
        <aside className="rail">
          <p className="section-label">阶段生命线</p>
          <ol className="phase-list">
            {state?.phases.map((phase) => (
              <li key={phase.id} className={phase.status}>
                <span className="phase-dot" />
                <span>{phase.label}</span>
              </li>
            ))}
          </ol>
        </aside>

        <section className="focus">
          <div className="phase-header">
            <div>
              <p className="section-label">当前阶段</p>
              <h2>{state?.currentPhase?.label || 'Idea'}</h2>
              <p className="muted">{state?.idea || '输入一个想法，让工作台生成第一份轻量 PRD。'}</p>
            </div>
            <div className={`gate ${gateClass(state?.qualityGate.overall || 'UNKNOWN')}`}>
              <span>PRD Gate</span>
              <strong>{state?.qualityGate.overall || 'UNKNOWN'}</strong>
            </div>
          </div>

          <form className="idea-form" onSubmit={submitIdea}>
            <label htmlFor="idea">想法输入</label>
            <textarea id="idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="例如：帮健身新手记录训练，并自动生成每周进展总结" />
            <button type="submit" disabled={Boolean(busy) || !idea.trim()}>生成 Quick PRD</button>
          </form>

          <div className="artifact-grid">
            {currentArtifacts.map((artifact) => (
              <article className="artifact-card" key={artifact.id}>
                <div className="artifact-head">
                  <h3>{artifact.title}</h3>
                  <span className={artifact.status}>{statusLabel(artifact.status)}</span>
                </div>
                <p className="path">{artifact.relativePath}</p>
                <pre>{artifact.preview || 'No content yet.'}</pre>
              </article>
            ))}
          </div>
        </section>

        <aside className="side-panel">
          <section className="panel">
            <p className="section-label">下一步</p>
            <h2>{state?.nextAction.label || 'Load project'}</h2>
            <code>{state?.nextAction.command || 'ai-pm-dev prd --quick'}</code>
            <p className="muted">{state?.nextAction.detail || '读取项目状态后继续。'}</p>
            <button onClick={runCheck} disabled={Boolean(busy)}>运行 prd check</button>
          </section>

          <section className="panel compact">
            <p className="section-label">记录进展</p>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="这一步完成了什么？" />
            <button onClick={recordCheckpoint} disabled={Boolean(busy)}>记录 checkpoint</button>
          </section>

          <section className="panel compact">
            <p className="section-label">记录决策</p>
            <textarea value={decision} onChange={(event) => setDecision(event.target.value)} placeholder="例如：v1 先只做网页版" />
            <button onClick={recordDecision} disabled={Boolean(busy) || !decision.trim()}>写入 decision-log</button>
          </section>

          <section className="panel">
            <p className="section-label">质量门禁</p>
            <div className="gate-score">
              <span>Required {state?.qualityGate.requiredPass || 0}/{state?.qualityGate.requiredTotal || 0}</span>
              <span>Recommended {state?.qualityGate.recommendedPass || 0}/{state?.qualityGate.recommendedTotal || 0}</span>
            </div>
            <ul className="check-list">
              {(state?.qualityGate.checks || []).slice(0, 5).map((check) => (
                <li key={check.name} className={check.status.toLowerCase()}>{check.name}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>

      {(busy || message) && (
        <section className="console">
          <strong>{busy || '结果'}</strong>
          <pre>{message || 'Working...'}</pre>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
