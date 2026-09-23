// =======================================================
// BUSCA DOS DADOS NO BACKEND (API MySQL)
// =======================================================
async function carregarProdutosDoBanco() {
    try {
        const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000';
        const resposta = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await resposta.json();
        return produtos;
    } catch (erro) {
        console.error("Erro ao carregar produtos da Landing Page:", erro);
        return [];
    }
}

// =======================================================
// CRIAÇÃO DO HTML DO CARD (Adaptado para o MySQL)
// =======================================================
function criarCardHTML(produto, idCarrossel) {
    const nomeSetor = produto.nome_setor ? produto.nome_setor.charAt(0).toUpperCase() + produto.nome_setor.slice(1) : 'Sem Setor';

    // Formatação de preços (trocando o ponto do banco pela vírgula)
    const precoFormatado = parseFloat(produto.valor).toFixed(2).replace('.', ',');
    const unidade = produto.unidade_medida ? ` / ${produto.unidade_medida}` : "";

    let precoPrincipal = precoFormatado + unidade;
    let precoSecundario = "";

    // Se houver preço de oferta no banco, ele vira o principal
    if (produto.preco_oferta) {
        const ofertaFormatada = parseFloat(produto.preco_oferta).toFixed(2).replace('.', ',');
        precoPrincipal = ofertaFormatada + unidade;
        precoSecundario = `<p id="texto-info" style="text-decoration: line-through;">R$ ${precoFormatado}${unidade}</p>`;
    }

    // A imagem agora vem da pasta uploads do servidor
    let imagemSrc = produto.imagem_url || "./Imagens/Logo.png";

    let botaoHTML = "";
    // O banco retorna 1 para true em campos booleanos.
    if (produto.is_retiravel === 1 && idCarrossel === "carrossel-peça-e-retire") {
        botaoHTML = `<a href="pagina-agendamento.html?id=${produto.codigo_produto}" class="botao-comprar" style="text-decoration: none;" aria-label="Agendar ${produto.nome} para retirada">Adicionar</a>`;
    }

    const marcaTexto = (produto.marca && produto.marca.trim() !== "") ? produto.marca : "Fabricação Própria";
    const tagMarcaHTML = `<p style="font-size: 0.75rem; color: #A89F98; margin: 0 0 2px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${marcaTexto}</p>`;

    return `
        <article class="card-produtos">
            <img src="${imagemSrc}" alt="Foto de ${produto.nome}" loading="lazy">
            ${tagMarcaHTML}
            <h4>${produto.nome}</h4>
            <h5>${nomeSetor}</h5>
            <p class="texto-preco">R$ ${precoPrincipal}</p>
            ${precoSecundario}
            ${botaoHTML}
        </article>
    `;
}

// =======================================================
// INJETA NO CARROSSEL
// =======================================================
function popularCarrossel(idCarrossel, produtosFiltrados) {
    const container = document.querySelector(`#${idCarrossel} .carrossel-conjunto`);
    if (!container) return; 
    
    container.innerHTML = ""; 
    if(produtosFiltrados.length === 0) {
        container.innerHTML = `<p style="padding: 20px; color: #666;">Nenhum produto disponível.</p>`;
        return;
    }

    // Agora iteramos diretamente sobre os objetos do banco
    produtosFiltrados.forEach(produto => {
        container.innerHTML += criarCardHTML(produto, idCarrossel);
    });
}

// =======================================================
// EXECUÇÃO PRINCIPAL
// =======================================================
async function carregarLandingPage() {
    try {
        // 1. Busca os dados da API
        const todosProdutos = await carregarProdutosDoBanco();
        
        if (!Array.isArray(todosProdutos) || todosProdutos.length === 0) {
            console.warn("O banco de dados não retornou uma lista válida de produtos.");
            return;
        }

        // 2. Distribui os produtos nas "prateleiras" baseadas nas colunas do MySQL
        popularCarrossel("carrossel-peça-e-retire", todosProdutos.filter(p => p.is_retiravel === 1));
        popularCarrossel("carrossel-ofertas", todosProdutos.filter(p => p.preco_oferta !== null));
        popularCarrossel("carrossel-padaria", todosProdutos.filter(p => p.nome_setor === "padaria"));
        popularCarrossel("carrossel-açougue", todosProdutos.filter(p => p.nome_setor === "acougue"));
        popularCarrossel("carrossel-hortifruti", todosProdutos.filter(p => p.nome_setor === "hortifruti"));
        
        // Ajuste: Produtos de mercearia
        popularCarrossel("carrossel-mercearia", todosProdutos.filter(p => p.nome_setor === "mercearia"));

    } catch (erro) {
        console.error("Erro na Landing Page:", erro);
    }
}

// Inicia o processo quando a página terminar de carregar o HTML
document.addEventListener("DOMContentLoaded", carregarLandingPage);
