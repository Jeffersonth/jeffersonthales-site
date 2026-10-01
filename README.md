# Site — Jefferson Thales · Soluna IA

Landing page em HTML, CSS e JavaScript puros, construída a partir do design "Landing Page" do Claude Design. Não tem etapa de build nem dependências: o que está nesta pasta é exatamente o que vai para o ar.

## Estrutura

```
site/
├─ index.html                     # a página inteira (SEO, schema, todas as seções)
├─ politica-de-privacidade.html   # exigida pela LGPD (revisar antes de publicar)
├─ robots.txt · sitemap.xml
└─ assets/
   ├─ css/styles.css              # base, animações, estados de hover e regras de celular
   ├─ js/main.js                  # animações de rolagem, chat da Luna, portfólio, formulário
   └─ img/                        # foto, prints do portfólio, favicon e imagem de compartilhamento
```

## Ver no computador

Na pasta do projeto (um nível acima de `site/`):

```bash
node ferramentas/servidor-local.mjs site 4321
```

Depois abra http://localhost:4321.

## Publicar

Envie o **conteúdo** da pasta `site/` para a raiz do domínio (Hostinger: `public_html`; Vercel ou Netlify: arraste a pasta). Não há nada para compilar.

## Configurações (topo de `assets/js/main.js`)

| Opção | O que faz |
| --- | --- |
| `whatsapp` | Número usado nos links gerados pelo JavaScript (Luna e formulário). Os links fixos no HTML usam o mesmo número. |
| `formEndpoint` | Vazio: o formulário abre o WhatsApp com o pedido preenchido. Com uma URL (Formspree, Web3Forms…), o pedido é enviado por e-mail e aparece "Recebi seu pedido". |
| `lunaEndpoint` | `/api/luna.php` (padrão): a Luna conversa com IA. Vazio: só respostas prontas (preços, prazos, orçamento). O endpoint recebe `POST {messages}` e responde `{reply}`. |
| `lunaPreviewSeconds` | Segundos até aparecer o balão "Oi! Quer ver quanto custa seu site?". |

## Luna (agente de IA)

`api/luna.php` recebe a conversa e responde com o Claude (`claude-opus-5-5`, esforço baixo, respostas curtas). O prompt fica só no servidor. Limites contra abuso: 20 mensagens por conversa, 1.000 caracteres por mensagem, 20 mensagens por IP a cada 10 minutos e 80 por dia. A chave é lida da variável `ANTHROPIC_API_KEY` ou do arquivo `luna-secret.php` um nível acima da pasta pública. Se o backend falhar, a Luna usa as respostas prontas. Instalação: veja `PUBLICAR.md`.

## Pendências

- [ ] **Depoimentos**: a seção está escondida (`hidden`) até existirem depoimentos reais. Troque os textos e nomes e remova o atributo `hidden`.
- [ ] **Portfólio**: confirmar os endereços da Clínica Floreser, XDN Travel e Kalango (hoje os cards apontam para a própria página).
- [ ] **Política de Privacidade**: revisar o texto modelo.
- [ ] **Google**: cadastrar o site no Search Console e enviar o `sitemap.xml`; criar o GA4 e medir cliques no WhatsApp.
