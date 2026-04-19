import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VALLO'
const APP_URL = 'https://www.psicovallo.com'

interface MandatoComparizioneProps {
  name?: string
  consigliMessage?: string
  financialDebt?: number
  sovereignStreak?: number
  consecutiveSilentDays?: number
  latitanzaPenalty?: number
}

const MandatoComparizioneEmail = ({
  name,
  consigliMessage = 'Il silenzio è il rumore del tuo fallimento. Il debito è aumentato.',
  financialDebt = 0,
  sovereignStreak = 0,
  consecutiveSilentDays = 0,
  latitanzaPenalty = 0,
}: MandatoComparizioneProps) => {
  const greeting = name ? `${name.toUpperCase()},` : 'SOLDATO,'
  const showLatitanza = consecutiveSilentDays >= 2 && latitanzaPenalty > 0

  return (
    <Html lang="it" dir="ltr">
      <Head />
      <Preview>Mandato di Comparizione — Il Consiglio richiede la tua presenza</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
            <Text style={mandato}>// MANDATO DI COMPARIZIONE //</Text>
          </Section>

          <Heading style={h1}>{greeting}</Heading>

          <Text style={text}>
            Non hai effettuato il <strong style={amber}>Daily Roll Call</strong> entro le 22:00.
          </Text>

          <Section style={councilBlock}>
            <Text style={councilLabel}>IL CONSIGLIO DEI MAESTRI:</Text>
            <Text style={councilQuote}>"{consigliMessage}"</Text>
          </Section>

          <Hr style={hr} />

          <Section style={statusBlock}>
            <Text style={statusLabel}>STATO ATTUALE DEL TUO DNA:</Text>
            <Text style={statusRow}>
              <span style={statusKey}>Debito Finanziario:</span>{' '}
              <span style={statusValueRed}>{financialDebt.toFixed(2)}€</span>
            </Text>
            <Text style={statusRow}>
              <span style={statusKey}>Streak Sovrana:</span>{' '}
              <span style={statusValueAmber}>{sovereignStreak} giorni</span>
            </Text>
            <Text style={statusRow}>
              <span style={statusKey}>Giorni di Silenzio:</span>{' '}
              <span style={statusValueRed}>{consecutiveSilentDays}</span>
            </Text>
          </Section>

          {showLatitanza && (
            <Section style={penaltyBlock}>
              <Text style={penaltyTitle}>⚠ TASSA DI LATITANZA APPLICATA</Text>
              <Text style={penaltyText}>
                +{latitanzaPenalty}€ aggiunti al tuo debito per {consecutiveSilentDays} giorni consecutivi
                di silenzio. Il sistema non aspetta. L'omissione è debolezza.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={text}>
            Hai una scelta sola: <strong style={amber}>Dichiara il Giorno Pulito</strong> ora,
            oppure lascia che il debito ti seppellisca.
          </Text>

          <Section style={buttonContainer}>
            <Button href={`${APP_URL}/home`} style={button}>
              DICHIARA GIORNO PULITO
            </Button>
          </Section>

          <Text style={footerText}>
            Questo non è un promemoria gentile. È un mandato. Il Consiglio osserva.
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            — IL CONSIGLIO DEI 15 MAESTRI
            <br />
            {SITE_NAME} • Alzati. Costruisci. Domina.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MandatoComparizioneEmail,
  subject: (data: Record<string, any>) => {
    const days = data?.consecutiveSilentDays ?? 0
    if (days >= 2) return '⚠ MANDATO + TASSA DI LATITANZA APPLICATA'
    return '⚠ MANDATO DI COMPARIZIONE — Roll Call mancato'
  },
  displayName: 'Mandato di Comparizione',
  previewData: {
    name: 'Marco',
    consigliMessage: 'Il silenzio è il rumore del tuo fallimento. Il debito è aumentato.',
    financialDebt: 175,
    sovereignStreak: 0,
    consecutiveSilentDays: 1,
    latitanzaPenalty: 0,
  },
} satisfies TemplateEntry

// ────────── Styles (white body required, brutalist amber/black accents) ──────────
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"Courier New", Courier, monospace',
  margin: 0,
  padding: 0,
}

const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
}

const header = {
  borderTop: '4px solid #d97706',
  borderBottom: '1px solid #0a0a0a',
  paddingTop: '16px',
  paddingBottom: '12px',
  marginBottom: '24px',
}

const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  letterSpacing: '4px',
  margin: '0 0 4px',
}

const mandato = {
  fontSize: '11px',
  color: '#d97706',
  letterSpacing: '2px',
  margin: 0,
  textTransform: 'uppercase' as const,
}

const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  letterSpacing: '2px',
  margin: '0 0 16px',
}

const text = {
  fontSize: '14px',
  color: '#0a0a0a',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const amber = {
  color: '#d97706',
}

const councilBlock = {
  backgroundColor: '#0a0a0a',
  padding: '20px',
  margin: '20px 0',
  borderLeft: '4px solid #d97706',
}

const councilLabel = {
  fontSize: '10px',
  color: '#d97706',
  letterSpacing: '2px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const councilQuote = {
  fontSize: '15px',
  color: '#ffffff',
  fontStyle: 'italic' as const,
  lineHeight: '1.5',
  margin: 0,
}

const hr = {
  borderColor: '#0a0a0a',
  borderStyle: 'solid' as const,
  borderWidth: '1px 0 0 0',
  margin: '24px 0',
}

const statusBlock = {
  margin: '16px 0',
}

const statusLabel = {
  fontSize: '11px',
  color: '#0a0a0a',
  letterSpacing: '2px',
  margin: '0 0 12px',
  fontWeight: 'bold' as const,
}

const statusRow = {
  fontSize: '13px',
  color: '#0a0a0a',
  margin: '0 0 6px',
}

const statusKey = {
  color: '#666666',
}

const statusValueAmber = {
  color: '#d97706',
  fontWeight: 'bold' as const,
}

const statusValueRed = {
  color: '#b91c1c',
  fontWeight: 'bold' as const,
}

const penaltyBlock = {
  backgroundColor: '#fef2f2',
  border: '2px solid #b91c1c',
  padding: '16px',
  margin: '20px 0',
}

const penaltyTitle = {
  fontSize: '14px',
  color: '#b91c1c',
  fontWeight: 'bold' as const,
  letterSpacing: '1px',
  margin: '0 0 8px',
}

const penaltyText = {
  fontSize: '13px',
  color: '#0a0a0a',
  lineHeight: '1.5',
  margin: 0,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#d97706',
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  padding: '14px 32px',
  textDecoration: 'none',
  border: '2px solid #0a0a0a',
  display: 'inline-block',
  textTransform: 'uppercase' as const,
}

const footerText = {
  fontSize: '12px',
  color: '#666666',
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  margin: '16px 0',
}

const signature = {
  fontSize: '11px',
  color: '#666666',
  letterSpacing: '1px',
  textAlign: 'center' as const,
  margin: '16px 0 0',
}
