import * as vscode from 'vscode';
import { GatewayConnection } from './gateway';

export function registerCommands(context: vscode.ExtensionContext, gateway: GatewayConnection): void {
  
  // Connect command
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.connect', async () => {
      await gateway.connect();
    })
  );

  // Disconnect command
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.disconnect', () => {
      gateway.disconnect();
      vscode.window.showInformationMessage('OpenClaw: Disconnected');
    })
  );

  // Status command
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.status', async () => {
      const config = vscode.workspace.getConfiguration('openclaw');
      const gatewayUrl = config.get<string>('gatewayUrl');
      
      const status = gateway.isConnected ? 'Connected' : 'Disconnected';
      const action = await vscode.window.showInformationMessage(
        `OpenClaw: ${status}\nGateway: ${gatewayUrl}`,
        gateway.isConnected ? 'Disconnect' : 'Connect',
        'Settings'
      );

      if (action === 'Connect') {
        await gateway.connect();
      } else if (action === 'Disconnect') {
        gateway.disconnect();
      } else if (action === 'Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'openclaw');
      }
    })
  );
}
