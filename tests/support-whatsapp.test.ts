import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildWhatsAppDeepLink,
  DEFAULT_SUPPORT_WHATSAPP_E164,
  formatSupportMessage,
} from '../lib/support/whatsapp'

describe('support whatsapp helpers', () => {
  it('buildWhatsAppDeepLink monta wa.me com texto', () => {
    const link = buildWhatsAppDeepLink('558486174829', 'Oi suporte')
    assert.equal(
      link,
      'https://wa.me/558486174829?text=' + encodeURIComponent('Oi suporte'),
    )
  })

  it('formatSupportMessage inclui contexto', () => {
    const text = formatSupportMessage({
      message: 'Erro no laudo',
      userName: 'Ana',
      userEmail: 'ana@example.com',
      pagePath: '/dashboard/med-vision',
    })
    assert.match(text, /Suporte MedVision/)
    assert.match(text, /Erro no laudo/)
    assert.match(text, /Ana/)
    assert.match(text, /ana@example.com/)
    assert.match(text, /med-vision/)
  })

  it('DEFAULT_SUPPORT_WHATSAPP_E164 é o WA do Marcos', () => {
    assert.equal(DEFAULT_SUPPORT_WHATSAPP_E164, '558486174829')
  })
})
