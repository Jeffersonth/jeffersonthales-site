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
   ├─ js/main.js                  # animações de rolagem, portfólio, formulário
   └─ img/                        # foto, prints do portfólio, favicon e imagem de compartilhamento
```

## Ver no computador

Na pasta do projeto (um nível acima de `site/`):

```bash
node ferramentas/servidor-local.mjs site 4321
```

Depois abra http://localhost:4321.

## Publicar

O site roda na VPS Hostinger como projeto Docker `jeffersonthales-site` (`docker-compose.yml`). Ao iniciar, o contêiner baixa este repositório (`deploy/start.sh`). Para publicar uma mudança: `git push` e reiniciar o projeto no Docker Manager do hPanel.

## Configurações (topo de `assets/js/main.js`)

| Opção | O que faz |
| --- | --- |
| `whatsapp` | Número usado nos links gerados pelo JavaScript (formulário). Os links fixos no HTML usam o mesmo número. |
| `formEndpoint` | Vazio: o formulário abre o WhatsApp com o pedido preenchido. Com uma URL (Formspree, Web3Forms…), o pedido é enviado por e-mail e aparece "Recebi seu pedido". |

## Pendências

- [ ] **Depoimentos**: a seção está escondida (`hidden`) até existirem depoimentos reais. Troque os textos e nomes e remova o atributo `hidden`.
- [ ] **Portfólio**: confirmar os endereços da Clínica Floreser, XDN Travel e Kalango (hoje os cards apontam para a própria página).
- [ ] **Política de Privacidade**: revisar o texto modelo.
- [ ] **Google**: cadastrar o site no Search Console e enviar o `sitemap.xml`; criar o GA4 e medir cliques no WhatsApp.
