// =======================================================
// CAPTURA DE PARÂMETROS DA URL
// =======================================================
const urlParams = new URLSearchParams(window.location.search);
const setorDaUrl = urlParams.get("setor");
const filtroDaUrl = urlParams.get("filtro");

// =======================================================
// ELEMENTOS DO DOM E VARIÁVEIS GLOBAIS
// =======================================================
const containerProdutos = document.getElementById("container-produtos");
const tituloSetor = document.getElementById("titulo-setor");
const barraBusca = document.getElementById("barra-busca");
const botoesFiltro = document.querySelectorAll(".btn-filtro");

let categoriaAtual = "todos";

// AGORA É UM ARRAY VAZIO QUE SERÁ PREENCHIDO PELO BANCO DE DADOS
let listaCompleta = []; 

function removerAcentos(texto) {
    if (!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function nomeCategoria(categoria) {
    const nomes = {
        todos: "CATÁLOGO COMPLETO",
        padaria: "PADARIA",
        acougue: "AÇOUGUE",
        hortifruti: "HORTIFRUTI",
        mercado: "MERCADO",
        frios: "FRIOS",
        oferta: "🔥EM OFERTA",
        retiravel: "🛒 PEÇA E RETIRE", 
        limpeza: "LIMPEZA",
        mercearia: "MERCEARIA",
        laticinios: "LATICÍNIOS",
        bebidas: "BEBIDAS",
    };
    return nomes[categoria] || categoria.toUpperCase();
}

// =======================================================
// BUSCA DOS DADOS NO BACKEND (NOVO!)
// =======================================================
async function carregarProdutosDoBanco() {
    try {
        // Pede os dados para a sua API Node.js (vamos criar essa rota no backend no próximo passo)
        const resposta = await fetch('/api/produtos');
        
        // Converte a resposta do banco para um Array de Objetos (JSON)
        listaCompleta = await resposta.json(); 
        
        // Depois de salvar os dados na variável global, aplica os filtros para renderizar a tela
        aplicarFiltros(); 
    } catch (erro) {
        console.error("Erro ao carregar produtos do banco:", erro);
        containerProdutos.innerHTML = `<p style="padding: 20px; color: red; font-weight: bold;">Erro ao carregar o catálogo. O servidor está rodando?</p>`;
    }
}

// =======================================================
// RENDERIZAÇÃO DO HTML
// =======================================================
function renderizarProdutos(lista) {
    containerProdutos.innerHTML = "";
    
    if (lista.length === 0) {
        containerProdutos.innerHTML = `<p style="padding: 20px; color: #666; font-weight: bold;">Nenhum produto encontrado.</p>`;
        return;
    }

    // Agora iteramos diretamente sobre o objeto produto (sem o [id, produto] antigo)
    lista.forEach(produto => {
        // Formata os preços substituindo o ponto do banco pela vírgula do padrão brasileiro
        const precoFormatado = parseFloat(produto.valor).toFixed(2).replace('.', ',');
        const unidade = produto.unidade_medida ? ` / ${produto.unidade_medida}` : "";
        
        let precoHTML = "";
        if (produto.preco_oferta) {
            const ofertaFormatada = parseFloat(produto.preco_oferta).toFixed(2).replace('.', ',');
            precoHTML = `
                <div class="card-precos">
                    <p class="preco-normal">R$ ${ofertaFormatada}${unidade}</p>
                    <p class="preco-antigo">R$ ${precoFormatado}${unidade}</p>
                </div>`;
        } else {
            precoHTML = `<div class="card-precos"><p class="preco-normal">R$ ${precoFormatado}${unidade}</p></div>`;
        }

        // Lógica de Imagem (Agora usamos a string Base64 que veio do banco)
        let imagemSrc = produto.imagem_base64 || "./Imagens/Logo.png";

        // Booleanos vindos do MySQL são lidos como 1 (true) ou 0 (false)
        const ehRetiravel = produto.is_retiravel === 1;

        let cardInternoHTML = "";
        let botaoHTML = "";

        if (ehRetiravel) {
            cardInternoHTML = `
                <a href="pagina-agendamento.html?id=${produto.codigo_produto}" class="card-produto" aria-label="Ver detalhes de ${produto.nome}">
                    <img src="${imagemSrc}" alt="Foto de ${produto.nome}" loading="lazy">
                    <h3>${produto.nome}</h3>
                </a>`;
            botaoHTML = `<a href="pagina-agendamento.html?id=${produto.codigo_produto}" class="btn-agendar" aria-label="Agendar ${produto.nome} para retirada">Adicionar</a>`;
        } else {
            cardInternoHTML = `
                <div class="card-produto card-visualizavel">
                    <img src="${imagemSrc}" alt="Foto de ${produto.nome}" loading="lazy">
                    <h3>${produto.nome}</h3>
                </div>`;
            botaoHTML = `<span class="btn-indisponivel" aria-label="${produto.nome} disponível apenas na loja física">Disponível na loja</span>`;
        }

        containerProdutos.innerHTML += `
            <div class="card-container">
                ${cardInternoHTML}
                ${precoHTML}
                ${botaoHTML}
            </div>
        `;
    });
}

// =======================================================
// LÓGICA DE FILTRO
// =======================================================
function aplicarFiltros() {
    const termoBusca = removerAcentos(barraBusca.value.toLowerCase().trim());

    const produtosFiltrados = listaCompleta.filter(produto => {
        const nomeProduto = removerAcentos(produto.nome.toLowerCase());
        const passouNaBusca = nomeProduto.includes(termoBusca);

        let passouNaCategoria = false;
        
        if (categoriaAtual === "todos") {
            passouNaCategoria = true;
        } else if (categoriaAtual === "oferta") {
            // Filtra quem tem preço de oferta no banco
            passouNaCategoria = produto.preco_oferta !== null;
        } else if (categoriaAtual === "retiravel") {
            // Filtra pela coluna booleana do MySQL
            passouNaCategoria = produto.is_retiravel === 1;
        } else {
            // Filtra pelo nome_setor (da tabela setor) ou pela categoria do produto
            passouNaCategoria = (produto.nome_setor === categoriaAtual || produto.categoria === categoriaAtual);
        }
        
        return passouNaBusca && passouNaCategoria;
    });

    tituloSetor.innerText = nomeCategoria(categoriaAtual);
    renderizarProdutos(produtosFiltrados);
}

function selecionarCategoria(categoria) {
    categoriaAtual = categoria;
    botoesFiltro.forEach(botao => {
        botao.classList.toggle("ativo", botao.dataset.categoria === categoriaAtual);
    });
    aplicarFiltros();
}

botoesFiltro.forEach(botao => {
    botao.addEventListener("click", () => {
        selecionarCategoria(botao.dataset.categoria);
    });
});

if(barraBusca) {
    barraBusca.addEventListener("input", aplicarFiltros);
}

// =======================================================
// INICIALIZAÇÃO DA PÁGINA
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    const filtroParametro = setorDaUrl || filtroDaUrl;

    if (filtroParametro) {
        categoriaAtual = filtroParametro.toLowerCase();
    } else {
        categoriaAtual = "todos";
    }

    botoesFiltro.forEach(botao => {
        botao.classList.toggle("ativo", botao.dataset.categoria === categoriaAtual);
    });

    // Em vez de chamar os filtros direto, agora nós chamamos a API primeiro!
    carregarProdutosDoBanco();
});
