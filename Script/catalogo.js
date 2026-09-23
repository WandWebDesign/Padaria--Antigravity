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
const barraBusca = document.getElementById("barra-busca");
let botoesFiltro = document.querySelectorAll(".btn-filtro");

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
        oferta: "🔥EM OFERTA",
        retiravel: "🛒 PEÇA E RETIRE"
    };
    if (nomes[categoria]) return nomes[categoria];
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

// =======================================================
// BUSCA DOS DADOS NO BACKEND (NOVO!)
// =======================================================
async function carregarProdutosDoBanco() {
    try {
        const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000';
        const resposta = await fetch(`${API_BASE}/api/produtos`);
        
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

        // Lógica de Imagem (Agora usamos a URL da imagem armazenada no servidor)
        let imagemSrc = produto.imagem_url || "./Imagens/Logo.png";

        // Booleanos vindos do MySQL são lidos como 1 (true) ou 0 (false)
        const ehRetiravel = produto.is_retiravel === 1;

        let cardInternoHTML = "";
        let botaoHTML = "";

        const marcaTexto = (produto.marca && produto.marca.trim() !== "") ? produto.marca : "Fabricação Própria";
        const tagMarcaHTML = `<p style="font-size: 0.75rem; color: #A89F98; margin: 0 0 2px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${marcaTexto}</p>`;

        if (ehRetiravel) {
            cardInternoHTML = `
                <a href="pagina-agendamento.html?id=${produto.codigo_produto}" class="card-produto" aria-label="Ver detalhes de ${produto.nome}">
                    <img src="${imagemSrc}" alt="Foto de ${produto.nome}" loading="lazy">
                    ${tagMarcaHTML}
                    <h3>${produto.nome}</h3>
                </a>`;
            botaoHTML = `<a href="pagina-agendamento.html?id=${produto.codigo_produto}" class="btn-agendar" aria-label="Agendar ${produto.nome} para retirada">Adicionar</a>`;
        } else {
            cardInternoHTML = `
                <div class="card-produto card-visualizavel">
                    <img src="${imagemSrc}" alt="Foto de ${produto.nome}" loading="lazy">
                    ${tagMarcaHTML}
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
// LÓGICA DE FILTRO DE DOIS NÍVEIS
// =======================================================
let setorAtual = "todos"; // Aba superior
// categoriaAtual já foi declarada na seção de variáveis globais

function extrairSetores() {
    const setores = new Set();
    listaCompleta.forEach(p => {
        if (p.nome_setor) setores.add(p.nome_setor.toLowerCase());
    });
    return Array.from(setores).sort();
}

function extrairCategorias() {
    const categorias = new Set();
    listaCompleta.forEach(p => {
        // Se setorAtual for diferente de "todos", só extrai categorias daquele setor
        if (setorAtual !== "todos" && setorAtual !== "oferta" && setorAtual !== "retiravel") {
            if (!p.nome_setor || p.nome_setor.toLowerCase() !== setorAtual) return;
        }
        
        if (p.categoria) categorias.add(p.categoria.toLowerCase());
    });
    return Array.from(categorias).sort();
}

function renderizarAbasSetores() {
    const container = document.getElementById("container-setores");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Setor "Todos" e Botões Especiais
    const botoesFixos = [
        { id: 'todos', label: 'Todos os Setores' },
        { id: 'oferta', label: '🔥 Promoções' },
        { id: 'retiravel', label: '🛒 Peça e Retire' }
    ];
    
    botoesFixos.forEach(b => {
        const btn = document.createElement("button");
        btn.className = `tab-setor ${setorAtual === b.id ? 'ativo' : ''}`;
        btn.innerText = b.label;
        btn.onclick = () => selecionarSetor(b.id);
        container.appendChild(btn);
    });
    
    // Setores dinâmicos do banco
    const setores = extrairSetores();
    setores.forEach(s => {
        const btn = document.createElement("button");
        btn.className = `tab-setor ${setorAtual === s ? 'ativo' : ''}`;
        btn.innerText = s.toUpperCase();
        btn.onclick = () => selecionarSetor(s);
        container.appendChild(btn);
    });
}

function renderizarPilulasCategorias() {
    const container = document.getElementById("container-filtros");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Sempre tem o botão "Todos" (daquele setor)
    const btnTodos = document.createElement("button");
    btnTodos.className = `btn-filtro ${categoriaAtual === 'todos' ? 'ativo' : ''}`;
    btnTodos.innerText = "Todos";
    btnTodos.onclick = () => selecionarCategoria('todos');
    container.appendChild(btnTodos);
    
    // Categorias dinâmicas baseadas no setor selecionado
    const categorias = extrairCategorias();
    categorias.forEach(c => {
        const btn = document.createElement("button");
        btn.className = `btn-filtro ${categoriaAtual === c ? 'ativo' : ''}`;
        btn.innerText = c.toUpperCase();
        btn.onclick = () => selecionarCategoria(c);
        container.appendChild(btn);
    });
}

function selecionarSetor(setor) {
    setorAtual = setor;
    categoriaAtual = "todos"; // Ao trocar de setor, reseta a categoria
    renderizarAbasSetores();
    renderizarPilulasCategorias();
    aplicarFiltros();
}

function selecionarCategoria(categoria) {
    categoriaAtual = categoria;
    renderizarPilulasCategorias();
    aplicarFiltros();
}

function aplicarFiltros() {
    const termoBusca = barraBusca ? removerAcentos(barraBusca.value.toLowerCase().trim()) : "";

    const produtosFiltrados = listaCompleta.filter(produto => {
        const nomeProduto = removerAcentos(produto.nome.toLowerCase());
        const passouNaBusca = nomeProduto.includes(termoBusca);

        let passouNoSetor = false;
        if (setorAtual === "todos") {
            passouNoSetor = true;
        } else if (setorAtual === "oferta") {
            passouNoSetor = produto.preco_oferta !== null;
        } else if (setorAtual === "retiravel") {
            passouNoSetor = produto.is_retiravel === 1;
        } else {
            passouNoSetor = produto.nome_setor && produto.nome_setor.toLowerCase() === setorAtual;
        }
        
        let passouNaCategoria = false;
        if (categoriaAtual === "todos") {
            passouNaCategoria = true;
        } else {
            passouNaCategoria = produto.categoria && produto.categoria.toLowerCase() === categoriaAtual;
        }
        
        return passouNaBusca && passouNoSetor && passouNaCategoria;
    });

    // Atualiza texto de resultados
    const divInfo = document.getElementById("resultado-info");
    if (divInfo) {
        let nomeFiltro = categoriaAtual !== "todos" ? categoriaAtual : setorAtual;
        if (nomeFiltro === "todos") nomeFiltro = "Catálogo Completo";
        divInfo.innerHTML = `<strong>${produtosFiltrados.length}</strong> resultados para <em>"${nomeFiltro.toUpperCase()}"</em>`;
    }

    renderizarProdutos(produtosFiltrados);
}

if(barraBusca) {
    barraBusca.addEventListener("input", aplicarFiltros);
}

// =======================================================
// INICIALIZAÇÃO DA PÁGINA
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    // Check URL
    const urlParams = new URLSearchParams(window.location.search);
    const paramSetor = urlParams.get("setor");
    const paramFiltro = urlParams.get("filtro");
    
    if (paramSetor) {
        let setorRaw = paramSetor.toLowerCase();
        
        // Mapeamentos específicos por erros de plural ou categorias
        if (setorRaw === "doces") setorRaw = "doce";
        if (setorRaw === "frios") {
            setorAtual = "acougue"; // Frios fica no açougue
            categoriaAtual = "frios";
        } else {
            const subcategoriasMercearia = ["doce", "bebidas", "pets", "limpeza", "laticínios", "laticinios"];
            
            if (subcategoriasMercearia.includes(setorRaw)) {
                setorAtual = "mercearia";
                categoriaAtual = setorRaw;
            } else {
                setorAtual = setorRaw;
            }
        }
    }

    if (paramFiltro) {
        if (paramFiltro === "oferta" || paramFiltro === "retiravel") {
            setorAtual = paramFiltro.toLowerCase();
        } else {
            categoriaAtual = paramFiltro.toLowerCase();
        }
    }

    // Carrega tudo
    const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000';
    fetch(`${API_BASE}/api/produtos`)
        .then(res => res.json())
        .then(dados => {
            listaCompleta = dados;
            renderizarAbasSetores();
            renderizarPilulasCategorias();
            aplicarFiltros();
        })
        .catch(err => {
            console.error("Erro ao carregar:", err);
            containerProdutos.innerHTML = `<p style="color:red; padding:20px;">Erro ao carregar catálogo.</p>`;
        });
});
