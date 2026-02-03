import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { registerCommands } from './commands';
import { executeVSCodeAction } from './actions';
import { GatewayConnection } from './gateway';

let statusBarItem: vscode.StatusBarItem;
let ipcInterval: ReturnType<typeof setInterval> | undefined;
let gateway: GatewayConnection | undefined;

const IPC_DIR = path.join(os.homedir(), '.openclaw', 'vscode-ipc');
const REQUEST_FILE = vscode.Uri.file(path.join(IPC_DIR, 'request.json'));
const RESPONSE_FILE = vscode.Uri.file(path.join(IPC_DIR, 'response.json'));
const READY_FILE = vscode.Uri.file(path.join(IPC_DIR, 'ready'));

export function activate(context: vscode.ExtensionContext) {
  console.log('OpenClaw extension activating...');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'openclaw.status';
  statusBarItem.text = '$(plug) OpenClaw';
  statusBarItem.tooltip = 'OpenClaw: Initializing...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  registerCommands(context);

  // Start file-based IPC (always available as fallback)
  startFileIPC();

  // Try WebSocket connection to gateway
  const config = vscode.workspace.getConfiguration('openclaw');
  if (config.get('autoConnect')) {
    gateway = new GatewayConnection(context, statusBarItem);
    gateway.connect().then(() => {
      console.log('OpenClaw: Gateway connection initiated');
    }).catch(err => {
      console.log('OpenClaw: Gateway connection failed, using file IPC only:', err.message);
    });
  }

  // Register gateway-specific commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.connectGateway', async () => {
      if (!gateway) {
        gateway = new GatewayConnection(context, statusBarItem);
      }
      await gateway.connect();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.disconnectGateway', () => {
      if (gateway) {
        gateway.disconnect();
        vscode.window.showInformationMessage('OpenClaw: Disconnected from gateway');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw.getConnectionStatus', () => {
      return {
        fileIpc: true,
        websocket: gateway?.isConnected || false,
        ipcDir: IPC_DIR
      };
    })
  );

  console.log('OpenClaw extension activated successfully');

  // Update status bar
  if (gateway?.isConnected) {
    statusBarItem.text = '$(check) OpenClaw';
    statusBarItem.tooltip = 'OpenClaw: Connected (WebSocket + File IPC)';
  } else {
    statusBarItem.text = '$(file) OpenClaw';
    statusBarItem.tooltip = 'OpenClaw: Ready (File IPC)';
  }

  vscode.window.showInformationMessage('OpenClaw extension ready!');
}

async function writeFile(uri: vscode.Uri, content: string): Promise<void> {
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
}

async function readFile(uri: vscode.Uri): Promise<string> {
  const data = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder().decode(data);
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function deleteFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri);
  } catch { }
}

function startFileIPC() {
  // Ensure IPC directory exists and write ready signal
  vscode.workspace.fs.createDirectory(vscode.Uri.file(IPC_DIR)).then(() => {
    writeFile(READY_FILE, Date.now().toString());
    console.log(`OpenClaw: IPC directory ready at ${IPC_DIR}`);
  });

  // Poll for requests
  ipcInterval = setInterval(() => {
    processRequest().catch(err => {
      console.error('OpenClaw IPC error:', err);
    });
  }, 100);

  console.log('OpenClaw: File IPC polling started');
}

async function processRequest(): Promise<void> {
  if (!(await fileExists(REQUEST_FILE))) {
    return;
  }

  let content: string;
  try {
    content = await readFile(REQUEST_FILE);
    await deleteFile(REQUEST_FILE);
  } catch (err: any) {
    await writeFile(RESPONSE_FILE, JSON.stringify({ ok: false, error: 'Read error: ' + err.message }));
    return;
  }

  let request: any;
  try {
    request = JSON.parse(content);
  } catch (err: any) {
    await writeFile(RESPONSE_FILE, JSON.stringify({ ok: false, error: 'Parse error: ' + err.message }));
    return;
  }

  console.log('OpenClaw: Processing request:', request.action);

  try {
    const result = await executeVSCodeAction(request.action, request.params || {});
    await writeFile(RESPONSE_FILE, JSON.stringify({ ok: true, result, requestId: request.id }));
    console.log('OpenClaw: Response written successfully');
  } catch (err: any) {
    await writeFile(RESPONSE_FILE, JSON.stringify({ ok: false, error: err.message, requestId: request.id }));
    console.log('OpenClaw: Error response written:', err.message);
  }
}

export function deactivate() {
  if (ipcInterval) {
    clearInterval(ipcInterval);
  }
  if (gateway) {
    gateway.disconnect();
  }
}
