import type { ClientMessage, ServerMessage } from "../../shared/protocol";
type Session = { code: string; token: string };
export class Connection {
  socket: WebSocket | null = null;
  session: Session | null = null;
  onmessage: (m: ServerMessage) => void = () => {};
  onstatus: (s: string) => void = () => {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private heart: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private pending: ClientMessage | null = null;
  private retries = 0;
  constructor() {
    try {
      this.session = JSON.parse(
        sessionStorage.getItem("pong.session") || "null",
      );
    } catch {
      /* Storage unavailable */
    }
  }
  connect(first?: ClientMessage) {
    this.pending = first ?? null;
    if (this.socket?.readyState === WebSocket.OPEN) {
      if (first) this.send(first);
      return;
    }
    if (this.socket?.readyState === WebSocket.CONNECTING) return;
    this.stopped = false;
    this.open();
  }
  private open() {
    this.onstatus(this.retries ? "Reconnecting…" : "Connecting…");
    this.socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
    );
    this.socket.onopen = () => {
      this.retries = 0;
      this.onstatus("Connected");
      if (this.session) this.send({ type: "RESUME", ...this.session });
      else if (this.pending) this.send(this.pending);
      this.pending = null;
      this.heart = setInterval(
        () => this.send({ type: "PING", time: Date.now() }),
        3000,
      );
    };
    this.socket.onmessage = (e) => {
      const m = JSON.parse(e.data) as ServerMessage;
      if (m.type === "ROOM") {
        this.session = { code: m.code, token: m.token };
        try {
          sessionStorage.setItem("pong.session", JSON.stringify(this.session));
        } catch {
          /* optional */
        }
      }
      if (
        m.type === "ERROR" &&
        /expired|already connected|not found/i.test(m.message)
      )
        this.forget();
      this.onmessage(m);
    };
    this.socket.onclose = () => {
      if (this.heart) clearInterval(this.heart);
      this.onstatus("Disconnected");
      if (!this.stopped && this.session) {
        this.timer = setTimeout(
          () => this.open(),
          Math.min(4000, 500 * 2 ** this.retries++),
        );
      }
    };
    this.socket.onerror = () => this.onstatus("Connection failed");
  }
  send(m: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(m));
  }
  forget() {
    this.session = null;
    try {
      sessionStorage.removeItem("pong.session");
    } catch {
      /* optional */
    }
  }
  leave() {
    this.send({ type: "LEAVE" });
    this.forget();
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.heart) clearInterval(this.heart);
    this.socket?.close();
    this.socket = null;
  }
}
