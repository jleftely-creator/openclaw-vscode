import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Execute VS Code actions requested by the OpenClaw agent
 */
export async function executeVSCodeAction(action: string, params: any): Promise<any> {
  switch (action) {
    case 'openFile':
      return await openFile(params);

    case 'closeFile':
      return await closeFile(params);

    case 'navigate':
      return await navigate(params);

    case 'getActiveFile':
      return getActiveFile();

    case 'getOpenFiles':
      return getOpenFiles();

    case 'getDiagnostics':
      return getDiagnostics(params);

    case 'runTerminalCommand':
      return await runTerminalCommand(params);

    case 'showMessage':
      return await showMessage(params);

    case 'insertText':
      return await insertText(params);

    case 'replaceSelection':
      return await replaceSelection(params);

    case 'getSelection':
      return getSelection();

    case 'setSelection':
      return await setSelection(params);

    case 'executeCommand':
      return await executeCommand(params);

    case 'getWorkspaceFolders':
      return getWorkspaceFolders();

    case 'findFiles':
      return await findFiles(params);

    case 'goToDefinition':
      return await goToDefinition(params);

    case 'findReferences':
      return await findReferences(params);

    case 'showQuickPick':
      return await showQuickPick(params);

    case 'showInputBox':
      return await showInputBox(params);

    case 'getEditorState':
      return getEditorState();

    case 'listCommands':
      return await listCommands(params);

    case 'listExtensions':
      return listExtensions();

    case 'sendToAntigravity':
      return await sendToAntigravity(params);

    case 'triggerAntigravity':
      return await triggerAntigravity(params);

    case 'chatWithAntigravity':
      return await chatWithAntigravity(params);

    case 'submitToAntigravity':
      return await submitToAntigravity(params);

    // --- Agent Manager Actions ---
    case 'listAgents':
      return await listAgents();

    case 'getActiveAgent':
      return await getActiveAgent();

    case 'switchAgent':
      return await switchAgent(params);

    case 'getAgentStatus':
      return await getAgentStatus(params);

    // --- Model Management Actions ---
    case 'listModels':
      return await listModels();

    case 'getCurrentModel':
      return await getCurrentModel();

    case 'switchModel':
      return await switchModel(params);

    case 'getModelConfig':
      return await getModelConfig();

    // --- Claude Code Actions ---
    case 'sendToClaudeCode':
      return await sendToClaudeCode(params);

    case 'chatWithClaudeCode':
      return await chatWithClaudeCode(params);

    case 'submitToClaudeCode':
      return await submitToClaudeCode(params);

    case 'getClaudeCodeStatus':
      return await getClaudeCodeStatus();

    // --- Multi-Agent Communication ---
    case 'sendToAgent':
      return await sendToAgent(params);

    case 'chatWithAgent':
      return await chatWithAgent(params);

    case 'broadcastToAgents':
      return await broadcastToAgents(params);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// --- Action implementations ---

async function openFile(params: { path: string; line?: number; column?: number }): Promise<{ success: boolean }> {
  const uri = vscode.Uri.file(params.path);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);

  if (params.line !== undefined) {
    const position = new vscode.Position(params.line - 1, (params.column || 1) - 1);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }

  return { success: true };
}

async function closeFile(params: { path?: string }): Promise<{ success: boolean }> {
  if (params.path) {
    const uri = vscode.Uri.file(params.path);
    const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
    const tab = tabs.find(t => (t.input as any)?.uri?.fsPath === uri.fsPath);
    if (tab) {
      await vscode.window.tabGroups.close(tab);
    }
  } else {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  }
  return { success: true };
}

async function navigate(params: { path: string; line: number; column?: number }): Promise<{ success: boolean }> {
  return openFile(params);
}

function getActiveFile(): { path: string | null; line: number; column: number } {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { path: null, line: 0, column: 0 };
  }
  return {
    path: editor.document.uri.fsPath,
    line: editor.selection.active.line + 1,
    column: editor.selection.active.character + 1
  };
}

function getOpenFiles(): { files: string[] } {
  const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
  const files = tabs
    .map(t => (t.input as any)?.uri?.fsPath)
    .filter((f): f is string => !!f);
  return { files };
}

function getDiagnostics(params: { path?: string; severity?: string }): { diagnostics: any[] } {
  let diagnostics: [vscode.Uri, vscode.Diagnostic[]][];

  if (params.path) {
    const uri = vscode.Uri.file(params.path);
    const fileDiags = vscode.languages.getDiagnostics(uri);
    diagnostics = [[uri, fileDiags]];
  } else {
    diagnostics = vscode.languages.getDiagnostics();
  }

  const severityMap: Record<string, vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint
  };

  const result: any[] = [];
  for (const [uri, diags] of diagnostics) {
    for (const d of diags) {
      if (params.severity && d.severity !== severityMap[params.severity]) {
        continue;
      }
      result.push({
        path: uri.fsPath,
        line: d.range.start.line + 1,
        column: d.range.start.character + 1,
        message: d.message,
        severity: ['error', 'warning', 'info', 'hint'][d.severity],
        source: d.source
      });
    }
  }

  return { diagnostics: result };
}

async function runTerminalCommand(params: { command: string; name?: string; cwd?: string }): Promise<{ success: boolean }> {
  const terminal = vscode.window.createTerminal({
    name: params.name || 'OpenClaw',
    cwd: params.cwd
  });
  terminal.show();
  terminal.sendText(params.command);
  return { success: true };
}

async function showMessage(params: { message: string; type?: 'info' | 'warning' | 'error'; actions?: string[] }): Promise<{ action?: string }> {
  const showFn = params.type === 'error'
    ? vscode.window.showErrorMessage
    : params.type === 'warning'
      ? vscode.window.showWarningMessage
      : vscode.window.showInformationMessage;

  const action = await showFn(params.message, ...(params.actions || []));
  return { action };
}

async function insertText(params: { text: string; position?: { line: number; column: number } }): Promise<{ success: boolean }> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active editor');
  }

  const position = params.position
    ? new vscode.Position(params.position.line - 1, params.position.column - 1)
    : editor.selection.active;

  await editor.edit(builder => {
    builder.insert(position, params.text);
  });

  return { success: true };
}

async function replaceSelection(params: { text: string }): Promise<{ success: boolean }> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active editor');
  }

  await editor.edit(builder => {
    builder.replace(editor.selection, params.text);
  });

  return { success: true };
}

function getSelection(): { text: string; range: any } {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { text: '', range: null };
  }

  return {
    text: editor.document.getText(editor.selection),
    range: {
      start: { line: editor.selection.start.line + 1, column: editor.selection.start.character + 1 },
      end: { line: editor.selection.end.line + 1, column: editor.selection.end.character + 1 }
    }
  };
}

async function setSelection(params: { start: { line: number; column: number }; end: { line: number; column: number } }): Promise<{ success: boolean }> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active editor');
  }

  const start = new vscode.Position(params.start.line - 1, params.start.column - 1);
  const end = new vscode.Position(params.end.line - 1, params.end.column - 1);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end));

  return { success: true };
}

async function executeCommand(params: { command: string; args?: any[] }): Promise<{ result: any }> {
  const result = await vscode.commands.executeCommand(params.command, ...(params.args || []));
  return { result };
}

function getWorkspaceFolders(): { folders: string[] } {
  return {
    folders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || []
  };
}

async function findFiles(params: { pattern: string; exclude?: string; maxResults?: number }): Promise<{ files: string[] }> {
  const uris = await vscode.workspace.findFiles(
    params.pattern,
    params.exclude,
    params.maxResults || 100
  );
  return { files: uris.map(u => u.fsPath) };
}

async function goToDefinition(params: { path: string; line: number; column: number }): Promise<{ locations: any[] }> {
  const uri = vscode.Uri.file(params.path);
  const position = new vscode.Position(params.line - 1, params.column - 1);

  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    uri,
    position
  );

  return {
    locations: (locations || []).map(loc => ({
      path: loc.uri.fsPath,
      line: loc.range.start.line + 1,
      column: loc.range.start.character + 1
    }))
  };
}

async function findReferences(params: { path: string; line: number; column: number }): Promise<{ locations: any[] }> {
  const uri = vscode.Uri.file(params.path);
  const position = new vscode.Position(params.line - 1, params.column - 1);

  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    uri,
    position
  );

  return {
    locations: (locations || []).map(loc => ({
      path: loc.uri.fsPath,
      line: loc.range.start.line + 1,
      column: loc.range.start.character + 1
    }))
  };
}

async function showQuickPick(params: { items: string[]; placeholder?: string }): Promise<{ selected?: string }> {
  const selected = await vscode.window.showQuickPick(params.items, {
    placeHolder: params.placeholder
  });
  return { selected };
}

async function showInputBox(params: { prompt?: string; placeholder?: string; value?: string }): Promise<{ value?: string }> {
  const value = await vscode.window.showInputBox({
    prompt: params.prompt,
    placeHolder: params.placeholder,
    value: params.value
  });
  return { value };
}

async function listCommands(params: { filter?: string }): Promise<{ commands: string[] }> {
  const allCommands = await vscode.commands.getCommands(true);
  let commands = allCommands;

  if (params.filter) {
    const filter = params.filter.toLowerCase();
    commands = allCommands.filter(cmd => cmd.toLowerCase().includes(filter));
  }

  return { commands: commands.sort() };
}

function listExtensions(): { extensions: any[] } {
  const extensions = vscode.extensions.all.map(ext => ({
    id: ext.id,
    name: ext.packageJSON?.displayName || ext.id,
    version: ext.packageJSON?.version,
    active: ext.isActive,
    extensionKind: ext.extensionKind,
    commands: ext.packageJSON?.contributes?.commands?.map((c: any) => c.command) || []
  }));

  return { extensions };
}

function getEditorState(): any {
  const editor = vscode.window.activeTextEditor;
  return {
    activeFile: editor?.document.uri.fsPath || null,
    language: editor?.document.languageId || null,
    lineCount: editor?.document.lineCount || 0,
    isDirty: editor?.document.isDirty || false,
    selection: editor ? {
      text: editor.document.getText(editor.selection),
      start: { line: editor.selection.start.line + 1, column: editor.selection.start.character + 1 },
      end: { line: editor.selection.end.line + 1, column: editor.selection.end.character + 1 }
    } : null,
    visibleRange: editor ? {
      start: { line: editor.visibleRanges[0]?.start.line + 1 || 1 },
      end: { line: editor.visibleRanges[0]?.end.line + 1 || 1 }
    } : null,
    openFiles: vscode.window.tabGroups.all
      .flatMap(g => g.tabs)
      .map(t => (t.input as any)?.uri?.fsPath)
      .filter(Boolean),
    workspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || []
  };
}

// --- Antigravity Integration ---

async function sendToAntigravity(params: { text: string; submit?: boolean }): Promise<{ success: boolean; method: string }> {
  // The sendTextToChat command doesn't throw on failure - just send directly
  await vscode.commands.executeCommand('antigravity.sendTextToChat', params.text);
  return { success: true, method: 'sendTextToChat' };
}

async function triggerAntigravity(params?: { text?: string }): Promise<{ success: boolean }> {
  // If text provided, send it first
  if (params?.text) {
    await vscode.commands.executeCommand('antigravity.sendTextToChat', params.text);
  }

  // Trigger the agent to process
  await vscode.commands.executeCommand('antigravity.triggerAgent');
  return { success: true };
}

/**
 * Full chat interaction with Antigravity - sends a prompt and waits for response.
 * This bridges moltbot <-> Antigravity communication.
 */
async function chatWithAntigravity(params: {
  prompt: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const timeout = params.timeoutMs || 120000; // Default 2 min timeout
  const pollInterval = params.pollIntervalMs || 500;

  try {
    // First, open chat and send the prompt
    await vscode.commands.executeCommand('antigravity.prioritized.chat.open');
    await new Promise(r => setTimeout(r, 300)); // Wait for panel

    // Send the prompt to Antigravity
    await vscode.commands.executeCommand('antigravity.sendTextToChat', params.prompt);

    // Trigger the agent to process
    await vscode.commands.executeCommand('antigravity.triggerAgent');

    // Now we need to wait for a response. 
    // Since we don't have direct API access to Antigravity's conversation,
    // we'll attempt multiple strategies:

    // Strategy 1: Try to get conversation state via command
    const startTime = Date.now();
    let lastResponseLength = 0;
    let stableCount = 0;

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, pollInterval));

      try {
        // Try to get the current chat content/response
        // This attempts various Antigravity commands that might expose state
        const state = await vscode.commands.executeCommand('antigravity.getConversationState');
        if (state && typeof state === 'object') {
          const response = (state as any).lastAssistantMessage || (state as any).response;
          if (response && response.length > 0) {
            // Check if response is stable (not still streaming)
            if (response.length === lastResponseLength) {
              stableCount++;
              if (stableCount >= 3) { // 3 consecutive polls with same length = done
                return { success: true, response };
              }
            } else {
              stableCount = 0;
              lastResponseLength = response.length;
            }
          }
        }
      } catch {
        // Command might not exist, try alternative approaches
      }

      // Check if the agent is still busy
      try {
        const busy = await vscode.commands.executeCommand('antigravity.isAgentBusy');
        if (busy === false && Date.now() - startTime > 2000) {
          // Agent finished and we waited at least 2s
          // Return success even without captured response - 
          // the response was generated in the UI
          return {
            success: true,
            response: '[Response generated in Antigravity panel - direct API not available]'
          };
        }
      } catch {
        // Command might not exist
      }
    }

    // Timeout reached
    return {
      success: true,
      response: '[Prompt sent successfully, but response capture timed out. Check Antigravity panel.]'
    };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit a message to Antigravity and immediately return.
 * Use this when you don't need to wait for the response.
 */
async function submitToAntigravity(params: { prompt: string }): Promise<{ success: boolean; method: string }> {
  // Open chat panel
  await vscode.commands.executeCommand('antigravity.prioritized.chat.open');
  await new Promise(r => setTimeout(r, 200));

  // Send the text
  await vscode.commands.executeCommand('antigravity.sendTextToChat', params.prompt);

  // Submit/trigger processing
  await vscode.commands.executeCommand('antigravity.triggerAgent');

  return { success: true, method: 'submit' };
}

// ============================================
// AGENT MANAGER FUNCTIONS
// ============================================

/** Known agents and their VS Code command prefixes */
const KNOWN_AGENTS: Record<string, {
  name: string;
  openCommand?: string;
  sendCommand?: string;
  triggerCommand?: string;
  statusCommand?: string;
}> = {
  'antigravity': {
    name: 'Antigravity (Gemini)',
    openCommand: 'antigravity.prioritized.chat.open',
    sendCommand: 'antigravity.sendTextToChat',
    triggerCommand: 'antigravity.triggerAgent'
  },
  'claude': {
    name: 'Claude Code',
    openCommand: 'claude-dev.openInNewTab',
    sendCommand: 'claude-dev.sendMessage',
    triggerCommand: 'claude-dev.submitMessage'
  },
  'copilot': {
    name: 'GitHub Copilot Chat',
    openCommand: 'workbench.panel.chat.view.copilot.focus',
    sendCommand: 'workbench.action.chat.open'
  },
  'cody': {
    name: 'Sourcegraph Cody',
    openCommand: 'cody.chat.focus',
    sendCommand: 'cody.chat.new'
  },
  'continue': {
    name: 'Continue',
    openCommand: 'continue.focusContinueInput',
    sendCommand: 'continue.sendToTerminal'
  },
  'cursor': {
    name: 'Cursor AI',
    openCommand: 'aichat.openPanel'
  }
};

/**
 * List all available AI agents in VS Code
 */
async function listAgents(): Promise<{ agents: any[]; discoveredCommands?: string[] }> {
  const allCommands = await vscode.commands.getCommands(true);
  const agents: any[] = [];

  // Check each known agent
  for (const [id, agent] of Object.entries(KNOWN_AGENTS)) {
    const available = agent.openCommand ? allCommands.includes(agent.openCommand) : false;
    agents.push({
      id,
      name: agent.name,
      available,
      capabilities: {
        canOpen: !!agent.openCommand && allCommands.includes(agent.openCommand),
        canSend: !!agent.sendCommand && allCommands.includes(agent.sendCommand),
        canTrigger: !!agent.triggerCommand && allCommands.includes(agent.triggerCommand)
      }
    });
  }

  // Also discover any agent-like extensions
  const agentPatterns = ['chat', 'ai', 'copilot', 'claude', 'gpt', 'llm', 'assistant'];
  const discoveredCommands = allCommands.filter(cmd =>
    agentPatterns.some(pattern => cmd.toLowerCase().includes(pattern))
  );

  return {
    agents,
    discoveredCommands: discoveredCommands.slice(0, 50) // Limit to prevent huge response
  };
}

/**
 * Get the currently active/focused AI agent
 */
async function getActiveAgent(): Promise<{ agent: string | null; panel: string | null }> {
  // Check which panel is active
  const activePanelId = vscode.window.activeTextEditor?.document.uri.scheme;

  // Try to detect based on visible panels/views
  for (const [id, agent] of Object.entries(KNOWN_AGENTS)) {
    try {
      // This is heuristic - we check if the agent's view is visible
      const visible = await vscode.commands.executeCommand(`${id}.isVisible`);
      if (visible) {
        return { agent: id, panel: agent.name };
      }
    } catch {
      // Command doesn't exist, continue
    }
  }

  return { agent: null, panel: null };
}

/**
 * Switch to a specific AI agent
 */
async function switchAgent(params: { agent: string }): Promise<{ success: boolean; agent: string }> {
  const agentConfig = KNOWN_AGENTS[params.agent.toLowerCase()];

  if (!agentConfig) {
    throw new Error(`Unknown agent: ${params.agent}. Available: ${Object.keys(KNOWN_AGENTS).join(', ')}`);
  }

  if (!agentConfig.openCommand) {
    throw new Error(`Agent ${params.agent} does not have an open command`);
  }

  try {
    await vscode.commands.executeCommand(agentConfig.openCommand);
    return { success: true, agent: params.agent };
  } catch (err: any) {
    throw new Error(`Failed to switch to ${params.agent}: ${err.message}`);
  }
}

/**
 * Get status of a specific agent
 */
async function getAgentStatus(params: { agent?: string }): Promise<{ status: any }> {
  const allCommands = await vscode.commands.getCommands(true);

  if (params.agent) {
    const agentConfig = KNOWN_AGENTS[params.agent.toLowerCase()];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${params.agent}`);
    }

    return {
      status: {
        id: params.agent,
        name: agentConfig.name,
        installed: agentConfig.openCommand ? allCommands.includes(agentConfig.openCommand) : false,
        commands: {
          open: agentConfig.openCommand,
          send: agentConfig.sendCommand,
          trigger: agentConfig.triggerCommand
        }
      }
    };
  }

  // Return status of all agents
  const statuses: any = {};
  for (const [id, agent] of Object.entries(KNOWN_AGENTS)) {
    statuses[id] = {
      name: agent.name,
      installed: agent.openCommand ? allCommands.includes(agent.openCommand) : false
    };
  }

  return { status: statuses };
}

// ============================================
// MODEL MANAGEMENT FUNCTIONS  
// ============================================

/**
 * List available models (from various AI extensions)
 */
async function listModels(): Promise<{ models: any[] }> {
  const models: any[] = [];

  // Try to get models from Antigravity settings
  try {
    const antigravityConfig = vscode.workspace.getConfiguration('antigravity');
    const currentModel = antigravityConfig.get('model');
    models.push({
      provider: 'antigravity',
      current: currentModel,
      available: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-pro', 'gemini-2.0-flash']
    });
  } catch { }

  // Try to get models from Claude/Continue/other extensions
  try {
    const claudeConfig = vscode.workspace.getConfiguration('claude');
    const claudeModel = claudeConfig.get('model');
    if (claudeModel) {
      models.push({
        provider: 'claude',
        current: claudeModel,
        available: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku']
      });
    }
  } catch { }

  try {
    const continueConfig = vscode.workspace.getConfiguration('continue');
    const continueModel = continueConfig.get('model');
    if (continueModel) {
      models.push({
        provider: 'continue',
        current: continueModel
      });
    }
  } catch { }

  return { models };
}

/**
 * Get the current model being used
 */
async function getCurrentModel(): Promise<{ model: string | null; provider: string | null }> {
  // Try Antigravity first
  try {
    const config = vscode.workspace.getConfiguration('antigravity');
    const model = config.get<string>('model');
    if (model) {
      return { model, provider: 'antigravity' };
    }
  } catch { }

  // Try Claude
  try {
    const config = vscode.workspace.getConfiguration('claude');
    const model = config.get<string>('model');
    if (model) {
      return { model, provider: 'claude' };
    }
  } catch { }

  return { model: null, provider: null };
}

/**
 * Switch to a different model
 */
async function switchModel(params: { model: string; provider?: string }): Promise<{ success: boolean; model: string }> {
  const provider = params.provider || 'antigravity';

  try {
    const config = vscode.workspace.getConfiguration(provider);
    await config.update('model', params.model, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(`Model switched to ${params.model}`);
    return { success: true, model: params.model };
  } catch (err: any) {
    throw new Error(`Failed to switch model: ${err.message}`);
  }
}

/**
 * Get full model configuration
 */
async function getModelConfig(): Promise<{ config: any }> {
  const config: any = {};

  // Antigravity config
  try {
    const antigravity = vscode.workspace.getConfiguration('antigravity');
    config.antigravity = {
      model: antigravity.get('model'),
      temperature: antigravity.get('temperature'),
      maxTokens: antigravity.get('maxTokens')
    };
  } catch { }

  // Claude config
  try {
    const claude = vscode.workspace.getConfiguration('claude');
    config.claude = {
      model: claude.get('model'),
      apiKey: claude.get('apiKey') ? '[REDACTED]' : null
    };
  } catch { }

  return { config };
}

// ============================================
// CLAUDE CODE FUNCTIONS
// ============================================

/**
 * Send text to Claude Code extension
 */
async function sendToClaudeCode(params: { text: string }): Promise<{ success: boolean; method: string }> {
  // Try multiple known Claude Code command patterns
  const claudeCommands = [
    'claude-dev.sendMessage',
    'claude-dev.openInNewTab',
    'claude.sendMessage',
    'claude.openChat',
    'anthropic.sendMessage',
    'roo-cline.sendMessage',
    'cline.sendMessage'
  ];

  const allCommands = await vscode.commands.getCommands(true);

  for (const cmd of claudeCommands) {
    if (allCommands.includes(cmd)) {
      try {
        await vscode.commands.executeCommand(cmd, params.text);
        return { success: true, method: cmd };
      } catch {
        // Try next command
      }
    }
  }

  // Try opening Claude panel first, then sending
  const openCommands = ['claude-dev.openInNewTab', 'claude.openChat', 'roo-cline.openChat'];
  for (const openCmd of openCommands) {
    if (allCommands.includes(openCmd)) {
      try {
        await vscode.commands.executeCommand(openCmd);
        await new Promise(r => setTimeout(r, 500));

        // Now try to send the message
        for (const sendCmd of claudeCommands) {
          if (allCommands.includes(sendCmd)) {
            try {
              await vscode.commands.executeCommand(sendCmd, params.text);
              return { success: true, method: `${openCmd} + ${sendCmd}` };
            } catch { }
          }
        }
      } catch { }
    }
  }

  throw new Error('Claude Code extension not found or not responding. Available commands searched: ' + claudeCommands.join(', '));
}

/**
 * Full chat with Claude Code - send and wait for response
 */
async function chatWithClaudeCode(params: {
  prompt: string;
  timeoutMs?: number
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const timeout = params.timeoutMs || 120000;

  try {
    // Send the message
    await sendToClaudeCode({ text: params.prompt });

    // Claude Code typically provides responses in the panel
    // We'll wait a reasonable time for processing
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, 1000));

      // Try to check if Claude is still processing
      try {
        const busy = await vscode.commands.executeCommand('claude-dev.isProcessing');
        if (busy === false && Date.now() - startTime > 3000) {
          return {
            success: true,
            response: '[Response generated in Claude Code panel]'
          };
        }
      } catch {
        // Command might not exist - just wait
      }

      // Check if we've waited long enough
      if (Date.now() - startTime > 5000) {
        return {
          success: true,
          response: '[Message sent to Claude Code - check panel for response]'
        };
      }
    }

    return { success: true, response: '[Timeout - check Claude Code panel]' };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit to Claude Code (fire-and-forget)
 */
async function submitToClaudeCode(params: { prompt: string }): Promise<{ success: boolean }> {
  await sendToClaudeCode({ text: params.prompt });
  return { success: true };
}

/**
 * Get Claude Code extension status
 */
async function getClaudeCodeStatus(): Promise<{ installed: boolean; commands: string[] }> {
  const allCommands = await vscode.commands.getCommands(true);

  const claudeCommandPatterns = ['claude', 'anthropic', 'roo-cline', 'cline'];
  const claudeCommands = allCommands.filter(cmd =>
    claudeCommandPatterns.some(pattern => cmd.toLowerCase().includes(pattern))
  );

  // Check for Claude extensions
  const claudeExtensions = vscode.extensions.all.filter(ext =>
    ext.id.toLowerCase().includes('claude') ||
    ext.id.toLowerCase().includes('anthropic') ||
    ext.id.toLowerCase().includes('cline')
  );

  return {
    installed: claudeExtensions.length > 0 || claudeCommands.length > 0,
    commands: claudeCommands,
    extensions: claudeExtensions.map(e => ({ id: e.id, active: e.isActive }))
  } as any;
}

// ============================================
// MULTI-AGENT COMMUNICATION
// ============================================

/**
 * Send a message to a specific agent by name
 */
async function sendToAgent(params: { agent: string; text: string }): Promise<{ success: boolean; method: string }> {
  const agentId = params.agent.toLowerCase();

  // Route to specific handler based on agent
  switch (agentId) {
    case 'antigravity':
    case 'gemini':
      return await sendToAntigravity({ text: params.text });

    case 'claude':
    case 'claude-code':
    case 'claudecode':
      return await sendToClaudeCode({ text: params.text });

    case 'copilot':
      await vscode.commands.executeCommand('workbench.action.chat.open', { query: params.text });
      return { success: true, method: 'copilot.chat.open' };

    case 'cody':
      await vscode.commands.executeCommand('cody.chat.new', params.text);
      return { success: true, method: 'cody.chat.new' };

    case 'continue':
      await vscode.commands.executeCommand('continue.focusContinueInput');
      return { success: true, method: 'continue.focus' };

    default:
      throw new Error(`Unknown agent: ${params.agent}. Use listAgents to see available agents.`);
  }
}

/**
 * Full chat with any agent
 */
async function chatWithAgent(params: {
  agent: string;
  prompt: string;
  timeoutMs?: number
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const agentId = params.agent.toLowerCase();

  switch (agentId) {
    case 'antigravity':
    case 'gemini':
      return await chatWithAntigravity({ prompt: params.prompt, timeoutMs: params.timeoutMs });

    case 'claude':
    case 'claude-code':
    case 'claudecode':
      return await chatWithClaudeCode({ prompt: params.prompt, timeoutMs: params.timeoutMs });

    default:
      // For other agents, just send and return immediately
      await sendToAgent({ agent: params.agent, text: params.prompt });
      return {
        success: true,
        response: `[Message sent to ${params.agent} - check its panel for response]`
      };
  }
}

/**
 * Broadcast a message to multiple agents
 */
async function broadcastToAgents(params: {
  agents: string[];
  text: string
}): Promise<{ results: Record<string, { success: boolean; error?: string }> }> {
  const results: Record<string, { success: boolean; error?: string }> = {};

  for (const agent of params.agents) {
    try {
      await sendToAgent({ agent, text: params.text });
      results[agent] = { success: true };
    } catch (err: any) {
      results[agent] = { success: false, error: err.message };
    }
  }

  return { results };
}
