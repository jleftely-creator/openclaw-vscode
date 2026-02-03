/**
 * Antigravity WebSocket Client for OpenClaw Gateway
 * Enables real-time communication between Skippy (Claude Opus 4.5) and Antigravity (Gemini)
 * 
 * Protocol (v3):
 * 1. Connect to WebSocket
 * 2. Receive connect.challenge event with nonce
 * 3. Send type:req, method:connect with params (role, scopes, auth, client)
 * 4. Receive type:res with hello-ok payload
 * 5. Use chat.send to communicate with agents
 */

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = '735d94a8459f9ed6e717acd03f9aea458002d16712bd38971c56b51c39cafff7';

class AntigravityGatewayClient {
    constructor(options = {}) {
        this.url = options.url || GATEWAY_URL;
        this.token = options.token || GATEWAY_TOKEN;
        this.ws = null;
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.connected = false;
        this.authenticated = false;
        this.serverInfo = null;
        this.onMessage = options.onMessage || (() => { });
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log(`[Antigravity] Connecting to ${this.url}...`);

            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                console.log('[Antigravity] WebSocket connected, waiting for challenge...');
                this.connected = true;
            });

            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());

                // Handle connect.challenge event
                if (msg.type === 'event' && msg.event === 'connect.challenge') {
                    console.log('[Antigravity] Got challenge, authenticating...');
                    const nonce = msg.payload?.nonce;
                    this.sendConnect(nonce);
                    return;
                }

                // Handle hello-ok response
                if (msg.type === 'res' && msg.ok && msg.payload?.type === 'hello-ok') {
                    console.log('[Antigravity] ✅ Authenticated successfully!');
                    this.authenticated = true;
                    this.serverInfo = msg.payload;
                    resolve(this);
                    return;
                }

                // Handle error responses
                if (msg.type === 'res' && !msg.ok) {
                    console.error('[Antigravity] Error:', msg.error?.message || msg.error);
                    if (!this.authenticated) {
                        reject(new Error(msg.error?.message || 'Connection failed'));
                        return;
                    }
                }

                // Handle responses to our requests
                if (msg.type === 'res' && msg.id && this.pendingRequests.has(msg.id)) {
                    const { resolve: res, reject: rej } = this.pendingRequests.get(msg.id);
                    this.pendingRequests.delete(msg.id);
                    if (msg.ok) {
                        res(msg.payload);
                    } else {
                        rej(new Error(msg.error?.message || 'Request failed'));
                    }
                    return;
                }

                // Handle events
                if (msg.type === 'event') {
                    console.log(`[Antigravity] Event: ${msg.event}`);
                    this.onMessage(msg);
                    return;
                }

                // Pass other messages
                this.onMessage(msg);
            });

            this.ws.on('error', (err) => {
                console.error('[Antigravity] WebSocket error:', err.message);
                reject(err);
            });

            this.ws.on('close', (code, reason) => {
                console.log(`[Antigravity] Disconnected (${code}): ${reason}`);
                this.connected = false;
                this.authenticated = false;
            });

            // Timeout if auth fails
            setTimeout(() => {
                if (!this.authenticated) {
                    reject(new Error('Connection timeout'));
                }
            }, 15000);
        });
    }

    sendConnect(nonce) {
        const msg = {
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                    id: 'cli',
                    version: '0.1.0',
                    platform: 'win32',
                    mode: 'cli'
                },
                role: 'operator',
                scopes: ['operator.read', 'operator.write', 'operator.admin'],
                caps: [],
                commands: [],
                permissions: {},
                auth: { token: this.token },
                locale: 'en-US',
                userAgent: 'antigravity-vscode/0.1.0'
            }
        };
        this.send(msg);
    }

    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send a request to the gateway
     */
    async request(method, params = {}) {
        if (!this.authenticated) {
            throw new Error('Not authenticated - call connect() first');
        }

        return new Promise((resolve, reject) => {
            const id = String(++this.messageId);
            this.pendingRequests.set(id, { resolve, reject });

            this.send({
                type: 'req',
                id,
                method,
                params
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    // ============ High-level methods ============

    /**
     * Send a message to Skippy (or any agent)
     */
    async chatSend(text, agentId = 'main') {
        return this.request('chat.send', {
            message: text,
            sessionKey: `agent:${agentId}:main`,
            idempotencyKey: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        });
    }

    /**
     * Get list of agents
     */
    async listAgents() {
        return this.request('agents.list', {});
    }

    /**
     * Get gateway status
     */
    async getStatus() {
        return this.request('status', {});
    }

    /**
     * Get chat history
     */
    async getChatHistory(agentId = 'main', limit = 10) {
        return this.request('chat.history', { agentId, limit });
    }

    /**
     * Get sessions list
     */
    async listSessions() {
        return this.request('sessions.list', {});
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.authenticated = false;
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const message = args.slice(1).join(' ');

    const client = new AntigravityGatewayClient();

    try {
        await client.connect();
        console.log('[Antigravity] Connected to OpenClaw Gateway!');

        switch (command) {
            case 'send':
            case 'chat':
                const response = await client.chatSend(message || 'Hello Skippy! This is Antigravity.');
                console.log('[Antigravity] Response:', JSON.stringify(response, null, 2));
                break;

            case 'agents':
                const agents = await client.listAgents();
                console.log('[Antigravity] Agents:', JSON.stringify(agents, null, 2));
                break;

            case 'status':
                const status = await client.getStatus();
                console.log('[Antigravity] Status:', JSON.stringify(status, null, 2));
                break;

            case 'history':
                const history = await client.getChatHistory();
                console.log('[Antigravity] History:', JSON.stringify(history, null, 2));
                break;

            case 'sessions':
                const sessions = await client.listSessions();
                console.log('[Antigravity] Sessions:', JSON.stringify(sessions, null, 2));
                break;

            case 'listen':
                console.log('[Antigravity] 👂 Listening for messages from Skippy...');
                console.log('[Antigravity] Press Ctrl+C to stop.\n');

                // Keep connection alive and listen for events
                client.onMessage = (msg) => {
                    const ts = new Date().toISOString().slice(11, 19);
                    if (msg.type === 'event') {
                        if (msg.event === 'chat') {
                            console.log(`\n[${ts}] 💬 CHAT from ${msg.payload?.agentId || 'unknown'}:`);
                            console.log(msg.payload?.text || msg.payload?.message || JSON.stringify(msg.payload, null, 2));
                        } else if (msg.event === 'agent') {
                            console.log(`\n[${ts}] 🤖 AGENT: ${msg.payload?.status || msg.event}`);
                            if (msg.payload?.text) console.log(msg.payload.text);
                        } else {
                            console.log(`\n[${ts}] 📨 EVENT [${msg.event}]:`, JSON.stringify(msg.payload, null, 2).slice(0, 200));
                        }
                    } else {
                        console.log(`\n[${ts}] 📩 MESSAGE:`, JSON.stringify(msg, null, 2).slice(0, 300));
                    }
                };

                // Stay alive until Ctrl+C
                await new Promise(() => { });
                break;

            case 'inspect-model':
                console.log('[Antigravity] 🕵️ Inspecting Model Configuration...');

                // 1. Get Sessions
                const sess = await client.listSessions();

                // Fix: Properly access the session data based on inspected structure
                // Assuming standard OpenClaw session structure:
                const mainSession = sess.byAgent?.find(a => a.agentId === 'main')?.recent[0];

                console.log('\n=== SESSION INFO ===');
                if (mainSession) {
                    console.log('Main Agent Model:', mainSession.model);
                    console.log('Provider:', mainSession.origin?.provider || 'unknown');
                } else {
                    console.log('No active session found for main agent.');
                    // Fallback debug
                    console.log('Raw Session Data keys:', Object.keys(sess));
                }
                break;

            default:
                console.log('Usage: node skippy-gateway.js <command> [message]');
                console.log('Commands: send, chat, agents, status, history, sessions, listen, inspect-model');
        }
    } catch (err) {
        console.error('[Antigravity] Error:', err.message);
    } finally {
        if (command !== 'listen') {
            client.disconnect();
        }
    }
}

// Export for module use
module.exports = { AntigravityGatewayClient };

// Run CLI if executed directly
if (require.main === module) {
    main();
}
