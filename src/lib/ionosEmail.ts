import tls, { TLSSocket } from 'tls';

type IonosEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

const DEFAULT_HOST = 'smtp.ionos.it';
const DEFAULT_PORT = 465;
const DEFAULT_USER = 'support@movesbook.net';
const DEFAULT_PASSWORD = '1bcc3792fef5f3@2023!Azp';
const DEFAULT_FROM_EMAIL = 'support@movesbook.net';
const DEFAULT_FROM_NAME = 'Movesbook';
const SMTP_TIMEOUT_MS = 30000;

function envValue(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function getSmtpConfig() {
  return {
    host: envValue('IONOS_SMTP_HOST', DEFAULT_HOST),
    port: Number(process.env.IONOS_SMTP_PORT || DEFAULT_PORT),
    user: envValue('IONOS_SMTP_USER', DEFAULT_USER),
    password: envValue('IONOS_SMTP_PASSWORD', DEFAULT_PASSWORD),
    fromEmail: envValue('IONOS_FROM_EMAIL', DEFAULT_FROM_EMAIL),
    fromName: envValue('IONOS_FROM_NAME', DEFAULT_FROM_NAME),
  };
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return sanitizeHeader(match?.[1] || value);
}

function formatAddress(email: string, name?: string): string {
  const cleanEmail = extractEmailAddress(email);
  const cleanName = sanitizeHeader(name || '');
  if (!cleanName) return `<${cleanEmail}>`;
  const quotedName = cleanName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${quotedName}" <${cleanEmail}>`;
}

function dotStuffBody(body: string): string {
  return body.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function createResponseReader(socket: TLSSocket) {
  let buffer = '';

  return function readResponse(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for SMTP response'));
      }, SMTP_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('data', onData);
        socket.off('error', onError);
        socket.off('close', onClose);
      };

      const tryResolve = () => {
        const match = buffer.match(/(?:^|\r?\n)\d{3} [^\r\n]*(?:\r?\n|$)/);
        if (!match || match.index == null) return;

        const end = match.index + match[0].length;
        const response = buffer.slice(0, end).trimEnd();
        buffer = buffer.slice(end);
        cleanup();
        resolve(response);
      };

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        tryResolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onClose = () => {
        cleanup();
        reject(new Error('SMTP connection closed unexpectedly'));
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('close', onClose);
      tryResolve();
    });
  };
}

async function connectSmtp(host: string, port: number): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      timeout: SMTP_TIMEOUT_MS,
    });

    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error('Timed out connecting to IONOS SMTP'));
    }, SMTP_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('secureConnect', onSecureConnect);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };

    const onSecureConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error('Timed out connecting to IONOS SMTP'));
    };

    socket.once('secureConnect', onSecureConnect);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

function responseCode(response: string): number {
  return Number(response.slice(0, 3));
}

async function expectResponse(
  response: string,
  expectedCodes: number[],
  action: string
): Promise<void> {
  const code = responseCode(response);
  if (!expectedCodes.includes(code)) {
    throw new Error(`${action} failed: ${response}`);
  }
}

export async function sendIonosEmail(payload: IonosEmailPayload): Promise<void> {
  const config = getSmtpConfig();
  const socket = await connectSmtp(config.host, config.port);
  const readResponse = createResponseReader(socket);

  const writeCommand = async (
    command: string,
    expectedCodes: number[],
    action: string
  ) => {
    socket.write(`${command}\r\n`);
    const response = await readResponse();
    await expectResponse(response, expectedCodes, action);
    return response;
  };

  try {
    await expectResponse(await readResponse(), [220], 'SMTP greeting');
    await writeCommand('EHLO movesbook-nextjs.local', [250], 'SMTP EHLO');
    await writeCommand('AUTH LOGIN', [334], 'SMTP auth start');
    await writeCommand(Buffer.from(config.user).toString('base64'), [334], 'SMTP username');
    await writeCommand(Buffer.from(config.password).toString('base64'), [235], 'SMTP password');
    await writeCommand(`MAIL FROM:<${config.fromEmail}>`, [250], 'SMTP sender');
    await writeCommand(`RCPT TO:<${extractEmailAddress(payload.to)}>`, [250, 251], 'SMTP recipient');
    await writeCommand('DATA', [354], 'SMTP data start');

    const headers = [
      `From: ${formatAddress(config.fromEmail, config.fromName)}`,
      `To: ${formatAddress(payload.to)}`,
      `Subject: ${sanitizeHeader(payload.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
    ];

    if (payload.replyTo) {
      headers.push(`Reply-To: ${formatAddress(payload.replyTo)}`);
    }

    const message = `${headers.join('\r\n')}\r\n\r\n${dotStuffBody(payload.html)}\r\n.`;
    socket.write(`${message}\r\n`);
    await expectResponse(await readResponse(), [250], 'SMTP message send');
    await writeCommand('QUIT', [221], 'SMTP quit').catch(() => undefined);
  } finally {
    socket.end();
  }
}
