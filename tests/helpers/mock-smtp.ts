import { createServer } from 'node:net'

export type MockMail = {
  from: string
  to: string
  subject: string
  text: string
}

export type MockSmtpTransport = {
  send(_config: unknown, message: MockMail): Promise<void>
}

export function createMockSmtp() {
  const mailbox: MockMail[] = []
  let failNext = false

  return {
    mailbox,
    failNextSend() {
      failNext = true
    },
    transport: {
      async send(_config: unknown, message: MockMail): Promise<void> {
        if (failNext) {
          failNext = false
          throw new Error('Mock SMTP send failed')
        }

        mailbox.push(message)
      }
    } satisfies MockSmtpTransport
  }
}

export function extractOtpCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/)

  if (!match) {
    throw new Error('OTP code not found in mock email body')
  }

  return match[1]
}

export async function startMockSmtpServer(): Promise<{
  port: number
  mailbox: MockMail[]
  close(): Promise<void>
}> {
  const mailbox: MockMail[] = []
  const server = createServer((socket) => {
    let state: 'command' | 'data' = 'command'
    let dataLines: string[] = []
    let currentMail: Partial<MockMail> = {}
    let buffer = ''

    socket.setEncoding('utf8')
    socket.write('220 mock-smtp ready\r\n')

    socket.on('data', (chunk: string) => {
      buffer += chunk

      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n')
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)

        if (state === 'data') {
          if (line === '.') {
            mailbox.push(parseData(currentMail, dataLines))
            currentMail = {}
            dataLines = []
            state = 'command'
            socket.write('250 queued\r\n')
            continue
          }

          dataLines.push(line)
          continue
        }

        if (line.startsWith('EHLO ') || line.startsWith('HELO ')) {
          socket.write('250-mock-smtp\r\n250 AUTH PLAIN\r\n')
          continue
        }

        if (line.startsWith('AUTH PLAIN ')) {
          socket.write('235 authenticated\r\n')
          continue
        }

        if (line.startsWith('MAIL FROM:')) {
          currentMail.from = extractAddress(line)
          socket.write('250 ok\r\n')
          continue
        }

        if (line.startsWith('RCPT TO:')) {
          currentMail.to = extractAddress(line)
          socket.write('250 ok\r\n')
          continue
        }

        if (line === 'DATA') {
          state = 'data'
          socket.write('354 end data with <CR><LF>.<CR><LF>\r\n')
          continue
        }

        if (line === 'QUIT') {
          socket.write('221 bye\r\n')
          socket.end()
          continue
        }

        socket.write('250 ok\r\n')
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Mock SMTP server failed to bind')
  }

  return {
    port: address.port,
    mailbox,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    }
  }
}

function extractAddress(line: string): string {
  const match = line.match(/<([^>]+)>/)

  if (!match) {
    throw new Error(`Invalid SMTP address line: ${line}`)
  }

  return match[1]
}

function parseData(mail: Partial<MockMail>, lines: string[]): MockMail {
  const subjectLine = lines.find((line) => line.startsWith('Subject: '))
  const bodyIndex = lines.findIndex((line) => line === '')
  const text = bodyIndex >= 0 ? lines.slice(bodyIndex + 1).join('\n') : ''

  return {
    from: mail.from ?? '',
    to: mail.to ?? '',
    subject: subjectLine?.slice('Subject: '.length) ?? '',
    text
  }
}
