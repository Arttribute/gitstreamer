import WebSocket from "ws";
import { ethers } from "ethers";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createGetChannelsMessage,
  createGetLedgerBalancesMessage,
  createAppSessionMessage,
  parseAnyRPCResponse,
} from "@erc7824/nitrolite";
import type {
  YellowChannel,
  YellowBalance,
  AppSession,
  YellowConnectionStatus,
} from "./types.js";

// ClearNode endpoints
const CLEARNODE_URLS = {
  production: "wss://clearnet.yellow.com/ws",
  sandbox: "wss://clearnet-sandbox.yellow.com/ws",
};

type MessageHandler = (message: any) => void;
type HexString = `0x${string}`;

/**
 * Yellow Network Client using Nitrolite SDK (ERC-7824 state channels)
 * Manages WebSocket connection to ClearNode and handles authentication
 *
 * Note: No API key is required. Authentication is done via wallet signatures.
 * The client connects to ClearNode WebSocket endpoints:
 * - Sandbox (testnet): wss://clearnet-sandbox.yellow.com/ws
 * - Production: wss://clearnet.yellow.com/ws
 */
export class YellowClient {
  private ws: WebSocket | null = null;
  private wallet: ethers.Wallet;
  private connected: boolean = false;
  private authenticated: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  /**
   * Create a Yellow Network client
   * @param privateKey - Wallet private key (hex string with or without 0x prefix)
   */
  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Create a message signer for Nitrolite (non-EIP-191)
   */
  private messageSigner = async (payload: any): Promise<HexString> => {
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    const messageBytes = ethers.getBytes(ethers.id(message));
    const flatSig = this.wallet.signingKey.sign(messageBytes);
    return flatSig.serialized as HexString;
  };

  /**
   * Connect to ClearNode WebSocket
   */
  async connect(useSandbox: boolean = true): Promise<void> {
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
        } catch (error) {
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
  private attemptReconnect(useSandbox: boolean): void {
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
  private async authenticate(): Promise<void> {
    if (!this.ws) throw new Error("WebSocket not connected");

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour expiry

    const authRequest = await createAuthRequestMessage({
      address: this.wallet.address as HexString,
      session_key: this.wallet.address as HexString,
      application: "GitStream",
      expires_at: expiresAt,
      scope: "console",
      allowances: [],
    });

    return new Promise((resolve, reject) => {
      const authHandler = async (message: any) => {
        if (message.method === "auth_challenge") {
          try {
            const authVerify = await createAuthVerifyMessage(this.messageSigner, message);
            this.ws?.send(authVerify);
          } catch (error) {
            reject(error);
          }
        } else if (message.method === "auth_verify" && message.result?.success) {
          this.authenticated = true;
          this.messageHandlers.delete("auth");
          console.log("Authenticated with ClearNode");
          resolve();
        } else if (message.error) {
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
  private handleMessage(data: string): void {
    try {
      const message = parseAnyRPCResponse(data) as any;

      // Handle pending request responses
      if (message.id && this.pendingRequests.has(String(message.id))) {
        const { resolve, reject } = this.pendingRequests.get(String(message.id))!;
        this.pendingRequests.delete(String(message.id));

        if (message.error) {
          reject(new Error(message.error?.message || "Request failed"));
        } else {
          resolve(message.result);
        }
        return;
      }

      // Handle method-specific handlers
      for (const handler of this.messageHandlers.values()) {
        handler(message);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  /**
   * Send a message and wait for response
   */
  private async sendAndWait<T>(message: string, requestId: string): Promise<T> {
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
  async getChannels(): Promise<YellowChannel[]> {
    if (!this.authenticated) throw new Error("Not authenticated");

    const message = await createGetChannelsMessage(
      this.messageSigner,
      this.wallet.address as HexString
    );
    const parsed = JSON.parse(message);

    const result = await this.sendAndWait<YellowChannel[]>(message, parsed.id);
    return result || [];
  }

  /**
   * Get ledger balances for an address
   */
  async getLedgerBalances(address?: string): Promise<YellowBalance[]> {
    if (!this.authenticated) throw new Error("Not authenticated");

    const targetAddress = (address || this.wallet.address) as HexString;
    const message = await createGetLedgerBalancesMessage(this.messageSigner, targetAddress);
    const parsed = JSON.parse(message);

    const result = await this.sendAndWait<YellowBalance[]>(message, parsed.id);
    return result || [];
  }

  /**
   * Create an application session for payments
   */
  async createAppSession(sessions: AppSession[]): Promise<string> {
    if (!this.authenticated) throw new Error("Not authenticated");

    // Use first session - SDK expects a single session object
    const session = sessions[0];
    if (!session) throw new Error("No session provided");

    // Convert to the format expected by the SDK
    const sdkSession = {
      definition: {
        protocol: session.definition.protocol,
        participants: session.definition.participants as HexString[],
        weights: session.definition.weights,
        quorum: session.definition.quorum,
        challenge: session.definition.challenge,
        nonce: session.definition.nonce,
      },
      allocations: session.allocations.map((a) => ({
        participant: a.participant as HexString,
        asset: a.asset,
        amount: a.amount,
      })),
    };

    const message = await createAppSessionMessage(this.messageSigner, sdkSession as any);
    const parsed = JSON.parse(message);

    const result = await this.sendAndWait<{ app_session_id: string }>(message, parsed.id);
    return result.app_session_id;
  }

  /**
   * Get connection status
   */
  getStatus(): YellowConnectionStatus {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      channelCount: 0, // Would be updated from getChannels
    };
  }

  /**
   * Close the WebSocket connection
   */
  disconnect(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }
}
