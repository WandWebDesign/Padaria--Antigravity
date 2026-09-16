/* =======================================================
   LÓGICA ADMINISTRATIVA DO CRUD (Integrado ao MySQL via Node.js)
======================================================= */

let setorAdminAtual = 'padaria'; 
let imagensTemporarias = []; 
let imagensRemovidas = false; 

// TRAVA DE SEGURANÇA
document.addEventListener('DOMContentLoaded', () => {
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const estaLogado = localStorage.getItem('usuarioLogado');

    if (estaLogado !== 'true' || tipoUsuario !== 'funcionario') {
        if(typeof abrirModalAviso === 'function') {
            abrirModalAviso('Acesso Restrito', 'Esta área é exclusiva para colaboradores.');
        } else {
            alert('Acesso Restrito: Área exclusiva para colaboradores.');
        }
        setTimeout(() => { window.location.href = '../../padaria-login.html'; }, 2000); 
        return; 
    }

    const urlParams = new URLSearchParams(window.location.search);
    const setorDesejado = urlParams.get("setor");
    carregarCategoriasAdmin();
    carregarSetorAdmin(setorDesejado || setorAdminAtual);
});

async function carregarCategoriasAdmin() {
    try {
        const resposta = await fetch('/api/categorias');
        const categorias = await resposta.json();
        const datalist = document.getElementById('lista-categorias');
        if (datalist) {
            datalist.innerHTML = '';
            categorias.forEach(cat => {
                if(cat) {
                    datalist.innerHTML += `<option value="${cat}"></option>`;
                }
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar categorias:", erro);
    }
}

// =======================================================
// LER (Busca na API)
// =======================================================
async function carregarSetorAdmin(setor) {
    setorAdminAtual = setor;
    const gridAdmin = document.getElementById('grid-admin-produtos'); 
    const filtroStatus = document.getElementById('filtro-status-admin');
    const buscaInput = document.getElementById('busca-admin');
    const btnLimparSistema = document.getElementById('btn-limpar-sistema'); // <-- Captura o botão da topbar
    
    document.getElementById('titulo-setor-admin').innerText = setor.charAt(0).toUpperCase() + setor.slice(1);
    document.querySelectorAll('.btn-circulo').forEach(btn => btn.classList.remove('ativo'));
    const btnAtivo = document.getElementById(`btn-${setor}`);
    if(btnAtivo) btnAtivo.classList.add('ativo');

    // Limpa a barra de busca ao trocar de aba
    if(buscaInput) buscaInput.value = '';

    // CONTROLE DE VISIBILIDADE DO BOTÃO DE LIMPAR NA TOPBAR
    if (btnLimparSistema) {
        btnLimparSistema.style.display = (setor === 'pedidos') ? 'flex' : 'none';
    }

    if (setor === 'vendas') {
        gridAdmin.style.display = 'block'; 
        document.querySelector('.acoes-topo').style.display = 'none'; 
        document.querySelector('.filtros-admin-container').style.display = 'none';
        mostrarVendasNoAdmin();
    } 
    else if (setor === 'pedidos') {
        gridAdmin.style.display = 'grid'; 
        document.querySelector('.acoes-topo').style.display = 'none'; 
        document.querySelector('.filtros-admin-container').style.display = 'flex';
        
        if(filtroStatus) filtroStatus.style.display = 'block';
        if(buscaInput) buscaInput.placeholder = "Procurar pedido ou cliente...";
        
        mostrarPedidosNoAdmin();
    } else if (setor === 'clientes') {
        gridAdmin.style.display = 'grid'; 
        document.querySelector('.acoes-topo').style.display = 'none'; 
        document.querySelector('.filtros-admin-container').style.display = 'flex';
        
        if(filtroStatus) filtroStatus.style.display = 'none';
        if(buscaInput) buscaInput.placeholder = "Procurar cliente (Nome, CPF)...";
        
        mostrarClientesNoAdmin();
    }
    else {
        gridAdmin.style.display = 'grid'; 
        document.querySelector('.acoes-topo').style.display = 'block';
        document.querySelector('.filtros-admin-container').style.display = 'flex';
        
        if(filtroStatus) filtroStatus.style.display = 'none'; 
        if(buscaInput) buscaInput.placeholder = "Procurar produto...";
        
        try {
            const resposta = await fetch('/api/produtos');
            const produtosCompletos = await resposta.json();
            const produtosDoSetor = produtosCompletos.filter(p => p.nome_setor === setor);
            desenharGradeAdmin(produtosDoSetor);
        } catch (erro) {
            gridAdmin.innerHTML = '<p>Erro ao conectar com o banco de dados.</p>';
        }
    }
}
function desenharGradeAdmin(produtos) {
    const grid = document.getElementById('grid-admin-produtos');
    grid.innerHTML = '';

    if (produtos.length === 0) {
        grid.innerHTML = '<p>Nenhum produto neste setor.</p>';
        return;
    }

    produtos.forEach(prod => {
        // Formata os preços que vêm do banco (ex: 15.90 -> 15,90 / Kg)
        const precoFormatado = parseFloat(prod.valor).toFixed(2).replace('.', ',');
        const unidade = prod.unidade_medida ? ` / ${prod.unidade_medida}` : "";
        let precoDisplay = precoFormatado + unidade;

        if (prod.preco_oferta) {
            const oferta = parseFloat(prod.preco_oferta).toFixed(2).replace('.', ',');
            precoDisplay = `🔥 Oferta: R$ ${oferta}${unidade}`;
        } else {
            precoDisplay = `R$ ${precoDisplay}`;
        }

        const imagemCapa = prod.imagem_url || "../../Imagens/Logo.png";
        
        // Passa o objeto inteiro formatado como JSON para facilitar a edição
        const jsonProd = encodeURIComponent(JSON.stringify(prod));

        grid.innerHTML += `
            <div class="card-admin">
                <button class="btn-deletar-card" onclick="apagarProduto('${prod.codigo_produto}')" title="Excluir Produto">🗑️</button>
                <img src="${imagemCapa}" alt="${prod.nome}">
                <h5>Setor: ${prod.nome_setor}</h5>
                <h3>${prod.nome}</h3>
                <p class="preco">${precoDisplay}</p>
                <button class="btn-editar-card" onclick="abrirModalEditar('${jsonProd}')">Editar Produto</button>
            </div>
        `;
    });
}

// =======================================================
// EXCLUIR PRODUTO
// =======================================================
let produtoParaApagarId = null;

function apagarProduto(codigoProduto) {
    produtoParaApagarId = codigoProduto;
    document.getElementById('modal-excluir').style.display = 'flex';
}

function fecharModalExcluir() {
    document.getElementById('modal-excluir').style.display = 'none';
    produtoParaApagarId = null;
}

async function confirmarExclusao() {
    if (!produtoParaApagarId) return;

    try {
        const resposta = await fetch(`/api/produtos/${produtoParaApagarId}`, {
            method: 'DELETE'
        });

        if (resposta.ok) {
            fecharModalExcluir();
            if(typeof mostrarToast === 'function') mostrarToast("Produto excluído do banco de dados!");
            carregarSetorAdmin(setorAdminAtual); 
        } else {
            alert("Falha ao excluir produto.");
        }
    } catch (erro) {
        alert("Erro de conexão ao excluir.");
    }
}

// =======================================================
// MODAL E UPLOAD DE IMAGENS EM BASE64
// =======================================================
function gerenciarUploadImagens(input) {
    const arquivos = Array.from(input.files);

    arquivos.forEach(arquivo => {
        const urlObj = URL.createObjectURL(arquivo);
        imagensTemporarias.push({ url: urlObj, file: arquivo });
        renderizarPreviews();
    });
    // Removido input.value = "" para evitar perda de referencia do arquivo em alguns navegadores
}

function renderizarPreviews() {
    const grid = document.getElementById('grid-previsualizacao');
    if (!grid) return; // Segurança
    
    grid.innerHTML = "";

    if (imagensTemporarias.length === 0) {
        grid.innerHTML = '<p class="msg-vazia" style="color: #A89F98; font-size: 0.9rem; margin: 0;">Nenhuma foto selecionada</p>';
        return;
    }

    imagensTemporarias.forEach((obj, index) => {
        const div = document.createElement('div');
        div.className = 'foto-preview';
        div.style.position = 'relative'; // Garante o posicionamento do botão X
        
        div.innerHTML = `
            <img src="${obj.url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;">
            <button type="button" 
                    class="btn-remover-foto" 
                    onclick="removerFotoTemporaria(${index})"
                    style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">
                ×
            </button>
        `;
        grid.appendChild(div);
    });
}

function removerFotoTemporaria(index) {
    const removida = imagensTemporarias.splice(index, 1)[0];
    if (removida && !removida.file) {
        imagensRemovidas = true;
    }
    renderizarPreviews();
}

function abrirModalProduto() {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = ""; 
    document.getElementById('modal-titulo').innerText = "Adicionar Novo Produto";
    document.getElementById('prod-setor').value = setorAdminAtual; 
    
    imagensTemporarias = [];
    imagensRemovidas = false;
    renderizarPreviews();

    document.getElementById('modal-produto').style.display = 'flex';
}

function abrirModalEditar(jsonProdutoCodificado) {
    const prod = JSON.parse(decodeURIComponent(jsonProdutoCodificado));
    
    document.getElementById('modal-titulo').innerText = "Editar Produto";
    document.getElementById('prod-id').value = prod.codigo_produto; // Guarda o ID para o Update
    
    document.getElementById('prod-setor').value = prod.nome_setor || setorAdminAtual;
    document.getElementById('prod-categoria').value = prod.categoria || "padaria";
    document.getElementById('prod-titulo').value = prod.nome;
    
    // Reconstrói o preço visual (ex: 15,90 / Kg)
    const precoFormatado = parseFloat(prod.valor).toFixed(2).replace('.', ',');
    document.getElementById('prod-preco').value = precoFormatado;
    
    if (prod.preco_oferta) {
        const ofertaFormatada = parseFloat(prod.preco_oferta).toFixed(2).replace('.', ',');
        document.getElementById('prod-oferta').value = ofertaFormatada;
    } else {
        document.getElementById('prod-oferta').value = "";
    }

    if (prod.preco_custo) {
        document.getElementById('prod-custo').value = parseFloat(prod.preco_custo).toFixed(2).replace('.', ',');
    } else {
        document.getElementById('prod-custo').value = "";
    }
    
    document.getElementById('prod-marca').value = prod.marca || "";

    // Marca a caixinha de unidade correta
    if (prod.unidade_medida) {
        document.getElementById('prod-unidade').value = prod.unidade_medida;
    } else {
        document.getElementById('prod-unidade').value = "Un"; // Padrão
    }

    document.getElementById('prod-estoque').value = prod.quantidade_estoque;
    document.getElementById('prod-tag-retiravel').checked = prod.is_retiravel === 1;

    // Carrega a imagem do banco para o array temporário
    imagensTemporarias = [];
    imagensRemovidas = false;
    if (prod.imagem_url) {
        imagensTemporarias.push({ url: prod.imagem_url, file: null });
    }
    renderizarPreviews();

    document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModalProduto() {
    document.getElementById('modal-produto').style.display = 'none';
}

// =======================================================
// SALVAR NO BANCO (CREATE / UPDATE)
// =======================================================
async function salvarProduto() {
    const id = document.getElementById('prod-id').value; 
    const setor = document.getElementById('prod-setor').value;
    const titulo = document.getElementById('prod-titulo').value;
    const precoBruto = document.getElementById('prod-preco').value;
    const ofertaBruta = document.getElementById('prod-oferta').value;
    const unidadeMedida = document.getElementById('prod-unidade').value;
    const categoria = document.getElementById('prod-categoria').value;
    const estoqueDigitado = parseInt(document.getElementById('prod-estoque').value) || 0;
    const isRetiravel = document.getElementById('prod-tag-retiravel').checked ? 1 : 0;
    const marca = document.getElementById('prod-marca').value.trim();
    const custoBruto = document.getElementById('prod-custo').value;

    if(!titulo || !precoBruto) {
        alert("Preencha o Título e o Preço Principal!");
        return;
    }

    const valorDecimal = parseFloat(precoBruto.replace(',', '.').trim());
    let precoOfertaDecimal = ofertaBruta ? parseFloat(ofertaBruta.replace(',', '.').trim()) : null;
    let precoCustoDecimal = custoBruto ? parseFloat(custoBruto.replace(',', '.').trim()) : null;

    const formData = new FormData();
    formData.append('setor', setor);
    formData.append('nome', titulo);
    formData.append('valor', valorDecimal);
    if(precoOfertaDecimal !== null) formData.append('preco_oferta', precoOfertaDecimal);
    formData.append('quantidade_estoque', estoqueDigitado);
    formData.append('is_retiravel', isRetiravel);
    formData.append('unidade_medida', unidadeMedida);
    formData.append('categoria', categoria);
    formData.append('marca', marca);
    if(precoCustoDecimal !== null) formData.append('preco_custo', precoCustoDecimal);
    formData.append('remove_imagens', imagensRemovidas);

    imagensTemporarias.forEach(obj => {
        if (obj.file) {
            formData.append('imagens', obj.file);
        }
    });

    try {
        const url = id ? `/api/produtos/${id}` : '/api/produtos';
        const metodo = id ? 'PUT' : 'POST';

        const resposta = await fetch(url, {
            method: metodo,
            body: formData
        });

        if (resposta.ok) {
            fecharModalProduto();
            if(typeof mostrarToast === 'function') mostrarToast("Produto salvo com sucesso!");
            carregarSetorAdmin(setor); 
        } else {
            const erro = await resposta.json();
            alert("Erro ao salvar: " + erro.erro);
        }
    } catch (erro) {
        alert("Erro de conexão ao salvar produto.");
    }
}

// =======================================================
// O RESTANTE DO CÓDIGO (Busca, Vendas e Pedidos) FICA INTACTO
// =======================================================

function filtrarTelaAdmin() {
    const termo = document.getElementById('busca-admin').value.toLowerCase().trim();

    if (setorAdminAtual === 'clientes') {
        const cardsClientes = document.querySelectorAll('.card-cliente-admin');
        cardsClientes.forEach(card => {
            const textoCard = card.innerText.toLowerCase();
            card.style.display = textoCard.includes(termo) ? 'flex' : 'none';
        });
    } else if (setorAdminAtual === 'pedidos') {
        const statusFiltro = document.getElementById('filtro-status-admin').value;
        const cardsPedidos = document.querySelectorAll('.card-pedido-admin');
        
        cardsPedidos.forEach(card => {
            const textoCard = card.innerText.toLowerCase(); // Busca por ID, nome do cliente, etc.
            const statusDoCard = card.querySelector('select').value; 
            
            const atendeBusca = textoCard.includes(termo);
            const atendeStatus = (statusFiltro === 'todos' || statusDoCard === statusFiltro);
            
            card.style.display = (atendeBusca && atendeStatus) ? 'flex' : 'none';
        });
    } else if (setorAdminAtual !== 'vendas') {
        // Se for produtos (Padaria, Açougue...)
        const cardsProdutos = document.querySelectorAll('.card-admin');
        cardsProdutos.forEach(card => {
            const titulo = card.querySelector('h3').innerText.toLowerCase();
            card.style.display = titulo.includes(termo) ? 'flex' : 'none';
        });
    }
}

/// =======================================================
// MOSTRAR PEDIDOS (Buscando dinamicamente do MySQL)
// =======================================================
async function mostrarPedidosNoAdmin() {
    const grid = document.getElementById('grid-admin-produtos');
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando pedidos do sistema...</p>';
    
    let pedidos = [];
    try {
        const resposta = await fetch('/api/pedidos');
        pedidos = await resposta.json();
    } catch (erro) {
        grid.innerHTML = '<p class="msg-vazia" style="grid-column: 1 / -1; text-align: center; color: red;">Erro ao conectar com o banco de dados.</p>';
        return;
    }
    
    if (pedidos.length === 0) {
        grid.innerHTML = '<p class="msg-vazia" style="grid-column: 1 / -1; text-align: center; font-size: 1.2rem;">Nenhum pedido recebido ainda.</p>';
        return;
    }

    // ==========================================
    // MUDANÇA AQUI: Inserindo o botão no topo do Grid
    // ==========================================
    grid.innerHTML = ``;

    const corPorStatus = {
        'Pendente':    '#C8973D',
        'Em produção': '#4A7C59',
        'Finalizado':  '#28a745',
        'Cancelado':   '#D9534F'
    };
    
    pedidos.forEach((pedido) => {
        const corHeader = corPorStatus[pedido.status] || '#C8973D';
        const totalFormatado = parseFloat(pedido.valorTotal).toFixed(2).replace('.', ',');
        
        const isCancelado = pedido.status === 'Cancelado';
        const isFinalizado = pedido.status === 'Finalizado';
        const isTrancado = isCancelado || isFinalizado;

        const itensHTML = pedido.itens.map(item =>
            `<li><span>${item.nome}</span><strong>${item.quantidade}x</strong></li>`
        ).join('');

        grid.innerHTML += `
            <div class="card-pedido-admin">
                <div class="pedido-header" style="background: ${corHeader};">
                    <h3>Pedido #${pedido.id}</h3>
                    <span class="data">${pedido.status}</span>
                </div>

                <div class="pedido-body">
                    <div class="pedido-cliente">
                        <div class="icone-user">👤</div>
                        <div>
                            <h5>${pedido.cliente}</h5>
                            <span style="font-size:0.8rem; color:var(--cafe-claro); display:block; margin-bottom:3px;">📄 CPF: ${pedido.cpf}</span>
                            <span style="font-size:0.8rem; color:var(--cafe-claro);">📅 Retirada: ${pedido.dataRetirada} às ${pedido.horaRetirada}</span>
                        </div>
                    </div>

                    <ul class="pedido-itens">${itensHTML}</ul>

                    <div class="pedido-total">
                        R$ ${totalFormatado}
                        <span style="font-size:0.85rem; font-weight:700; color:var(--cafe-claro); display:block; margin-top:4px;">💳 ${pedido.pagamento}</span>
                    </div>
                </div>

                <div class="pedido-footer">
                    <label>Alterar Status</label>
                    <div style="display:flex; gap:10px;">
                        <select onchange="alterarStatusPedidoBanco('${pedido.id}', this.value)" ${isTrancado ? 'disabled' : ''}>
                            <option value="Pendente"    ${pedido.status === 'Pendente'    ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="Em produção" ${pedido.status === 'Em produção' ? 'selected' : ''}>👨‍🍳 Em produção</option>
                            <option value="Finalizado"  ${pedido.status === 'Finalizado'  ? 'selected' : ''}>✅ Finalizado</option>
                            ${isCancelado ? `<option value="Cancelado" selected>🚫 Cancelado</option>` : ''}
                        </select>
                        
                        ${!isTrancado ? 
                            `<button class="btn-cancelar-pedido" onclick="abrirModalCancelamentoAdminBanco('${pedido.id}')" title="Cancelar pedido">🚫</button>` : ''
                        }
                    </div>
                    ${isCancelado && pedido.justificativa ? `<p class="justificativa-cancelamento" style="margin-top:10px; font-size:0.85rem; color:#D9534F;">Motivo: ${pedido.justificativa}</p>` : ''}
                </div>
            </div>
        `;
    });
}
// =======================================================
// ENVIAR MUDANÇA DE STATUS SIMPLES PARA O BANCO
// =======================================================
async function alterarStatusPedidoBanco(idPedido, novoStatus) {
    try {
        const resposta = await fetch(`/api/pedidos/${idPedido}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });

        if (resposta.ok) {
            if(typeof mostrarToast === 'function') mostrarToast(`Status atualizado para: ${novoStatus}`);
            mostrarPedidosNoAdmin();
        }
    } catch (erro) {
        alert("Erro ao atualizar status do pedido.");
    }
}

// =======================================================
// CANCELAMENTO VIA MODAL COM SALVAMENTO DE JUSTIFICATIVA
// =======================================================
let idPedidoCancelamentoAtual = null;

function abrirModalCancelamentoAdminBanco(idPedido) {
    idPedidoCancelamentoAtual = idPedido;
    const modal = document.getElementById('modal-justificativa-admin');
    if(modal) modal.style.display = 'flex';
}

// ---> FUNÇÃO QUE ESTAVA FALTANDO PARA FECHAR O MODAL <---
function fecharModalJustificativa() {
    const modal = document.getElementById('modal-justificativa-admin');
    if(modal) modal.style.display = 'none';
}

async function confirmarCancelamentoAdmin() {
    if(idPedidoCancelamentoAtual === null) return;
    
    // Captura o select de justificativa (verifique se o ID no seu HTML é esse mesmo)
    const elementoJustificativa = document.getElementById('select-justificativa-admin');
    const justificativa = elementoJustificativa ? elementoJustificativa.value : 'Cancelado pelo administrador';
    
    try {
        const resposta = await fetch(`/api/pedidos/${idPedidoCancelamentoAtual}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelado', justificativa: justificativa })
        });

        if (resposta.ok) {
            fecharModalJustificativa(); // Agora a função existe e o código não vai quebrar aqui!
            
            if(typeof mostrarToast === 'function') {
                mostrarToast("Pedido cancelado e salvo no banco!");
            } else {
                alert("Pedido cancelado e salvo no banco!");
            }
            
            idPedidoCancelamentoAtual = null;
            mostrarPedidosNoAdmin(); // Recarrega os pedidos dinamicamente na tela
        } else {
            const erroApi = await resposta.json();
            alert("Falha relatada pelo servidor: " + (erroApi.erro || 'Erro desconhecido'));
        }
    } catch (erro) {
        // Se falhar no futuro, aperte F12 e olhe o console para ver a causa exata!
        console.error("Erro interno no JavaScript ou na conexão:", erro);
        alert("Erro ao submeter cancelamento. Verifique o console (F12).");
    }
}

async function mostrarVendasNoAdmin() {
    const grid = document.getElementById('grid-admin-produtos');
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Calculando estatísticas no servidor...</p>';
    
    try {
        const resposta = await fetch('/api/pedidos');
        const pedidos = await resposta.json();
        
        const finalizados  = pedidos.filter(p => p.status === 'Finalizado');
        const emProducao   = pedidos.filter(p => p.status === 'Em produção');
        const cancelados   = pedidos.filter(p => p.status === 'Cancelado');
        const pendentes    = pedidos.filter(p => p.status === 'Pendente');
        
        // A Arrecadação agora engloba os que estão Prontos (Finalizados) e os que estão sendo feitos (Em Produção)
        const totalArrecadado = finalizados.reduce((acc, p) => acc + p.valorTotal, 0) + 
                                emProducao.reduce((acc, p) => acc + p.valorTotal, 0);

        // Ranking de produtos leva em conta Finalizados + Em produção
        const contagemItens = {};
        [...finalizados, ...emProducao].forEach(p => {
            p.itens.forEach(item => {
                contagemItens[item.nome] = (contagemItens[item.nome] || 0) + item.quantidade;
            });
        });
        const ranking = Object.entries(contagemItens)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const rankingHTML = ranking.length > 0
            ? ranking.map(([nome, qtd], i) => `
                <tr>
                    <td class="item-nome">${['🥇','🥈','🥉','4º','5º'][i]} ${nome}</td>
                    <td class="item-qtd">${qtd} un.</td>
                </tr>`).join('')
            : `<tr><td colspan="2" style="color:var(--cafe-claro); text-align:center; padding:20px 0;">Nenhuma venda confirmada ainda.</td></tr>`;

        grid.innerHTML = `
            <div class="dashboard-vendas" style="grid-column: 1 / -1;">
                <div class="metric-card">
                    <h4>💰 Estimativa de Receita</h4>
                    <span class="valor">R$ ${totalArrecadado.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="metric-card">
                    <h4>✅ Pedidos Entregues</h4>
                    <span class="valor">${finalizados.length}</span>
                </div>
                <div class="metric-card">
                    <h4>👨‍🍳 Em Produção</h4>
                    <span class="valor">${emProducao.length}</span>
                </div>
                <div class="metric-card">
                    <h4>⏳ Pendentes</h4>
                    <span class="valor">${pendentes.length}</span>
                </div>
                <div class="metric-card">
                    <h4>🚫 Cancelados</h4>
                    <span class="valor">${cancelados.length}</span>
                </div>
                <div class="metric-card" style="grid-column: span 2;">
                    <h4>🏆 Produtos Mais Vendidos (Em Produção + Finalizados)</h4>
                    <table class="ranking-tabela">
                        <tbody>${rankingHTML}</tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (erro) {
        grid.innerHTML = '<p class="msg-vazia" style="color: red; grid-column: 1 / -1; text-align: center;">Erro ao conectar com o banco de dados das vendas.</p>';
    }
}



// =======================================================
// LÓGICA DE CLIENTES NO PAINEL ADMIN
// =======================================================
async function mostrarClientesNoAdmin() {
    const grid = document.getElementById('grid-admin-produtos');
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando clientes do sistema...</p>';
    
    try {
        const resposta = await fetch('/api/clientes');
        const clientes = await resposta.json();
        
        if (clientes.length === 0) {
            grid.innerHTML = '<p class="msg-vazia" style="grid-column: 1 / -1; text-align: center;">Nenhum cliente cadastrado.</p>';
            return;
        }

        grid.innerHTML = '';
        clientes.forEach(cliente => {
            grid.innerHTML += `
                <div class="card-cliente-admin" style="background: white; border: 1.5px solid #D4C5A9; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
                        <div style="font-size: 2.5rem;">👤</div>
                        <div>
                            <h3 style="margin: 0; color: #4A3B32; font-size: 1.2rem;">${cliente.nome}</h3>
                            <p style="margin: 0; font-size: 0.85rem; color: #7A6A5A; margin-top: 4px;">📄 CPF: ${cliente.cpf}</p>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: #4A3B32; flex-grow: 1;">
                        <p style="margin: 5px 0;">📧 <strong>E-mail:</strong> ${cliente.email}</p>
                        <p style="margin: 5px 0;">📞 <strong>Tel:</strong> ${cliente.telefone || 'Não informado'}</p>
                    </div>
                    <button onclick="abrirModalPedidosCliente('${cliente.email}', '${cliente.nome}')" style="background: #C8973D; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; width: 100%;">Ver Histórico de Pedidos</button>
                </div>
            `;
        });
    } catch (erro) {
        grid.innerHTML = '<p class="msg-vazia" style="color:red; text-align:center; grid-column: 1 / -1;">Erro ao buscar lista de clientes.</p>';
    }
}

async function abrirModalPedidosCliente(email, nome) {
    const modal = document.getElementById('modal-pedidos-cliente');
    const container = document.getElementById('lista-pedidos-cliente-modal');
    document.getElementById('titulo-modal-pedidos-cliente').innerText = `Histórico de: ${nome}`;
    
    container.innerHTML = '<p style="text-align:center; color: #C8973D;">Buscando histórico de pedidos...</p>';
    modal.style.display = 'flex';
    
    try {
        // Usa a rota já existente que puxa dados pelo E-mail!
        const resposta = await fetch(`/api/pedidos/cliente/${email}`);
        const pedidos = await resposta.json();
        
        if (pedidos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#A89F98; padding: 20px;">Este cliente não possui nenhum pedido.</p>';
            return;
        }
        
        container.innerHTML = '';
        pedidos.forEach(pedido => {
            const corPorStatus = {
                'Pendente':    '#C8973D',
                'Em produção': '#4A7C59',
                'Finalizado':  '#28a745',
                'Cancelado':   '#D9534F'
            };
            const cor = corPorStatus[pedido.status] || '#A89F98';
            const itensHTML = pedido.itens.map(item => `<li>${item.quantidade}x ${item.nome}</li>`).join('');
            
            container.innerHTML += `
                <div style="border-left: 6px solid ${cor}; padding: 15px; margin-bottom: 15px; background: #FFF8EC; border-radius: 8px; border-right: 1px solid #EEDFCE; border-top: 1px solid #EEDFCE; border-bottom: 1px solid #EEDFCE;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin:0; color: #4A3B32;">Pedido #${pedido.id}</h4>
                        <span style="background:${cor}; color:white; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; font-weight:bold;">${pedido.status}</span>
                    </div>
                    <p style="font-size: 0.85rem; color: #7A6A5A; margin:0 0 10px 0;">Feito em: ${pedido.dataPedido} | Retirada: ${pedido.dataRetirada} às ${pedido.horaRetirada}</p>
                    <ul style="margin: 0 0 12px 20px; font-size: 0.95rem; color: #4A3B32;">${itensHTML}</ul>
                    <div style="display: flex; justify-content: space-between; font-weight: 800; color: #4A3B32; border-top: 1px dashed #D4C5A9; padding-top: 10px;">
                        <span>Pagamento: ${pedido.pagamento}</span>
                        <span>R$ ${pedido.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                </div>
            `;
        });
        
    } catch (erro) {
        container.innerHTML = '<p style="text-align:center; color:red; padding: 20px;">Erro ao conectar com o banco de dados.</p>';
    }
}

function fecharModalPedidosCliente() {
    document.getElementById('modal-pedidos-cliente').style.display = 'none';
}

// =======================================================
// LIMPEZA GLOBAL DE PEDIDOS (ADMIN)
// =======================================================
async function limparPedidosGlobaisConcluidos() {
    // Alerta redobrado porque apaga para todos os clientes
    if (!confirm("⚠️ ATENÇÃO ADMIN: Tem certeza que deseja apagar TODOS os pedidos Finalizados e Cancelados de TODOS os clientes? Esta ação afeta o banco de dados geral e não pode ser desfeita.")) {
        return;
    }

    try {
        const resposta = await fetch('/api/admin/pedidos/concluidos', { 
            method: 'DELETE' 
        });
        
        if (resposta.ok) {
            if(typeof mostrarToast === 'function') mostrarToast("Limpeza global concluída com sucesso!");
            mostrarPedidosNoAdmin(); // Recarrega a tela na mesma hora
        } else {
            alert("Erro ao executar a limpeza global.");
        }
    } catch (erro) {
        alert("Erro de conexão ao tentar limpar pedidos globais.");
    }
}
