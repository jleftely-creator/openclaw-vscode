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
