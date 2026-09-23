document.addEventListener('DOMContentLoaded', () => {
    renderizarPaginaCarrinho();
});

const formatarDinheiroCheckout = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/* =======================================================
   HORÁRIOS PRÉ-ESTABELECIDOS (07:30 → 20:00, a cada 30min)
======================================================= */
function gerarHorarios() {
    const slots = [];
    let h = 7, m = 30;
    while (h < 20 || (h === 20 && m === 0)) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
        m += 30;
        if (m >= 60) { m -= 60; h++; }
    }
    return slots;
}

const HORARIOS_DISPONIVEIS = gerarHorarios();

/* =======================================================
   DATA MÍNIMA = AMANHÃ
======================================================= */
function getDataMinima() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return amanha.toISOString().split('T')[0];
}

/* =======================================================
   ATUALIZA O BADGE NOS CARDS AO VIVO (sem re-renderizar)
======================================================= */
function atualizarBadgesRetirada() {
    // Removida a atualização global de badges (agora a data vem de cada item)
}

/* =======================================================
   RENDER PRINCIPAL DA PÁGINA DE CHECKOUT
======================================================= */
function renderizarPaginaCarrinho() {
    const containerLista  = document.getElementById('lista-pagina-carrinho');
    const containerResumo = document.getElementById('resumo-pagina-carrinho');

    let itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (itensCarrinho.length === 0) {
        document.getElementById('container-checkout').innerHTML = `
            <div class="carrinho-vazio">
                <img src="./Imagens Secundarias/Pão.svg" alt="Carrinho Vazio">
                <h2>Seu carrinho está vazio!</h2>
                <p>Que tal dar uma olhada nas nossas delícias fresquinhas?</p>
                <a href="pagina-catalogo.html?filtro=retiravel" class="btn-voltar-loja">Ver Catálogo de Produtos</a>
            </div>
        `;
        return;
    }

    /* ---- Coluna esquerda: cards dos itens ---- */
    containerLista.innerHTML = '';
    let valorTotal = 0;
    let totalItens = 0;

    itensCarrinho.forEach((item, index) => {
        const qtd      = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        valorTotal += subtotal;
        totalItens += qtd;

        containerLista.innerHTML += `
            <div class="card-produto-checkout">
                <div class="info-produto">
                    <h3>${item.nome}</h3>
                    <span class="detalhes-valores">
                        Valor unitário: ${formatarDinheiroCheckout(item.preco)} (x${qtd})
                    </span>
                    <span class="badge-retirada-item" style="
                        display: block;
                        margin-top: 8px;
                        font-size: 0.88rem;
                        font-weight: 700;
                        font-family: 'Nunito', sans-serif;
                        color: #4A7C59;
                    ">📅 Retirada: ${item.dataRetirada.split('-').reverse().join('/')} às ${item.horaRetirada}</span>
                </div>
                <div class="acoes-produto">
                    <span class="subtotal-item">${formatarDinheiroCheckout(subtotal)}</span>
                    <button class="btn-remover-checkout" onclick="removerItemCheckout(${index})">Remover ✕</button>
                </div>
            </div>
        `;
    });

    /* ---- Opções de horário removidas do resumo ---- */

    /* ---- Coluna direita: agendamento + pagamento + totais ---- */
    containerResumo.innerHTML = `
        <h2>Resumo do Pedido</h2>

        <div class="linha-resumo">
            <span>Total de itens:</span>
            <span>${totalItens} un</span>
        </div>
        <div class="linha-resumo">
            <span>Subtotal:</span>
            <span>${formatarDinheiroCheckout(valorTotal)}</span>
        </div>

        <!-- Agendamento removido (agora é por item) -->
        <!-- ============================================================ -->

        <!-- FORMAS DE PAGAMENTO -->
        <div class="opcoes-pagamento-checkout">
            <h3 style="font-family:'Nunito'; font-size:1.1rem; color:var(--cafe-escuro); margin-bottom:10px;">Pagar na Retirada com:</h3>
            <label class="payment-option-checkout">
                <input type="radio" name="pagamento-checkout" value="Pix" checked> Pix (QR Code)
            </label>
            <label class="payment-option-checkout">
                <input type="radio" name="pagamento-checkout" value="Cartão de Crédito"> Cartão de Crédito
            </label>
            <label class="payment-option-checkout">
                <input type="radio" name="pagamento-checkout" value="Cartão de Débito"> Cartão de Débito
            </label>
            <label class="payment-option-checkout">
                <input type="radio" name="pagamento-checkout" value="Dinheiro"> Dinheiro Espécie
            </label>
        </div>

        <div class="total-resumo">
            <span>Total:</span>
            <span>${formatarDinheiroCheckout(valorTotal)}</span>
        </div>

        <button class="btn-comprar-tudo" onclick="finalizarCompra(${valorTotal}, ${totalItens})">Finalizar Compra</button>

        <button class="btn-voltar-compras" onclick="window.location.href='padaria-landinpage.html'">Voltar às Compras</button>

        <button class="btn-remover-checkout" style="width:100%; margin-top:15px; text-align:center;" onclick="limparCarrinhoCompleto()">Esvaziar Carrinho</button>
    `;

    // Atualiza badges caso a página seja re-renderizada com dados já existentes
    atualizarBadgesRetirada();
}

/* =======================================================
   REMOÇÃO COM MODAL PERSONALIZADO
======================================================= */
let indiceRemocaoAtual = null;
let limparTudo = false;

function removerItemCheckout(index) {
    indiceRemocaoAtual = index;
    limparTudo = false;
    document.getElementById('titulo-modal-remocao').innerText = '⚠️ Remover Item?';
    document.getElementById('texto-modal-remocao').innerText  = 'Tem certeza que deseja retirar este item do seu pedido?';
    document.getElementById('modal-remover-item').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function limparCarrinhoCompleto() {
    limparTudo = true;
    document.getElementById('titulo-modal-remocao').innerText = '⚠️ Esvaziar Carrinho?';
    document.getElementById('texto-modal-remocao').innerText  = 'Tem certeza que deseja apagar TODOS os itens do seu pedido?';
    document.getElementById('modal-remover-item').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalRemocao() {
    document.getElementById('modal-remover-item').style.display = 'none';
    document.body.style.overflow = 'auto';
    indiceRemocaoAtual = null;
    limparTudo = false;
}

function confirmarRemocao() {
    let itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (limparTudo) {
        localStorage.removeItem('carrinho');
        if (typeof mostrarToast === 'function') mostrarToast('Carrinho esvaziado com sucesso!');
    } else if (indiceRemocaoAtual !== null) {
        itensCarrinho.splice(indiceRemocaoAtual, 1);
        localStorage.setItem('carrinho', JSON.stringify(itensCarrinho));
        if (typeof mostrarToast === 'function') mostrarToast('Item removido!');
    }

    fecharModalRemocao();
    renderizarPaginaCarrinho();
    if (typeof atualizarInterfaceCarrinho === 'function') atualizarInterfaceCarrinho();
}

/* =======================================================
   FINALIZAR COMPRA — aplica data/hora única em todos os itens
======================================================= */
// O NOVO FLUXO DE RECIBO AO FINALIZAR
// O NOVO FLUXO DE RECIBO AO FINALIZAR
function finalizarCompra(valorTotal, totalItens) {
    const estaLogado = localStorage.getItem('usuarioLogado');

    if (!estaLogado || estaLogado !== 'true') {
        alert("Por favor, faça login antes de finalizar a compra.");
        window.location.href = 'padaria-login.html';
        return;
    }

    // Captura o input de rádio que estiver marcado
    const formaPagamento = document.querySelector('input[name="pagamento-checkout"]:checked');
    const pagamentoEscolhido = formaPagamento ? formaPagamento.value : null;

    if (!pagamentoEscolhido) { alert("Por favor, selecione a forma de pagamento."); return; }

    const dataHoje = new Date().toLocaleDateString('pt-BR');

    let carrinhoAtual = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    // Resgata o email real gravado no momento do login
    const emailDoCliente = localStorage.getItem('emailUsuario') || 'Cliente Desconhecido';

    const novoPedidoAdmin = {
        cliente: emailDoCliente, 
        dataPedido: dataHoje,
        itens: carrinhoAtual,
        valorTotal: valorTotal,
        pagamento: pagamentoEscolhido
    };

    const btnFinalizar = document.querySelector('.btn-comprar-tudo');
    const textoOriginalBtn = btnFinalizar ? btnFinalizar.innerText : 'Finalizar Compra';
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.innerText = '⏳ Processando Pedido...';
        btnFinalizar.style.cursor = 'not-allowed';
    }

    // Envia o payload direto para a API Node
    fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPedidoAdmin)
    })
    .then(async resposta => {
        if (!resposta.ok) {
            const erroAPI = await resposta.json();
            throw new Error(erroAPI.erro || 'Não foi possível salvar o pedido no banco.');
        }
        return resposta.json();
    })
    .then(dados => {
        // Mostra o modal de sucesso na tela apenas se salvou com sucesso no MySQL
        const codigo = dados.pedidosGerados ? dados.pedidosGerados.join(', ') : 'N/A';
        document.getElementById('display-codigo').innerText  = codigo;
        document.getElementById('modal-qtd').innerText       = totalItens + ' un';
        document.getElementById('modal-total').innerText     = formatarDinheiroCheckout(valorTotal);
        document.getElementById('modal-pagamento').innerText = pagamentoEscolhido;

        document.getElementById('modal-confirmacao').style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Limpa o carrinho local e salva no histórico local
        let historico = JSON.parse(localStorage.getItem('historicoPedidos')) || [];
        historico.push(novoPedidoAdmin); 
        localStorage.setItem('historicoPedidos', JSON.stringify(historico));
        localStorage.removeItem('carrinho');
    })
    .catch(erro => {
        console.error("Erro detalhado no checkout:", erro);
        alert("Erro ao processar compra: " + erro.message);
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.innerText = textoOriginalBtn;
            btnFinalizar.style.cursor = 'pointer';
        }
    });
}

function fecharModalCompra() {
    document.getElementById('modal-confirmacao').style.display = 'none';
    document.body.style.overflow = 'auto';
    localStorage.removeItem('carrinho');
    window.location.href = 'meus-pedidos.html';
}
