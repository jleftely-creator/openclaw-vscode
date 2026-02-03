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

## Development

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch the Extension Development Host.

## License

MIT
