# OpenClaw VS Code Extension

Let your OpenClaw AI agent control VS Code.

## Features

Once connected to your OpenClaw gateway, the agent can:

- 📂 **Open/close files** - Navigate your codebase
- 🔍 **Navigate to line/symbol** - Jump to specific locations
- ✏️ **Insert/replace text** - Make edits in the editor
- 🖥️ **Run terminal commands** - Execute in integrated terminal
- 🐛 **Read diagnostics** - See errors and warnings
- 🔀 **Go to definition/references** - Code navigation
- 💬 **Show messages** - Display notifications
- 🎯 **Execute VS Code commands** - Full command palette access

## Setup

1. Install the extension
2. Configure your gateway URL in settings (`openclaw.gatewayUrl`)
3. Set your gateway token if required (`openclaw.gatewayToken`)
4. The extension auto-connects on startup (configurable)

## Settings

- `openclaw.gatewayUrl` - WebSocket URL of the OpenClaw gateway (default: `ws://127.0.0.1:18789`)
- `openclaw.gatewayToken` - Authentication token for the gateway
- `openclaw.autoConnect` - Automatically connect on startup (default: `true`)

## Commands

- **OpenClaw: Connect to Gateway** - Manually connect
- **OpenClaw: Disconnect** - Disconnect from gateway
- **OpenClaw: Show Status** - Show connection status

## Agent Actions

The agent can invoke these actions via `vscode.invoke`:

| Action | Description |
|--------|-------------|
| `openFile` | Open a file, optionally at a specific line |
| `closeFile` | Close a file or the active editor |
| `navigate` | Navigate to a file:line:column |
| `getActiveFile` | Get the currently active file path |
| `getOpenFiles` | List all open files |
| `getDiagnostics` | Get errors/warnings for a file or workspace |
| `runTerminalCommand` | Run a command in the integrated terminal |
| `showMessage` | Show an info/warning/error message |
| `insertText` | Insert text at cursor or position |
| `replaceSelection` | Replace the current selection |
| `getSelection` | Get the current selection text and range |
| `setSelection` | Set the editor selection |
| `executeCommand` | Execute any VS Code command |
| `getWorkspaceFolders` | List workspace folders |
| `findFiles` | Find files matching a glob pattern |
| `goToDefinition` | Go to symbol definition |
| `findReferences` | Find all references to a symbol |
| `showQuickPick` | Show a quick pick menu |
| `showInputBox` | Show an input dialog |
| `getEditorState` | Get full editor state snapshot |

### Antigravity Integration

| Action | Description |
|--------|-------------|
| `sendToAntigravity` | Send text to Antigravity agent |
| `triggerAntigravity` | Trigger Antigravity to process |
| `chatWithAntigravity` | Full chat: send prompt + wait for response |
| `submitToAntigravity` | Submit prompt (fire-and-forget) |

### Agent Manager

| Action | Description |
|--------|-------------|
| `listAgents` | List all available AI agents (Antigravity, Claude, Copilot, etc.) |
| `getActiveAgent` | Get currently focused AI agent |
| `switchAgent` | Switch to a specific agent by name |
| `getAgentStatus` | Get status of one or all agents |

### Model Management

| Action | Description |
|--------|-------------|
| `listModels` | List available models from all providers |
| `getCurrentModel` | Get the current model and provider |
| `switchModel` | Switch to a different model |
| `getModelConfig` | Get full model configuration |

### Claude Code Integration

| Action | Description |
|--------|-------------|
| `sendToClaudeCode` | Send text to Claude Code extension |
| `chatWithClaudeCode` | Full chat with Claude Code |
| `submitToClaudeCode` | Submit to Claude Code (fire-and-forget) |
| `getClaudeCodeStatus` | Check Claude Code extension status |

### Multi-Agent Communication

| Action | Description |
|--------|-------------|
| `sendToAgent` | Send message to any agent by name |
| `chatWithAgent` | Full chat with any agent |
| `broadcastToAgents` | Send message to multiple agents at once |

## Supported Agents

The extension supports communication with these AI agents:

| Agent ID | Name | Notes |
|----------|------|-------|
| `antigravity` | Antigravity (Gemini) | Full bidirectional support |
| `claude` | Claude Code | Full bidirectional support |
| `copilot` | GitHub Copilot Chat | Send support |
| `cody` | Sourcegraph Cody | Send support |
| `continue` | Continue | Send support |
| `cursor` | Cursor AI | Open panel support |

## Example Usage (via IPC)

### Chat with Antigravity
```json
{
  "id": "req-1",
  "action": "chatWithAntigravity",
  "params": { "prompt": "Explain this code", "timeoutMs": 60000 }
}
```

### Switch to Claude Code
```json
{
  "id": "req-2",
  "action": "switchAgent",
  "params": { "agent": "claude" }
}
```

### Broadcast to Multiple Agents
```json
{
  "id": "req-3",
  "action": "broadcastToAgents",
  "params": { 
    "agents": ["antigravity", "claude"],
    "text": "Review this file for bugs"
  }
}
```

### Switch Model
```json
{
  "id": "req-4",
  "action": "switchModel",
  "params": { "model": "gemini-2.5-pro", "provider": "antigravity" }
}
```

## Development

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch the Extension Development Host.

## License

MIT
