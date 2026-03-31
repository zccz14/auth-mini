export type MockMail = {
  from: string
  to: string
  subject: string
  text: string
}

export type MockSmtpTransport = {
  send(message: MockMail): Promise<void>
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
      async send(message: MockMail): Promise<void> {
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
