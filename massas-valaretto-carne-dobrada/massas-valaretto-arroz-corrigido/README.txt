MASSAS VALARETTO — SITE DE PEDIDO DE MARMITAS

VERSÃO CONSOLIDADA
- Mini R$20,00: 1 refogado, 1 massa, 1 carne
- Médio R$25,00: 1 refogado, 1 massa, 2 carnes
- Grande R$35,00: 1 refogado, 2 massas, 2 carnes
- Arroz e feijão fixos; farofa pode ser retirada
- Cliente pode adicionar várias marmitas diferentes ao mesmo pedido
- Retirada na loja ou entrega
- Para entrega, o cliente informa somente o endereço completo
- Não existe cálculo automático de taxa de entrega
- A taxa é informada pelo atendimento no WhatsApp antes da confirmação
- Campo de observações removido
- Pedido enviado ao WhatsApp 17 98113-0555

FORMAS DE PAGAMENTO
- PIX
- Dinheiro
- Cartão de crédito
- Cartão de débito

REGRAS DE PAGAMENTO
- Retirada: pagamento somente no caixa.
- Entrega: PIX, crédito e débito somente na maquininha; dinheiro pago ao entregador.
- Não há pagamento antecipado pelo site.
- Em dinheiro, o cliente pode informar troco para quanto.

ADMINISTRAÇÃO DO CARDÁPIO
1. Na Netlify, configure ADMIN_PASSWORD em Variáveis ambientais.
2. Faça um novo deploy após criar ou trocar a senha.
3. Acesse https://SEU-SITE.netlify.app/admin/
4. Digite a senha.
5. Edite data, arrozes, refogados, massas e carnes.
6. Clique em Salvar cardápio.

DEPLOY
A raiz do repositório deve conter diretamente:
- netlify/
- public/
- netlify.toml
- package.json
- README.txt

Na Netlify:
- Base directory: vazio
- Publish directory: public
- Functions directory: netlify/functions

O projeto usa Netlify Functions + Netlify Blobs para salvar o cardápio do painel /admin/.
