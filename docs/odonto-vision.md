# Odonto Vision - Análise de Imagens Odontológicas

**Data:** 2026-03-27
**Status:** ✅ Em Produção

---

## Visão Geral

Odonto Vision é um agente especializado em análise de imagens odontológicas, utilizando capacidade de visão computacional para examinar radiografias, fotografias clínicas e outros materiais visuais odontológicos.

### Características Principais

- **ID do Agente:** `odonto-vision`
- **Tipo:** Pro (requer assinatura ativa)
- **Capacidade:** Visão computacional (análise de imagens)
- **Ícone:** Olho (Eye)

---

## Funcionalidades

### Tipos de Imagens Suportadas

| Tipo | Extensões | Tamanho Máximo |
|------|-----------|----------------|
| Radiografias periapicais | .jpg, .png, .webp | 10MB |
| Radiografias panorâmicas | .jpg, .png, .webp | 10MB |
| Fotografias clínicas | .jpg, .png, .webp | 10MB |
| Imagens de tomografia | .jpg, .png, .webp | 10MB |
| Modelos 3D (renders) | .jpg, .png, .webp | 10MB |

### Análises Realizadas

1. **Avaliação de Cáries** - Detecção de cáries em diferentes estágios
2. **Análise Periodontal** - Avaliação de perda óssea e condição gengival
3. **Verificação de Restaurações** - Estado de restaurações existentes
4. **Análise de Canal** - Avaliação de tratamentos endodônticos
5. **Implantodontia** - Análise de implantes e próteses
6. **Ortodontia** - Avaliação de posicionamento dentário e oclusão
7. **Patologias** - Identificação de lesões e anomalias

---

## Integração Técnica

### API de Chat

```typescript
// Configuração do agente via SDK
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Analise esta radiografia' }],
    agentId: 'odonto-vision',
    attachments: [
      {
        type: 'image',
        url: 'https://cdn.example.com/xray.jpg',
        name: 'radiografia-periapical.jpg'
      }
    ]
  })
});
```

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|--------------|
| `OPENCODE_API_KEY` | Chave OpenCode Go para `/api/vision/analyze` | Sim |
| `MEDVISION_OPENCODE_API_KEY` | Chave dedicada Med Vision (opcional; senão usa `OPENCODE_API_KEY`) | Não |

### Modelo Utilizado

- **Provider:** [OpenCode Go](https://opencode.ai/docs/go/) (`lib/ai/opencode-go.ts`)
- **Modelo Padrão:** `gpt-5.6-luna` (ChatGPT Luna, `reasoningEffort: max`)
- **Fallback:** `kimi-k2.6`
- **API:** Luna usa Responses API; Kimi usa Chat Completions

---

## Interface do Usuário

### Componente: `agent-switcher.tsx`

```typescript
// Opção de seleção no chat
{
  id: 'odonto-vision',
  icon: <Eye className="w-4 h-4" />,
  name: 'Analise de Imagens',
  description: 'Analise radiografias e imagens odontologicas'
}
```

### Fluxo de Upload

1. Usuário seleciona agente "Odonto Vision"
2. Interface exibe área de drag-and-drop para imagens
3. Usuário envia imagem com mensagem ou apenas a imagem
4. Sistema processa a imagem com modelo de visão
5. Retorna análise detalhada com markdown

---

## Monitoramento

### Métricas Rastreadas

| Métrica | Target | Local |
|---------|--------|-------|
| Latência média | ≤15s | Dashboard |
| Taxa de sucesso | ≥95% | Sentry |
| Tempo de processamento imagem | ≤10s | Logs |

### Sentry Tags

```typescript
sentry.captureMessage('Vision analysis completed', {
  tags: {
    agent: 'odonto-vision',
    model: 'qwen2-vl-72b-instruct',
    image_type: 'periapical_xray'
  }
});
```

---

## Limitações Conhecidas

1. **Tamanho de arquivo** - Máximo 10MB por imagem
2. **Formatos** - Não suporta DICOM nativamente (conversão necessária)
3. **Resolução** - Imagens muito pequenas podem ter análise limitada
4. **Qualidade** - Imagens borradas ou mal iluminadas afetam precisão

---

## Boas Práticas

### Para Melhor Análise

- ✅ Use radiografias com boa nitidez
- ✅ Inclua marcadores de lado (D/E) quando aplicável
- ✅ Forneça contexto clínico na mensagem
- ✅ Envie múltiplas imagens para comparação

### Para Evitar

- ❌ Imagens muito pequenas ou pixeladas
- ❌ Fotos sem iluminação adequada
- ❌ Radiografias com artefatos
- ❌ Imagens extremamente grandes (otimize antes)

---

## Troubleshooting

### "Erro ao processar imagem"
→ Verifique formato e tamanho do arquivo. Tente converter para JPEG.

### "Modelo de visão indisponível"
→ Verifique quota da API OpenRouter. O fallback pode estar ativado.

### "Análise incompleta"
→ Tente enviar novamente com mais contexto na mensagem.

---

## Próximas Melhorias

- [ ] Suporte a DICOM
- [ ] Comparação side-by-side de imagens
- [ ] Histórico de análises por paciente
- [ ] Exportação de laudos em PDF

---

**Última atualização:** 2026-03-27
