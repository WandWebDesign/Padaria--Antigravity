/* =======================================================
   LÓGICA DA PÁGINA: MEUS PEDIDOS (CLIENTE - VIA BANCO DE DADOS)
======================================================= */

/* =======================================================
   LÓGICA DA PÁGINA: MEUS PEDIDOS (CLIENTE - VIA BANCO DE DADOS)
======================================================= */

let idDoPedidoParaCancelar = null;
const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000'; 

document.addEventListener('DOMContentLoaded', () => {
    renderizarHistorico();
    // Removemos a lógica complexa do botão daqui e transformamos 
    // em uma função própria logo abaixo para facilitar o uso no HTML.
});

// =======================================================
// NOVA FUNÇÃO: CANCELAMENTO DIRETO PELO CLIENTE
// =======================================================
async function confirmarCancelamentoCliente() {
    if (!idDoPedidoParaCancelar) return;

    try {
        // Manda a requisição PUT para atualizar o status lá no MySQL
        const resposta = await fetch(`${API_BASE}/api/pedidos/${idDoPedidoParaCancelar}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelado', justificativa: 'Cancelado pelo cliente' }) 
        });

        if (resposta.ok) {
            fecharModalCancelamento(); // Fecha a janelinha
            if (typeof mostrarToast === 'function') mostrarToast("Pedido cancelado com sucesso!");
            renderizarHistorico(); // Recarrega a tela para a tarja ficar cinza imediatamente
        } else {
            alert("Erro ao cancelar o pedido no servidor.");
        }
    } catch (erro) {
        alert("Erro de conexão ao tentar cancelar.");
    }
}

function podeCancelar(dataRetiradaStr, horaRetiradaStr) {
    if (!dataRetiradaStr || !horaRetiradaStr) return true;
    const [dia, mes, ano] = dataRetiradaStr.split('/');
    const [hora, minuto] = horaRetiradaStr.split(':');
    
    const dataRetirada = new Date(ano, mes - 1, dia, hora, minuto, 0); 
    const agora = new Date();
    
    const diferencaHoras = (dataRetirada - agora) / (1000 * 60 * 60);
    return diferencaHoras >= 2; 
}

// Transformamos a função em async para poder usar o await do banco
async function renderizarHistorico() {
    const container = document.getElementById('container-historico');
    const emailUsuario = localStorage.getItem('emailUsuario'); // Pega quem está logado

    if (!container) return;

    if (!emailUsuario) {
        container.innerHTML = `<p style="text-align:center; padding:50px; color:#A89F98; font-weight:bold;">Faça login para ver seus pedidos.</p>`;
        return;
    }

    container.innerHTML = `<p style="text-align:center; padding:50px; color:#C8973D; font-weight:bold;">Carregando seus pedidos do sistema...</p>`;

    try {
        // Busca diretamente da nova rota do Node.js
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}`);
        if (!resposta.ok) throw new Error('Erro na resposta do servidor');
        
        const historicoBD = await resposta.json();

        if (historicoBD.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:50px; color:#A89F98; font-weight:bold;">Nenhum pedido encontrado no seu histórico.</p>`;
            return;
        }

        container.innerHTML = '';
        
        historicoBD.forEach((pedido) => {
            const statusAtual = pedido.status || "Pendente";
            
            const coresStatus = {
                "Pendente": "#D9534F",
                "Em produção": "#F0AD4E",
                "Finalizado": "#5CB85C",
                "Cancelado": "#777777"
            };
            const corTag = coresStatus[statusAtual] || "#A89F98";

            const avisoFinalizado = statusAtual === "Finalizado" 
                ? `<div style="background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 8px; margin: 15px 0; font-weight: 800; text-align: center; border: 1px solid #c8e6c9;">✅ Seu pedido está pronto para retirada! Apresente o código no balcão.</div>` 
                : '';

            const dentroDoPrazo = podeCancelar(pedido.dataRetirada, pedido.horaRetirada);
            const cancelamentoPermitido = dentroDoPrazo && statusAtual === "Pendente";

            const div = document.createElement('div');
            div.className = 'card-pedido-finalizado';
            div.style.borderTop = `5px solid ${corTag}`;
            if (statusAtual === "Cancelado") div.style.opacity = "0.7";
            
            const itensHTML = pedido.itens.map(item => `
                <li>${item.quantidade}x ${item.nome}</li>
            `).join('');

            let textoBloqueio = "Prazo encerrado";
            if(statusAtual === "Em produção") textoBloqueio = "Pedido já em andamento";
            if(statusAtual === "Cancelado") textoBloqueio = "Pedido Cancelado";

            // ALTERAÇÃO 2: Criando o visual da justificativa de cancelamento
            const isCancelado = statusAtual === 'Cancelado';
            const motivoHTML = (isCancelado && pedido.justificativa) 
                ? `<div style="margin-top: 10px; margin-bottom: 15px; padding: 10px; background-color: #fdf0f0; border-left: 4px solid #D9534F; border-radius: 4px; text-align: left;">
                       <strong style="color: #D9534F; font-size: 0.9rem;">Motivo do Cancelamento:</strong>
                       <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #333;">${pedido.justificativa}</p>
                   </div>`
                : '';

            div.innerHTML = `
                <div class="pedido-info">
                    <div style="margin-bottom: 15px;">
                        <span class="data-compra">Realizado em ${pedido.dataPedido}</span><br>
                        <span style="font-size: 0.85rem; color: #7A6A5A;">📅 Retirada agendada para: <strong>${pedido.dataRetirada || 'Indefinida'} às ${pedido.horaRetirada || ''}</strong></span>
                    </div>
                    
                    <h2>Pedido #${pedido.id}</h2>
                    ${avisoFinalizado}
                    
                    ${motivoHTML}

                    <ul class="lista-itens-resumo">${itensHTML}</ul>
                    <p>Total: <strong>R$ ${pedido.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></p>
                </div>
                
                <div class="acoes-historico" style="display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 180px;">
                    <span style="background-color: ${corTag}; color: white; padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; width: 100%; text-align: center; box-sizing: border-box;">
                        ${statusAtual}
                    </span>
                    
                    <div class="codigo-tag" style="width: 100%; box-sizing: border-box; text-align: center; margin: 0;">
                        ${pedido.id}
                    </div>
                    
                    ${cancelamentoPermitido 
                        ? `<button class="btn-cancelar-pedido" onclick="cancelarPedido('${pedido.id}')" style="margin-top: 0;">Cancelar Pedido</button>`
                        : `<span class="prazo-expirado" style="margin-top: 0;">${textoBloqueio}</span>`
                    }
                </div>
            `;
            container.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro na leitura BD:", erro);
        container.innerHTML = `<p style="text-align:center; padding:50px; color:red; font-weight:bold;">Erro ao conectar com o banco de dados.</p>`;
    }
}

function cancelarPedido(idDoPedido) {
    idDoPedidoParaCancelar = idDoPedido;
    const modal = document.getElementById('modal-cancelamento');
    if (modal) modal.style.display = 'flex'; 
}

function fecharModalCancelamento() {
    const modal = document.getElementById('modal-cancelamento');
    if (modal) modal.style.display = 'none'; 
    idDoPedidoParaCancelar = null;
}

function filtrarPedidos() {
    const statusSelecionado = document.getElementById('filtro-status').value.toLowerCase();
    const cardsPedidos = document.querySelectorAll('.card-pedido-finalizado');

    cardsPedidos.forEach(card => {
        const textoCard = card.innerText.toLowerCase();
        if (statusSelecionado === 'todos') {
            card.style.display = ''; 
        } else if (textoCard.includes(statusSelecionado)) {
            card.style.display = ''; 
        } else {
            card.style.display = 'none'; 
        }
    });
}

// =======================================================
// LÓGICA DOS BOTÕES DE LIMPAR HISTÓRICO (VIA ONCLICK DO HTML)
// =======================================================

async function limparTodosFinalizados() {
    const emailUsuario = localStorage.getItem('emailUsuario');
    if (!emailUsuario) return;

    if (!confirm("Tem certeza que deseja excluir todos os pedidos Finalizados e Cancelados do seu histórico?")) return;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}/concluidos`, {
            method: 'DELETE'
        });

        if (resposta.ok) {
            if (typeof mostrarToast === 'function') mostrarToast("Pedidos concluídos removidos!");
            renderizarHistorico(); // Recarrega a tela
        } else {
            alert("Erro ao remover pedidos.");
        }
    } catch (erro) {
        alert("Erro de conexão ao tentar limpar.");
    }
}

async function limparTodoHistorico() {
    const emailUsuario = localStorage.getItem('emailUsuario');
    if (!emailUsuario) return;

    if (!confirm("ATENÇÃO: Tem certeza que deseja apagar TODOS os seus pedidos? Esta ação não pode ser desfeita.")) return;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}/todos`, {
            method: 'DELETE'
        });

        if (resposta.ok) {
            if (typeof mostrarToast === 'function') mostrarToast("Todo o histórico foi apagado!");
            renderizarHistorico(); // Recarrega a tela
        } else {
            alert("Erro ao limpar todo o histórico.");
        }
    } catch (erro) {
        alert("Erro de conexão ao tentar limpar tudo.");
    }
}
