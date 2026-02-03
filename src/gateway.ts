import * as vscode from 'vscode';
import WebSocket from 'ws';
import { executeVSCodeAction } from './actions';

export class GatewayConnection {
  private ws: WebSocket | undefined;
  private context: vscode.ExtensionContext;
  private statusBar: vscode.StatusBarItem;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor(context: vscode.ExtensionContext, statusBar: vscode.StatusBarItem) {
    this.context = context;
    this.statusBar = statusBar;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    const config = vscode.workspace.getConfiguration('openclaw');
    const gatewayUrl = config.get<string>('gatewayUrl') || 'ws://127.0.0.1:18789';
    const token = config.get<string>('gatewayToken') || '';

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(gatewayUrl);

      this.ws.on('open', () => {
        console.log('OpenClaw: WebSocket connected');
        this.authenticate(token);
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', (code, reason) => {
        console.log(`OpenClaw: WebSocket closed (${code}): ${reason}`);
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('OpenClaw: WebSocket error:', err);
        this.updateStatus('error');
      });

    } catch (err) {
      console.error('OpenClaw: Connection failed:', err);
      this.updateStatus('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.updateStatus('disconnected');
  }

  private authenticate(token: string): void {
    this.send({
      type: 'connect',
      params: {
        role: 'extension',
        name: 'vscode',
        version: '0.1.0',
        capabilities: ['vscode.openFile', 'vscode.navigate', 'vscode.terminal', 'vscode.edit', 'vscode.diagnostics'],
        auth: token ? { token } : undefined
      }
    });
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendRequest(method: string, params: object = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });
      this.send({ id, method, params });
      
      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const msg = JSON.parse(data);

      // Handle response to our requests
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const { resolve, reject } = this.pendingRequests.get(msg.id)!;
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || 'Unknown error'));
        } else {
          resolve(msg.result);
        }
        return;
      }

      // Handle connection acknowledgment
      if (msg.type === 'connected') {
        console.log('OpenClaw: Authenticated successfully');
        this.updateStatus('connected');
        vscode.window.showInformationMessage('OpenClaw: Connected to gateway');
        return;
      }

      // Handle pairing required
      if (msg.type === 'error' && msg.code === 1008) {
        this.updateStatus('pairing');
        vscode.window.showWarningMessage('OpenClaw: Pairing required. Approve in gateway.');
        return;
      }

      // Handle vscode.invoke commands from the agent
      if (msg.method === 'vscode.invoke') {
        const { action, params: actionParams } = msg.params || {};
        try {
          const result = await executeVSCodeAction(action, actionParams);
          this.send({ id: msg.id, result });
        } catch (err: any) {
          this.send({ id: msg.id, error: { message: err.message } });
        }
        return;
      }

    } catch (err) {
      console.error('OpenClaw: Failed to parse message:', err);
    }
  }

  private updateStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'pairing'): void {
    const icons: Record<string, string> = {
      connecting: '$(sync~spin)',
      connected: '$(check)',
      disconnected: '$(plug)',
      error: '$(error)',
      pairing: '$(key)'
    };
    const tooltips: Record<string, string> = {
      connecting: 'Connecting to gateway...',
      connected: 'Connected to OpenClaw gateway',
      disconnected: 'Disconnected from gateway',
      error: 'Connection error',
      pairing: 'Waiting for pairing approval'
    };
    
    this.statusBar.text = `${icons[status]} OpenClaw`;
    this.statusBar.tooltip = `OpenClaw: ${tooltips[status]}`;
  }

  private scheduleReconnect(): void {
    const config = vscode.workspace.getConfiguration('openclaw');
    if (!config.get('autoConnect')) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      console.log('OpenClaw: Attempting reconnect...');
      this.connect();
    }, 5000);
  }

  // Public method to report editor state
  async reportState(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    const state = {
      activeFile: editor?.document.uri.fsPath,
      selection: editor ? {
        start: { line: editor.selection.start.line, character: editor.selection.start.character },
        end: { line: editor.selection.end.line, character: editor.selection.end.character }
      } : null,
      openFiles: vscode.window.tabGroups.all
        .flatMap(g => g.tabs)
        .map(t => (t.input as any)?.uri?.fsPath)
        .filter(Boolean),
      workspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || []
    };

    this.send({
      type: 'event',
      event: 'vscode.state',
      data: state
    });
  }
}
