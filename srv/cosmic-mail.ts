import cds from '@sap/cds'
import nodemailer from 'nodemailer'

export interface CosmicEmail {
  to: string
  subject: string
  body: string
}

const log = cds.log('cosmic-mail')

// Create once at service startup; configuration mistakes should be visible early.
export function createCosmicMailer() {
  const mode = process.env.MAIL_MODE ?? 'console'

  if (mode === 'console') {
    log.info('Console mode: welcome emails are previewed, not delivered.')
    return async (message: CosmicEmail) => {
      log.info(`[Preview] ${message.subject} -> ${message.to}\n${message.body}`)
    }
  }

  if (mode !== 'smtp') throw new Error('MAIL_MODE must be console or smtp.')

  const host = process.env.SMTP_HOST?.trim()
  const from = process.env.MAIL_FROM?.trim()
  const port = Number(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!host || !from) throw new Error('SMTP_HOST and MAIL_FROM are required in smtp mode.')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a whole number between 1 and 65535.')
  }
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Set both SMTP_USER and SMTP_PASSWORD, or neither for an unauthenticated relay.')
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  return async (message: CosmicEmail) => {
    await transport.sendMail({
      from,
      to: { address: message.to, name: '' },
      subject: message.subject,
      text: message.body,
    })
    log.info('Welcome email accepted by the SMTP server.')
  }
}
