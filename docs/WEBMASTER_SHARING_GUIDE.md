# Guia de Compartilhamento para Webmasters
## Procedural Star Chasers - Open Graph Implementation Guide

Baseado na documentação oficial do Facebook para otimizar conteúdo compartilhado na web.

---

## 📋 Sumário

1. [Marcação do Open Graph](#marcação-do-open-graph)
2. [Teste da Marcação](#teste-da-marcação)
3. [Tipos de Conteúdo de Mídia](#tipos-de-conteúdo-de-mídia)
4. [Agente de Usuário do Facebook](#agente-de-usuário-do-facebook)
5. [Checklist de Implementação](#checklist-de-implementação)
6. [Troubleshooting](#troubleshooting)

---

## Marcação do Open Graph

A marcação com tags Open Graph é essencial para controlar como seu conteúdo é exibido quando compartilhado no Facebook e outras redes sociais.

### Por que usar Open Graph?

**Sem tags Open Graph:**
- Facebook usa heurísticas internas para adivinhar título, descrição e imagem
- Resultados imprevisíveis
- Qualidade menor do compartilhamento

**Com tags Open Graph:**
- Controle total sobre aparência
- Apresentação profissional
- Maior engajamento

### Tags Básicas Implementadas

Todas as seguintes tags estão configuradas em `index.html`:

#### 1. **og:url** ✅
```html
<meta property="og:url" content="https://bolivaralencastro.github.io/procedural-star-chasers-/" />
```
- URL canônica da página
- Sem parâmetros de sessão ou rastreamento
- Agregará curtidas e compartilhamentos a esta URL

#### 2. **og:title** ✅
```html
<meta property="og:title" content="Procedural Star Chasers — Where Space Becomes Symphony" />
```
- Título sem marca do site
- Será exibido como título do post
- Máx. 88 caracteres (recomendado)

#### 3. **og:description** ✅
```html
<meta property="og:description" content="An indie masterpiece of procedural cosmos and emergent narratives. Watch three unique AI personalities compete, cooperate, and contemplate in an infinite universe." />
```
- Breve descrição (2-4 frases)
- Exibida abaixo do título
- Aproximadamente 150-200 caracteres

#### 4. **og:image** ✅
```html
<meta property="og:image" content="https://bolivaralencastro.github.io/procedural-star-chasers-/assets/og/og-image-facebook-1200x630.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
```
- URL da imagem de prévia
- **Dimensões obrigatórias** para carregamento instantâneo
- **Tipo MIME** especificado
- Mínimo 600px de largura (recomendado 1200px)

#### 5. **og:type** ✅
```html
<meta property="og:type" content="website" />
```
- Tipo de conteúdo: `website` (padrão)
- Afeta exibição no Feed
- Uma única URL = um único og:type

#### 6. **og:locale** ✅
```html
<meta property="og:locale" content="en_US" />
```
- Localidade do recurso
- Padrão: `en_US`
- Pode adicionar `og:locale:alternate` para traduções

#### 7. **og:site_name** ✅
```html
<meta property="og:site_name" content="Procedural Star Chasers" />
```
- Nome do site para identificação
- Exibido em alguns contextos de compartilhamento

#### 8. **fb:app_id** ✅ (Configuração Pendente)
```html
<meta property="fb:app_id" content="placeholder_app_id" />
```
- **Para ativar:** Substitua `placeholder_app_id` com ID real do Facebook
- Necessário para usar Facebook Insights
- Encontre em: [Facebook App Dashboard](https://developers.facebook.com/apps)
- Benefícios:
  - Análise de tráfego do Facebook
  - Rastreamento de compatilhamentos
  - Engajamento por plataforma

---

## Teste da Marcação

### 1. **Facebook Sharing Debugger** 🔍
Ferramenta oficial para validar marcação

**URL:** https://developers.facebook.com/tools/debug/

**Processo:**
1. Cole a URL: `https://bolivaralencastro.github.io/procedural-star-chasers-/`
2. Clique em "Fetch New Scrape"
3. Verifique:
   - ✅ Imagem carregada corretamente
   - ✅ Título e descrição reconhecidos
   - ✅ Sem avisos ou erros
   - ✅ Tipo de conteúdo correto

**O que procurar:**
```
✅ Property: og:title
   Value: "Procedural Star Chasers — Where Space Becomes Symphony"

✅ Property: og:description
   Value: "An indie masterpiece..."

✅ Property: og:image
   Value: "https://bolivaralencastro.github.io/procedural-star-chasers-/assets/og/og-image-facebook-1200x630.png"
   Dimensions: 1200 x 630

✅ No errors or warnings
```

### 2. **LinkedIn Post Inspector** 🔗
Validação para LinkedIn

**URL:** https://www.linkedin.com/post-inspector/

**Processo:**
1. Cole a URL
2. Clique em "Inspect"
3. Verifique:
   - ✅ Imagem 1200×627 reconhecida
   - ✅ Descrição completa
   - ✅ Sem avisos

### 3. **Twitter Card Validator** 🐦
Validação para Twitter

**URL:** https://cards-dev.twitter.com/validator

**Processo:**
1. Cole a URL
2. Verifique tipo de card: `summary_large_image`

### 4. **Pinterest Rich Pins Debugger** 📌
Validação para Pinterest

**URL:** https://developers.pinterest.com/tools/url-debugger/

**Processo:**
1. Cole a URL
2. Verifique preview com imagem 1000×1500

---

## Tipos de Conteúdo de Mídia

### Video (Se Aplicável no Futuro)

Para conteúdo com vídeos, adicione:

```html
<!-- Vídeo -->
<meta property="og:video" content="https://example.com/video.mp4" />
<meta property="og:video:secure_url" content="https://example.com/video.mp4" />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="1280" />
<meta property="og:video:height" content="720" />

<!-- Imagem de preview para o vídeo -->
<meta property="og:image" content="https://example.com/video-preview.jpg" />
```

**Formatos suportados:**
- `application/x-shockwave-flash` (Flash)
- `video/mp4` (MP4)

**Dimensões recomendadas para vídeo:**
- Mínimo: 600×314 px
- Recomendado: 1280×720 px (16:9)

### Imagens Múltiplas

Para conteúdo com várias imagens:

```html
<!-- Primeira imagem (principal) -->
<meta property="og:image" content="https://example.com/image1.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Imagens adicionais (opcionais) -->
<meta property="og:image" content="https://example.com/image2.jpg" />
<meta property="og:image" content="https://example.com/image3.jpg" />
```

---

## Agente de Usuário do Facebook

### Por que testar o User-Agent do Facebook?

O Facebook scrapy tem user-agent específico que pode ser tratado diferentemente pelo seu servidor:

```
User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)
```

### Como Testar (Chrome DevTools)

1. **Abra as Developer Tools** (F12)
2. **Pressione Cmd+Shift+P** (Mac) ou **Ctrl+Shift+P** (Windows)
3. **Digite:** `user agent`
4. **Selecione:** "Show Network conditions"
5. **Desmarque:** "Use browser default"
6. **Digite user-agent:** `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`
7. **Recarregue a página** (Cmd+Shift+R para hard refresh)
8. **Verifique:** A página deve carregar e servir tags OG corretamente

### Teste Alternativo (cURL)

```bash
curl -H "User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" \
  https://bolivaralencastro.github.io/procedural-star-chasers-/
```

---

## Checklist de Implementação

### ✅ Tags Básicas

- [x] `og:url` - URL canônica
- [x] `og:title` - Título do conteúdo
- [x] `og:description` - Descrição (2-4 frases)
- [x] `og:image` - URL da imagem
- [x] `og:image:width` - Largura (1200px)
- [x] `og:image:height` - Altura (630px)
- [x] `og:image:type` - Tipo MIME (image/png)
- [x] `og:type` - Tipo de conteúdo (website)
- [x] `og:locale` - Localidade (en_US)
- [x] `og:site_name` - Nome do site

### ✅ Otimizações Adicionais

- [x] `og:image:alt` - Texto alternativo para imagem
- [x] Canonical URL (`<link rel="canonical">`)
- [x] `article:published_time` - Data de publicação
- [x] `article:author` - Autor
- [x] Meta description padrão
- [x] Viewport meta tags
- [x] Theme color

### ⏳ Configurações Pendentes

- [ ] `fb:app_id` - **Substitua `placeholder_app_id`** com ID real
- [ ] `apple-itunes-app` - Se houver app iOS
- [ ] `google-play-app` - Se houver app Android

### ✅ Plataformas Adicionais

- [x] Twitter Card (`twitter:card`, `twitter:image`)
- [x] LinkedIn (usa og: tags padrão)
- [x] Pinterest (`pinterest:image`)
- [x] Instagram (`instagram:image`)

---

## Troubleshooting

### Problema: "Imagem não carregada no Facebook Debugger"

**Possíveis causas:**
1. ❌ URL relativa em vez de absoluta
   - **Solução:** Use URL completa com `https://`
   
2. ❌ Domínio não acessível
   - **Solução:** Verifique que o domínio está publicado
   
3. ❌ Arquivo não é PNG válido
   - **Solução:** Verifique arquivo com `file` command
   
4. ❌ Dimensões não especificadas
   - **Solução:** Adicione `og:image:width` e `og:image:height`

**Diagnóstico:**
```bash
# Verificar se arquivo é PNG válido
file /path/to/image.png

# Verificar headers HTTP
curl -I https://domain.com/image.png
# Deve retornar: Content-Type: image/png
```

### Problema: "Content-Type inválido"

**Causa:** Servidor retorna `text/html` em vez de `image/png`

**Soluções:**
1. Renomear arquivo para `.png` (removendo caracteres especiais)
2. Usar URL absoluta em vez de relativa
3. Verificar configuração do servidor MIME types

### Problema: "Cache não atualiza"

**Por que:** Facebook cacheia imagens por URL

**Solução:** Use nova URL para imagem ou execute "Fetch New Scrape"

```
// Para forçar novo cache:
// 1. Mude a URL da imagem (adicione versão: image.png?v=2)
// 2. Ou use Facebook Debugger para forçar reprocessamento
```

### Problema: "Título/descrição truncados"

**Limites:**
- `og:title`: 88 caracteres recomendado
- `og:description`: 200 caracteres (4 linhas)

**Solução:** Encurte textos ou reescreva com conteúdo mais conciso

---

## 📊 Dimensões Recomendadas por Plataforma

| Plataforma | Tipo | Dimensões | Razão | Nota |
|-----------|------|-----------|-------|------|
| Facebook | Imagem | 1200×630 | 1.91:1 | Mínimo 600px |
| Instagram | Imagem | 1200×630 | 1.91:1 | Usa Facebook |
| Twitter | Imagem | 1024×512 | 2:1 | Card format |
| LinkedIn | Imagem | 1200×627 | 1.91:1 | Praticamente igual a FB |
| Pinterest | Imagem | 1000×1500 | 2:3 | Vertical |
| General Video | Vídeo | 1280×720 | 16:9 | Landscape |

---

## 🔗 Recursos Oficiais

- **Facebook Developers:** https://developers.facebook.com/docs/sharing/webmasters
- **Open Graph Reference:** https://ogp.me/
- **Debugger:** https://developers.facebook.com/tools/debug/
- **Insights:** https://developers.facebook.com/docs/plugins/page-plugin

---

## 📝 Próximos Passos

### 1. Adicionar Facebook App ID
```html
<!-- Substitua "YOUR_APP_ID" com ID real -->
<meta property="fb:app_id" content="YOUR_APP_ID" />
```

**Como obter:**
1. Acesse: https://developers.facebook.com/apps
2. Crie novo app ou use existente
3. Copie o App ID
4. Adicione em index.html

### 2. Implementar Facebook Pixel (Opcional)
Para rastreamento de conversões e remarketing:

```html
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  // ... pixel code ...
}
</script>
```

### 3. Testar em Todos os Debuggers
- ✅ Facebook Debugger
- ✅ LinkedIn Post Inspector
- ✅ Twitter Card Validator
- ✅ Pinterest URL Debugger

### 4. Monitorar Compartilhamentos
Use Google Analytics ou Facebook Insights para acompanhar:
- Quantidade de compartilhamentos
- Engajamento por plataforma
- Traffic referral

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do servidor** - Procure por erros HTTP
2. **Usar Facebook Debugger** - Ferramenta mais confiável
3. **Testar User-Agent** - Simular comportamento do Facebook
4. **Consultar documentação** - https://developers.facebook.com/docs/

---

*Última atualização: 19 de novembro de 2025*
*Versão: 1.0*
*Status: Production Ready ✅*
