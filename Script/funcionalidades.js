/* =========================================
   1. MODO ESCURO (Noturno Gourmet)
========================================= */
function alternarTema() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const botaoTema = document.getElementById('btn-tema');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('tema', 'escuro');
        botaoTema.innerText = '☀️';
        mostrarToast('Modo escuro ativado!');
    } else {
        localStorage.setItem('tema', 'claro');
        botaoTema.innerText = '🌙';
        mostrarToast('Modo claro ativado!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'escuro') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-tema').innerText = '☀️';
    }
    atualizarInterfaceCarrinho(); 
});


/* =========================================
   2. BUSCA DINÂMICA
========================================= */
function pesquisarProdutos() {
    const input = document.getElementById('input-busca').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.card-produtos');

    cards.forEach(card => {
        const tituloProduto = card.querySelector('h4').innerText.toLowerCase();
        if (tituloProduto.includes(input)) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none';
        }
    });
}


/* =========================================
   3. NOTIFICAÇÕES (Toast)
========================================= */
function mostrarToast(mensagem) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerText = mensagem;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('mostrar'), 100);

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}


/* =========================================
   4. CARRINHO COM TRAVA DE SEGURANÇA
========================================= */

function atualizarInterfaceCarrinho() {
    const estaLogado = localStorage.getItem('usuarioLogado');
    const lista = document.getElementById('lista-carrinho');
    const contador = document.getElementById('contador-carrinho');
    const totalElemento = document.getElementById('total-carrinho');

    if (!lista || !contador) return;

    // SE NÃO ESTIVER LOGADO: Limpa a interface e não mostra nada
    if (!estaLogado) {
        lista.innerHTML = '<p style="text-align:center; padding:20px;">Faça login para ver seu carrinho.</p>';
        contador.innerText = '0';
        if (totalElemento) totalElemento.innerText = '0,00';
        return;
    }

    // SE ESTIVER LOGADO: Busca os itens no banco local
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    lista.innerHTML = ''; 
    let totalDinheiro = 0;
    let totalItens = 0;

    carrinho.forEach((item, index) => {
        const qtd = item.quantidade || 1; 
        const subtotal = item.preco * qtd;
        totalDinheiro += subtotal;
        totalItens += qtd; 
        
        const div = document.createElement('div');
        div.classList.add('item-carrinho');
        
        const infoAgendamento = item.dataRetirada 
            ? `<div style="font-size: 0.85rem; color: var(--dourado-suave); margin-top: 4px; font-weight: 800;">📅 Retirar dia: ${item.dataRetirada}</div>` 
            : '';

        div.innerHTML = `
            <div style="flex: 1;">
                <span style="font-weight: 800; display: block; font-size: 1.1rem;">${item.nome}</span>
                <span style="font-size: 0.9rem; color: #A89F98;">Qtd: ${qtd} x R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                ${infoAgendamento}
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span style="color: var(--dourado-suave); font-weight: 800; font-size: 1.2rem;">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                <button onclick="removerDoCarrinho(${index})" style="color: #A89F98; cursor: pointer; background: none; font-size: 1.2rem;">✖</button>
            </div>
        `;
        lista.appendChild(div);
    });

    contador.innerText = totalItens;
    if (totalElemento) {
        totalElemento.innerText = totalDinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }
}

/* =========================================
   5. LOGOUT (LIMPEZA TOTAL)
========================================= */
function fazerLogout() {
    // Limpa o status de login
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('emailUsuario');
    
    // LIMPA O CARRINHO (Sua solicitação!)
    localStorage.removeItem('carrinho');
    
    if (typeof mostrarToast === 'function') {
        mostrarToast('Sessão encerrada. Carrinho limpo!');
    }

    // Redireciona para a home após um breve momento
    setTimeout(() => {
        window.location.href = 'padaria-landingpage.html';
    }, 1000);
}

// Lógica para transformar o link "Login" em "Sair" dinamicamente
document.addEventListener('DOMContentLoaded', () => {
    const linkLogin = document.querySelector('a[href="padaria-login.html"]');
    if (linkLogin && localStorage.getItem('usuarioLogado')) {
        linkLogin.innerText = 'Sair';
        linkLogin.href = '#';
        linkLogin.style.color = '#ff6b6b'; // Cor de destaque para o Sair
        linkLogin.onclick = (e) => {
            e.preventDefault();
            fazerLogout();
        };
    }
    atualizarInterfaceCarrinho();
});

function removerDoCarrinho(index) {
    // Lê o banco de dados antes de remover
    carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    const itemRemovido = carrinho[index].nome;
    carrinho.splice(index, 1); 
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    atualizarInterfaceCarrinho();
    mostrarToast(`${itemRemovido} removido!`);
}

/* =========================================
   CARRINHO: ABRIR E FECHAR COM OVERLAY
========================================= */
function abrirCarrinho() {
    atualizarInterfaceCarrinho();
    const gaveta = document.getElementById('carrinho-lateral');
    const overlay = document.getElementById('carrinho-overlay');
    
    if(gaveta) gaveta.classList.add('aberto');
    if(overlay) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('mostrar'), 10);
    }
    
    // Impede o scroll da página de fundo enquanto o carrinho está aberto
    document.body.style.overflow = 'hidden';
}

function fecharCarrinho() {
    const gaveta = document.getElementById('carrinho-lateral');
    const overlay = document.getElementById('carrinho-overlay');
    
    if(gaveta) gaveta.classList.remove('aberto');
    if(overlay) {
        overlay.classList.remove('mostrar');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
    
    // Devolve o scroll para a página
    document.body.style.overflow = 'auto';
}

// Adicione isso ao final do seu funcionalidades.js
function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('emailUsuario');
    window.location.href = 'padaria-landinpage.html';
}

// Opcional: Função para verificar no header e mudar o texto de "Login" para "Sair"
document.addEventListener('DOMContentLoaded', () => {
    const linkLogin = document.querySelector('a[href="padaria-login.html"]');
    if (linkLogin && localStorage.getItem('usuarioLogado')) {
        linkLogin.innerText = 'Sair';
        linkLogin.href = '#';
        linkLogin.onclick = (e) => {
            e.preventDefault();
            fazerLogout();
        };
    }
});

/* =======================================================
   PESQUISA GLOBAL INTELIGENTE (API MySQL)
======================================================= */

// Remove acentos para a pesquisa funcionar se o cliente digitar "pao" em vez de "pão"
function removerAcentosBusca(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function pesquisarProdutos() {
    const input = document.getElementById('input-busca');
    if (!input) return; // Evita erros em páginas que não têm a barra de busca
    
    const termo = input.value.trim().toLowerCase();
    let dropdown = document.getElementById('dropdown-resultados');

    // 1. Cria a caixa do menu suspenso se ela ainda não existir no HTML
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'dropdown-resultados';
        dropdown.className = 'busca-dropdown';
        input.parentNode.appendChild(dropdown);
    }

    // 2. Se o cliente apagar o texto ou digitar menos de 2 letras, esconde a caixa
    if (termo.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    try {
        // 3. Puxa os produtos do nosso backend Node.js
        const resposta = await fetch('/api/produtos');
        const todosOsProdutos = await resposta.json();

        // 4. Filtra os produtos com base no que foi digitado
        const termoLimpo = removerAcentosBusca(termo);
        const resultados = todosOsProdutos.filter(prod => {
            if (!prod.nome) return false;
            const tituloLimpo = removerAcentosBusca(prod.nome.toLowerCase());
            return tituloLimpo.includes(termoLimpo);
        });

        // 5. Desenha os resultados na tela
        dropdown.innerHTML = '';
        if (resultados.length > 0) {
            resultados.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'item-busca';
                
                // Pega a imagem em Base64 que veio do banco
                let imagemSrc = prod.imagem_base64 || "./Imagens/Logo.png";

                // Verifica se o produto é retirável no banco de dados (MySQL retorna 1 para true)
                const podeAgendar = prod.is_retiravel === 1;
                const tagVisual = podeAgendar 
                    ? '<span class="tag-agendavel">📅 Disponível para Agendamento</span>' 
                    : '<span class="tag-loja">🛒 Apenas Loja Física</span>';

                div.innerHTML = `
                    <img src="${imagemSrc}" alt="${prod.nome}">
                    <div class="item-busca-info">
                        <h4>${prod.nome}</h4>
                        ${tagVisual}
                    </div>
                `;

                // 6. Evento de clique usando o codigo_produto
                div.onclick = () => {
                    if (podeAgendar) {
                        window.location.href = `pagina-agendamento.html?id=${prod.codigo_produto}`;
                    } else {
                        // Se não for agendável, envia para o catálogo geral com o termo buscado
                        window.location.href = `pagina-catalogo.html?busca=${encodeURIComponent(termo)}`;
                    }
                };

                dropdown.appendChild(div);
            });
            dropdown.style.display = 'block';
        } else {
            // Se não achar nada
            dropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: #A89F98; font-weight: 700;">Nenhum produto encontrado. 😕</div>';
            dropdown.style.display = 'block';
        }

    } catch (erro) {
        console.error("Erro na busca dinâmica do header:", erro);
    }
}

// Fechar o menu suspenso ao clicar em qualquer outro lugar da tela
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('dropdown-resultados');
    const inputBusca = document.getElementById('input-busca');
    
    if (dropdown && event.target !== inputBusca && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});