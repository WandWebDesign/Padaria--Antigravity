/* =======================================================
   LÓGICA DA PÁGINA DE AGENDAMENTO (API MySQL)
   - Busca o produto pelo ID direto do servidor Node.js
   - Escolha de quantidade com trava de estoque real
======================================================= */

let produtoAtual = null; 
let quantidade = 1;      
let precoVigente = 0; // Guardaremos o preço real (oferta ou normal) aqui

// 1. Pegar o ID do produto pela URL
const urlParams = new URLSearchParams(window.location.search);
const idProduto = urlParams.get("id");

// 2. Busca o Produto na API
async function buscarProduto(id) {
    if (!id) return null;
    
    try {
        const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000';
        const resposta = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await resposta.json();
        
        // Encontra exatamente o produto que tem o codigo_produto igual ao ID da URL
        return produtos.find(p => p.codigo_produto == id);
    } catch (error) {
        console.error("Erro ao buscar produto no banco de dados:", error);
        return null;
    }
}

// 3. Renderizar a Tela
async function carregarTela() {
    produtoAtual = await buscarProduto(idProduto);

    if (!produtoAtual) {
        document.getElementById('tituloproduto').innerText = "Produto não encontrado.";
        return;
    }

    // Atualiza Textos
    document.getElementById('tituloproduto').innerText = produtoAtual.nome;
    
    const nomeSetor = produtoAtual.nome_setor ? produtoAtual.nome_setor.charAt(0).toUpperCase() + produtoAtual.nome_setor.slice(1) : 'Sem Setor';
    document.getElementById('descricao').innerText = `Excelente escolha da nossa categoria de ${nomeSetor}. Produto fresco preparado especialmente para você!`;
    
    // Define o preço vigente (se tiver oferta, usa ela; senão, usa o normal)
    const precoNormal = parseFloat(produtoAtual.valor);
    const precoOferta = produtoAtual.preco_oferta ? parseFloat(produtoAtual.preco_oferta) : null;
    precoVigente = precoOferta !== null ? precoOferta : precoNormal;

    atualizarPrecoTotal();

    // VALIDAÇÃO DE ESTOQUE
    if (produtoAtual.quantidade_estoque <= 0) {
        const btnAdicionar = document.getElementById("btn-adicionar-carrinho");
        if (btnAdicionar) {
            btnAdicionar.disabled = true;
            btnAdicionar.innerText = "Esgotado";
            btnAdicionar.style.backgroundColor = "#cccccc"; 
            btnAdicionar.style.cursor = "not-allowed";
        }
        quantidade = 0;
        document.getElementById('Qtd').innerText = 0;
    }

    // LÓGICA DE IMAGEM (Base64 vindo do MySQL)
    const imgPrincipal = document.getElementById('produtoimagem');
    const containerMiniaturas = document.getElementById('container-miniaturas');
    
    let imagemSrc = produtoAtual.imagem_url || "./Imagens/Logo.png";

    if (imgPrincipal) imgPrincipal.src = imagemSrc;
    
    // Como o MySQL agora manda 1 foto por produto, limpamos as miniaturas extras
    if(containerMiniaturas) {
        containerMiniaturas.innerHTML = '';
        const imgMini = document.createElement('img');
        imgMini.src = imagemSrc;
        imgMini.alt = "Miniatura do produto";
        imgMini.style.width = '70px';
        imgMini.style.height = '70px';
        imgMini.style.objectFit = 'cover';
        imgMini.style.borderRadius = '8px';
        imgMini.style.border = '2px solid var(--dourado-suave)'; // Já deixa selecionado
        imgMini.style.border = '2px solid var(--dourado-suave)'; // Já deixa selecionado
        containerMiniaturas.appendChild(imgMini);
    }
    
    // INICIALIZAÇÃO DO CALENDÁRIO E HORÁRIOS
    const inputData = document.getElementById("data-agendamento-produto");
    const selectHora = document.getElementById("hora-agendamento-produto");
    
    if (inputData && selectHora) {
        const hoje = new Date();
        
        // Data Mínima = Hoje
        const dataMinimaStr = hoje.toISOString().split('T')[0];
        inputData.min = dataMinimaStr;
        
        // Data Máxima = 30 dias a partir de hoje
        const dataMaxima = new Date(hoje);
        dataMaxima.setDate(hoje.getDate() + 30);
        inputData.max = dataMaxima.toISOString().split('T')[0];

        // Função que gera os horários dinamicamente dependendo da data escolhida
        const atualizarHorarios = () => {
            selectHora.innerHTML = '<option value="">Selecione...</option>';
            const dataEscolhida = inputData.value;
            
            if (!dataEscolhida) return;
            
            const ehHoje = (dataEscolhida === dataMinimaStr);
            const agora = new Date();
            // Padaria precisa de 2h de antecedência mínima para produtos do dia
            const horaCorteH = agora.getHours() + 2; 
            const horaCorteM = agora.getMinutes();

            const slots = [];
            let h = 7, m = 30; // Horário de funcionamento: 07:30 às 20:00
            
            while (h < 20 || (h === 20 && m === 0)) {
                // Se for hoje, só libera os horários que forem maiores que a hora de corte
                let liberarHorario = true;
                if (ehHoje) {
                    if (h < horaCorteH || (h === horaCorteH && m <= horaCorteM)) {
                        liberarHorario = false;
                    }
                }
                
                if (liberarHorario) {
                    const hh = String(h).padStart(2, '0');
                    const mm = String(m).padStart(2, '0');
                    slots.push(`${hh}:${mm}`);
                }
                
                m += 30;
                if (m >= 60) { m -= 60; h++; }
            }

            if (slots.length === 0 && ehHoje) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.innerText = "Sem horários p/ hoje (Escolha amanhã)";
                selectHora.appendChild(opt);
                return;
            }

            slots.forEach(horario => {
                const opt = document.createElement("option");
                opt.value = horario;
                opt.innerText = horario;
                selectHora.appendChild(opt);
            });
        };

        // Quando o usuário muda a data, recalcula os horários
        inputData.addEventListener('change', atualizarHorarios);
    }
}

// 4. Controles de Quantidade
function atualizarPrecoTotal() {
    if (quantidade === 0) {
        document.getElementById('preço-final').innerText = "R$ 0,00";
        return;
    }

    const total = precoVigente * quantidade;
    document.getElementById('preço-final').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('Qtd').innerText = quantidade;
}

document.getElementById('plus-btn').addEventListener('click', () => {
    const estoqueDisponivel = produtoAtual.quantidade_estoque;

    if (quantidade < estoqueDisponivel) {
        quantidade++;
        atualizarPrecoTotal();
    } else {
        if(typeof mostrarToast === "function") {
            mostrarToast(`Temos apenas ${estoqueDisponivel} unidades disponíveis no momento.`);
        } else {
            alert(`Temos apenas ${estoqueDisponivel} unidades disponíveis no momento.`);
        }
    }
});

document.getElementById('ret-btn').addEventListener('click', () => {
    if (quantidade > 1) {
        quantidade--;
        atualizarPrecoTotal();
    }
});

// 5. BOTÃO ADICIONAR AO CARRINHO
const btnAdicionar = document.getElementById("btn-adicionar-carrinho");

btnAdicionar.addEventListener("click", () => {
    const nomeClienteLogado = localStorage.getItem("usuarioLogado");

    if (!nomeClienteLogado) {
        mostrarToast("Por favor, faça login para adicionar itens ao carrinho!");
        return;
    }

    if (!produtoAtual) {
        mostrarToast("Erro: produto não carregado.");
        return;
    }

    if (quantidade > produtoAtual.quantidade_estoque) {
        mostrarToast(`Erro: Você selecionou mais itens do que temos em estoque!`);
        return;
    }

    const dataInput = document.getElementById("data-agendamento-produto");
    const horaInput = document.getElementById("hora-agendamento-produto");
    
    let dataEscolhida = null;
    let horaEscolhida = null;
    
    if (dataInput && horaInput) {
        dataEscolhida = dataInput.value;
        horaEscolhida = horaInput.value;
        
        if (!dataEscolhida) {
            mostrarToast("Por favor, selecione a data de retirada.");
            return;
        }
        if (!horaEscolhida) {
            mostrarToast("Por favor, selecione o horário de retirada.");
            return;
        }
    }

    let carrinhoAtual = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    // Procura se o item já existe no carrinho PARA A MESMA DATA E HORA
    const indexExistente = carrinhoAtual.findIndex(item => 
        item.id === produtoAtual.codigo_produto &&
        item.dataRetirada === dataEscolhida &&
        item.horaRetirada === horaEscolhida
    );
    
    if (indexExistente !== -1) {
        // Se já existe, soma as quantidades
        const novaQuantidade = carrinhoAtual[indexExistente].quantidade + quantidade;
        
        // Verifica se a NOVA quantidade total passa do estoque
        if (novaQuantidade > produtoAtual.quantidade_estoque) {
            mostrarToast(`Erro: Você já tem ${carrinhoAtual[indexExistente].quantidade} deste item no carrinho para essa data. Temos apenas ${produtoAtual.quantidade_estoque} no estoque.`);
            return;
        }
        
        carrinhoAtual[indexExistente].quantidade = novaQuantidade;
    } else {
        // Se não existe, cria um novo objeto
        const itemParaCarrinho = {
            id: produtoAtual.codigo_produto,
            nome: produtoAtual.nome,
            preco: precoVigente,
            quantidade: quantidade,
            imagem: produtoAtual.imagem_url,
            quantidade_estoque_real: produtoAtual.quantidade_estoque, 
            dataRetirada: dataEscolhida,  
            horaRetirada: horaEscolhida   
        };
        carrinhoAtual.push(itemParaCarrinho);
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinhoAtual));

    mostrarToast(`✅ ${produtoAtual.nome} adicionado! Agende a retirada no carrinho.`);

    if(typeof abrirCarrinho === "function") abrirCarrinho(); 
});

// Inicializa a tela ao carregar
document.addEventListener("DOMContentLoaded", carregarTela);
