import WebSocket from "ws";
import { ethers } from "ethers";
import { createAuthRequestMessage, createAuthVerifyMessage, createGetChannelsMessage, createGetLedgerBalancesMessage, createAppSessionMessage, parseAnyRPCResponse, } from "@erc7824/nitrolite";
// ClearNode endpoints
const CLEARNODE_URLS = {
    production: "wss://clearnet.yellow.com/ws",
    sandbox: "wss://clearnet-sandbox.yellow.com/ws",
};
/**
 * Yellow Network Client using Nitrolite SDK
 * Manages WebSocket connection to ClearNode and handles authentication
 */
export class YellowClient {
    ws = null;
    wallet;
    connected = false;
    authenticated = false;
    messageHandlers = new Map();
    pendingRequests = new Map();
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    constructor(privateKey) {
        this.wallet = new ethers.Wallet(privateKey);
    }
    /**
     * Create a message signer for Nitrolite (non-EIP-191)
     */
    messageSigner = async (payload) => {
        const message = typeof payload === "string" ? payload : JSON.stringify(payload);
        const messageBytes = ethers.getBytes(ethers.id(message));
        const flatSig = this.wallet.signingKey.sign(messageBytes);
        return flatSig.serialized;
    };
    /**
     * Connect to ClearNode WebSocket
     */
    async connect(useSandbox = true) {
        return new Promise((resolve, reject) => {
            const url = useSandbox ? CLEARNODE_URLS.sandbox : CLEARNODE_URLS.production;
            this.ws = new WebSocket(url);
            this.ws.onopen = async () => {
                console.log("Connected to ClearNode");
                this.connected = true;
                this.reconnectAttempts = 0;
                try {
                    await this.authenticate();
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            };
            this.ws.onmessage = (event) => {
                this.handleMessage(event.data.toString());
            };
            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                reject(error);
            };
            this.ws.onclose = () => {
                console.log("Disconnected from ClearNode");
                this.connected = false;
                this.authenticated = false;
                this.attemptReconnect(useSandbox);
            };
        });
    }
    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect(useSandbox) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnection attempts reached");
            return;
        }
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => {
            this.connect(useSandbox).catch((error) => {
                console.error("Reconnection failed:", error);
            });
        }, delay);
    }
    /**
     * Authenticate with ClearNode
     */
    async authenticate() {
        if (!this.ws)
            throw new Error("WebSocket not connected");
        const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour expiry
        const authRequest = await createAuthRequestMessage({
            address: this.wallet.address,
            session_key: this.wallet.address,
            application: "GitStream",
            expires_at: expiresAt,
            scope: "console",
            allowances: [],
        });
        return new Promise((resolve, reject) => {
            const authHandler = async (message) => {
                if (message.method === "auth_challenge") {
                    try {
                        const authVerify = await createAuthVerifyMessage(this.messageSigner, message);
                        this.ws?.send(authVerify);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else if (message.method === "auth_verify" && message.result?.success) {
                    this.authenticated = true;
                    this.messageHandlers.delete("auth");
                    console.log("Authenticated with ClearNode");
                    resolve();
                }
                else if (message.error) {
                    reject(new Error(message.error.message || "Authentication failed"));
                }
            };
            this.messageHandlers.set("auth", authHandler);
            this.ws?.send(authRequest);
        });
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        try {
            const message = parseAnyRPCResponse(data);
            // Handle pending request responses
            if (message.id && this.pendingRequests.has(String(message.id))) {
                const { resolve, reject } = this.pendingRequests.get(String(message.id));
                this.pendingRequests.delete(String(message.id));
                if (message.error) {
                    reject(new Error(message.error?.message || "Request failed"));
                }
                else {
                    resolve(message.result);
                }
                return;
            }
            // Handle method-specific handlers
            for (const handler of this.messageHandlers.values()) {
                handler(message);
            }
        }
        catch (error) {
            console.error("Error parsing message:", error);
        }
    }
    /**
     * Send a message and wait for response
     */
    async sendAndWait(message, requestId) {
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Request timeout"));
                }
            }, 30000); // 30 second timeout
            this.ws?.send(message);
        });
    }
    /**
     * Get all channels for the connected wallet
     */
    async getChannels() {
        if (!this.authenticated)
            throw new Error("Not authenticated");
        const message = await createGetChannelsMessage(this.messageSigner, this.wallet.address);
        const parsed = JSON.parse(message);
        const result = await this.sendAndWait(message, parsed.id);
        return result || [];
    }
    /**
     * Get ledger balances for an address
     */
    async getLedgerBalances(address) {
        if (!this.authenticated)
            throw new Error("Not authenticated");
        const targetAddress = (address || this.wallet.address);
        const message = await createGetLedgerBalancesMessage(this.messageSigner, targetAddress);
        const parsed = JSON.parse(message);
        const result = await this.sendAndWait(message, parsed.id);
        return result || [];
    }
    /**
     * Create an application session for payments
     */
    async createAppSession(sessions) {
        if (!this.authenticated)
            throw new Error("Not authenticated");
        // Use first session - SDK expects a single session object
        const session = sessions[0];
        if (!session)
            throw new Error("No session provided");
        // Convert to the format expected by the SDK
        const sdkSession = {
            definition: {
                protocol: session.definition.protocol,
                participants: session.definition.participants,
                weights: session.definition.weights,
                quorum: session.definition.quorum,
                challenge: session.definition.challenge,
                nonce: session.definition.nonce,
            },
            allocations: session.allocations.map((a) => ({
                participant: a.participant,
                asset: a.asset,
                amount: a.amount,
            })),
        };
        const message = await createAppSessionMessage(this.messageSigner, sdkSession);
        const parsed = JSON.parse(message);
        const result = await this.sendAndWait(message, parsed.id);
        return result.app_session_id;
    }
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.connected,
            authenticated: this.authenticated,
            channelCount: 0, // Would be updated from getChannels
        };
    }
    /**
     * Close the WebSocket connection
     */
    disconnect() {
        this.maxReconnectAttempts = 0; // Prevent reconnection
        this.ws?.close();
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
    }
    /**
     * Get wallet address
     */
    getWalletAddress() {
        return this.wallet.address;
    }
}
