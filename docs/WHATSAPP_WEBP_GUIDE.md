# WhatsApp Open Graph Preview Guide (WEBP Format)

## 📱 Por que WEBP para WhatsApp?

WhatsApp requer **formato WEBP** para renderizar corretamente as pré-visualizações de links compartilhados. Outros formatos como PNG e JPEG não funcionam de forma consistente, resultando em:
- ❌ Pré-visualização não aparecendo
- ❌ Imagem corrompida
- ❌ Carregamento lento

## 🎯 Requisitos Técnicos para WhatsApp

| Aspecto | Especificação |
|--------|--------------|
| **Formato** | WEBP |
| **Dimensões** | 1200x630 pixels |
| **Razão de aspecto** | 1.9:1 (landscape) |
| **Tamanho máximo** | Sem limite oficial, mas <100KB recomendado |
| **Qualidade** | 80% balanceia qualidade e tamanho |

## 📦 Arquivos OG Convertidos

Os seguintes arquivos foram convertidos de PNG para WEBP:

```
src/assets/og/
├── og-image-facebook-1200x630.webp    (63.62 KB) ⭐ WhatsApp
├── og-image-linkedin-1200x627.webp    (63.40 KB)
├── og-image-pinterest-1000x1500.webp  (87.87 KB)
├── og-image-twitter-1024x512.webp     (46.26 KB)
├── og-image-facebook-1200x630.png     (fallback)
├── og-image-linkedin-1200x627.png     (fallback)
├── og-image-pinterest-1000x1500.png   (fallback)
└── og-image-twitter-1024x512.png      (fallback)
```

**Redução de tamanho: ~95-96%** 🚀

## 🔧 Como Usar

### 1. **Testar no WhatsApp Web**

```bash
1. Abra WhatsApp Web (https://web.whatsapp.com)
2. Cole o URL do seu projeto em uma conversa
3. Aguarde 5-10 segundos para a pré-visualização carregar
```

### 2. **Limpar Cache do Facebook/WhatsApp**

Se a imagem não atualizar, use a ferramenta de debug do Facebook:

```bash
https://developers.facebook.com/tools/debug/
```

Cole sua URL e clique em "Scrape Again" para forçar a recarga.

### 3. **Atualizar Imagens OG**

Se você precisar atualizar as imagens PNG originais, use:

```bash
npm run convert:og-images
```

Este comando:
- ✅ Converte automaticamente PNG → WEBP
- ✅ Redimensiona se necessário
- ✅ Otimiza qualidade/tamanho
- ✅ Exibe estatísticas de conversão

## 📝 Meta Tags no HTML

O `index.html` foi atualizado com:

```html
<!-- WhatsApp requer WEBP como preferência -->
<meta property="og:image" content="...og-image-facebook-1200x630.webp" />
<meta property="og:image:type" content="image/webp" />

<!-- Fallback para plataformas antigas -->
<meta property="og:image" content="...og-image-facebook-1200x630.png" />
<meta property="og:image:type" content="image/png" />
```

**Ordem importa:** WEBP primeiro, PNG como fallback.

## 🚀 Plataformas Otimizadas

| Plataforma | Imagem | Dimensões | Formato |
|-----------|--------|-----------|---------|
| **WhatsApp** | facebook | 1200x630 | WEBP |
| **Facebook** | facebook | 1200x630 | WEBP |
| **Instagram** | facebook | 1200x630 | WEBP |
| **LinkedIn** | linkedin | 1200x627 | WEBP |
| **Pinterest** | pinterest | 1000x1500 | WEBP |
| **Twitter** | twitter | 1024x512 | WEBP |

## 💡 Dicas de Performance

1. **Cache Busting**: Se precisar forçar atualização, adicione parâmetro à URL:
   ```
   og-image-facebook-1200x630.webp?v=2
   ```

2. **Monitorar Tamanho**: Imagens WEBP devem estar entre 40-100KB
   - Menor que 40KB = qualidade muito baixa
   - Maior que 100KB = considere redutor

3. **Testar Frequentemente**: Sempre teste após atualizar imagens

## 🔗 Referências

- [WhatsApp Sharing - Meta Docs](https://developers.facebook.com/docs/sharing/webmasters)
- [Open Graph Protocol](https://ogp.me/)
- [WEBP Format - Google](https://developers.google.com/speed/webp)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

## 📋 Checklist de Deploy

- [ ] Imagens WEBP geradas com `npm run convert:og-images`
- [ ] `index.html` atualizado com meta tags WEBP
- [ ] Testado no WhatsApp Web
- [ ] Testado no Facebook Sharing Debugger
- [ ] Cache do CDN limpo (se necessário)
- [ ] Documentação atualizada

---

**Última atualização:** Novembro 2025  
**Status:** ✅ WEBP convertido e configurado
