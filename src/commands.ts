import * as vscode from 'vscode';
import { executeVSCodeAction } from './actions';

export function registerCommands(context: vscode.ExtensionContext): void {
  
  // Status command (placeholder for future WebSocket)
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.connect', async () => {
      vscode.window.showInformationMessage('OpenClaw: File IPC mode (WebSocket disabled)');
    })
  );

  // List antigravity commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.listAntigravityCommands', async () => {
      try {
        const result = await executeVSCodeAction('listCommands', { filter: 'antigravity' });
        const output = vscode.window.createOutputChannel('OpenClaw');
        output.clear();
        output.appendLine('Antigravity Commands:');
        output.appendLine(JSON.stringify(result, null, 2));
        output.show();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  // List all extensions
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.listExtensions', async () => {
      try {
        const result = await executeVSCodeAction('listExtensions', {});
        const output = vscode.window.createOutputChannel('OpenClaw');
        output.clear();
        output.appendLine('Extensions:');
        output.appendLine(JSON.stringify(result, null, 2));
        output.show();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  // Send text to Antigravity agent
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.sendToAntigravity', async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Enter text to send to Antigravity agent',
        placeHolder: 'Your prompt here...'
      });
      if (text) {
        try {
          await vscode.commands.executeCommand('antigravity.sendTextToChat', text);
          vscode.window.showInformationMessage('Sent to Antigravity!');
        } catch (err: any) {
          vscode.window.showErrorMessage(`Error: ${err.message}`);
        }
      }
    })
  );

  // Trigger Antigravity agent
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.triggerAntigravity', async () => {
      try {
        await vscode.commands.executeCommand('antigravity.triggerAgent');
        vscode.window.showInformationMessage('Triggered Antigravity agent!');
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  // Open Antigravity agent panel
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.openAntigravityPanel', async () => {
      try {
        await vscode.commands.executeCommand('antigravity.agentPanel.open');
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  // Disconnect command (placeholder)
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.disconnect', () => {
      vscode.window.showInformationMessage('OpenClaw: File IPC mode (no WebSocket to disconnect)');
    })
  );

  // Status command
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.status', async () => {
      vscode.window.showInformationMessage('OpenClaw: Ready (File IPC mode)');
    })
  );
}
