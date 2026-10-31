import { createServer as createHttpServer, type IncomingHttpHeaders, type Server as HttpServer } from "node:http";
import net from "node:net";

export type Mail = {
  from: string;
  to: string[];
  raw: string;
  /** The login the client sent (AUTH PLAIN), decoded: "\0user\0password". */
  login?: string;
};

/** A throwaway SMTP server that keeps what it receives. It speaks just enough SMTP, with AUTH PLAIN and no TLS. */
export class FakeMailbox {
  mails: Mail[] = [];
  private server?: net.Server;

  async start(): Promise<number> {
    this.server = net.createServer((socket) => {
      let current: Mail = { from: "", to: [], raw: "" };
      let login: string | undefined;
      let data = "";
      let inData = false;
      let buffer = "";
      socket.write("220 fake ESMTP\r\n");

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        for (;;) {
          if (inData) {
            const end = buffer.indexOf("\r\n.\r\n");
            if (end === -1) return;
            data = buffer.slice(0, end);
            buffer = buffer.slice(end + 5);
            inData = false;
            current.raw = data;
            current.login = login;
            this.mails.push(current);
            current = { from: "", to: [], raw: "" };
            socket.write("250 queued\r\n");
            continue;
          }
          const lineEnd = buffer.indexOf("\r\n");
          if (lineEnd === -1) return;
          const line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 2);
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO") || upper.startsWith("HELO")) socket.write("250-fake\r\n250 AUTH PLAIN\r\n");
          else if (upper.startsWith("AUTH PLAIN")) {
            login = Buffer.from(line.split(" ")[2] ?? "", "base64").toString("utf8");
            socket.write("235 ok\r\n");
          } else if (upper.startsWith("MAIL FROM:")) {
            current.from = line.slice(10).replace(/[<>]/g, "").trim();
            socket.write("250 ok\r\n");
          } else if (upper.startsWith("RCPT TO:")) {
            current.to.push(line.slice(8).replace(/[<>]/g, "").trim());
            socket.write("250 ok\r\n");
          } else if (upper === "DATA") {
            inData = true;
            socket.write("354 go\r\n");
          } else if (upper === "QUIT") {
            socket.end("221 bye\r\n");
          } else socket.write("250 ok\r\n");
        }
      });
      socket.on("error", () => undefined);
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    return (this.server.address() as net.AddressInfo).port;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }
}

/** The CSV attachments of a raw multipart message, by file name. */
export function attachments(raw: string): Record<string, string> {
  const boundary = /boundary=([^\r\n;]+)/.exec(raw)?.[1];
  const out: Record<string, string> = {};
  if (!boundary) return out;
  for (const part of raw.split(`--${boundary}`)) {
    const name = /filename="?([^"\r\n;]+)"?/.exec(part)?.[1];
    if (!name) continue;
    const body = part.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\s+/g, "");
    out[name] = Buffer.from(body, "base64").toString("utf8");
  }
  return out;
}

/** The decoded HTML part of a raw message. */
export function htmlBody(raw: string): string {
  const boundary = /boundary=([^\r\n;]+)/.exec(raw)?.[1] ?? "";
  const part = raw.split(`--${boundary}`).find((chunk) => chunk.includes("text/html")) ?? "";
  const body = part.split("\r\n\r\n").slice(1).join("\r\n\r\n");

  return body.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

export type Hook = { headers: IncomingHttpHeaders; body: string };

/** A throwaway webhook receiver; `status` is what it answers. */
export class FakeWebhook {
  hooks: Hook[] = [];
  status = 200;
  private server?: HttpServer;

  async start(): Promise<string> {
    this.server = createHttpServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        this.hooks.push({ headers: req.headers, body });
        res.statusCode = this.status;
        res.end("ok");
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(this.server.address() as net.AddressInfo).port}/hook`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }
}
