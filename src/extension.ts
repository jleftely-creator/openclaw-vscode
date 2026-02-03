import * as vscode from 'vscode';
import { GatewayConnection } from './gateway';
import { registerCommands } from './commands';

let gateway: GatewayConnection | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('OpenClaw extension activating...');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openclaw.status';
  statusBarItem.text = '$(plug) OpenClaw';
  statusBarItem.tooltip = 'OpenClaw: Disconnected';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Initialize gateway connection
  gateway = new GatewayConnection(context, statusBarItem);
  
  // Register commands
  registerCommands(context, gateway);

  // Auto-connect if enabled
  const config = vscode.workspace.getConfiguration('openclaw');
  if (config.get('autoConnect')) {
    gateway.connect();
  }

  console.log('OpenClaw extension activated');
}

export function deactivate() {
  if (gateway) {
    gateway.disconnect();
  }
}
