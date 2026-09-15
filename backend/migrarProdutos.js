const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 1. COLE SEU OBJETO produtosIniciais AQUI
const produtosIniciais = {
    //Padaria//
    pãofrances: {
        tituloproduto: "Pão Francês",
        imagem: "./Imagens/PãoFrances.webp",
        preco: "0,80 / Un",
        precoOferta: "0,70 / Un",
        setor: "padaria",
        categoria: "padaria",
        tags: ["oferta", "retiravel"],
        quantidade_estoque: 50
    },
    pãodequeijo: {
        tituloproduto: "Pão de Queijo",
        imagem: "./Imagens/Pão de Queijo .webp",
        preco: "3,00 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    coxinhadefrango: {
        tituloproduto: "Coxinha de Frango",
        imagem: "./Imagens/Coxinha de Frango .webp",
        preco: "8,50 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    pãodeleite: {
        tituloproduto: "Pão de Leite",
        imagem: "./Imagens/Pão de Leite .webp",
        preco: "1,50 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    esfirradecarne: {
        tituloproduto: "Esfirra de Carne",
        imagem: "./Imagens/Esfirra de Carne.webp",
        preco: "8,50 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    bolodefuba: {
        tituloproduto: "Bolo de Fubá",
        imagem: "./Imagens/Bolo de fubá.webp",
        preco: "7,50 / Fatia",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    bolodemilho: {
        tituloproduto: "Bolo de Milho",
        imagem: "./Imagens/Bolo de Milho.webp",
        preco: "7,50 / Fatia",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    mistoquente: {
        tituloproduto: "Misto Quente",
        imagem: "./Imagens/MistoQuente.jpg",
        preco: "7,00 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: null,
        quantidade_estoque: 50
    },
    sonhodecreme: {
        tituloproduto: "Sonho de Creme",
        imagem: "./Imagens/Sonho de Creme.webp",
        preco: "7,50 / Un",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: null,
        quantidade_estoque: 50
    },
    tortadefrango: {
        tituloproduto: "Torta de Frango",
        imagem: "./Imagens/TortaDefrango.webp",
        preco: "8,90 / Fatia",
        precoOferta: null,
        setor: "padaria",
        categoria: "padaria",
        tags: null,
        quantidade_estoque: 50
    },
    //Açougue/Frios//
    mussarela: {
        tituloproduto: "Mussarela",
        imagem: "./Imagens/Mussarela.webp",
        preco: "5,99 / 100g",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    mortandela: {
        tituloproduto: "Mortadela",
        imagem: "./Imagens/Mortandela.webp",
        preco: "4,49 / 100g",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    presunto: {
        tituloproduto: "Presunto Fatiado",
        imagem: "./Imagens/Presunto.webp",
        preco: "5,49 / 100g",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: ["retiravel"],
        quantidade_estoque: 50
    },
    coxasobrecoxa: {
        tituloproduto: "Coxa e Sobrecoxa de Frango",
        imagem: "./Imagens/Coxa de Frango.webp",
        preco: "14,99 / Kg",
        precoOferta: "10,99 / Kg",
        setor: "acougue",
        categoria: "frios",
        tags: ["oferta"],
        quantidade_estoque: 50
    },
    linguiçatoscana: {
        tituloproduto: "Linguiça Toscana Sadia",
        imagem: "./Imagens/Linguiça Toscada Sadia.webp",
        preco: "29,90 / Kg",
        precoOferta: "23,90 / Kg",
        setor: "acougue",
        categoria: "frios",
        tags: ["oferta"],
        quantidade_estoque: 50
    },
    acembovino: {
        tituloproduto: "Acém Bovino Moído",
        imagem: "./Imagens/Acém Bovino.webp",
        preco: "32,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    patinhobovino: {
        tituloproduto: "Patinho Bovino em Bife",
        imagem: "./Imagens/Patinho Bife.webp",
        preco: "42,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    cotrafile: {
        tituloproduto: "ContraFilé",
        imagem: "./Imagens/Contrafile.webp",
        preco: "54,90 / Kg",
        precoOferta: "49,90",
        setor: "acougue",
        categoria: "frios",
        tags: ["oferta"],
        quantidade_estoque: 50
    },
    bistecasuina: {
        tituloproduto: "Bisteca Suína",
        imagem: "./Imagens/Bisteca Suina.webp",
        preco: "24,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    baconempedaço: {
        tituloproduto: "Bacon em Pedaço",
        imagem: "./Imagens/Bacon.webp",
        preco: "44,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    salsicha: {
        tituloproduto: "Salsicha (Perdigão)",
        imagem: "./Imagens/Salsicha perdigão.webp",
        preco: "17,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    lombosuino: {
        tituloproduto: "Lombo Suíno",
        imagem: "./Imagens/Lombo Suino.jpg",
        preco: "29,90 / Kg",
        precoOferta: null,
        setor: "acougue",
        categoria: "frios",
        tags: null,
        quantidade_estoque: 50
    },
    //Hortifruti//
    batatalavada: {
        tituloproduto: "Batata Lavada",
        imagem: "./Imagens/Batata Lavada.webp",
        preco: "3,99 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    cenoura: {
        tituloproduto: "Cenoura",
        imagem: "./Imagens/Cenoura.webp",
        preco: "6,99 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    cebola: {
        tituloproduto: "Cebola",
        imagem: "./Imagens/Cebola.webp",
        preco: "7,99 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    tomatedébora: {
        tituloproduto: "Tomate Débora",
        imagem: "./Imagens/Tomate Débora.webp",
        preco: "8,99 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    alfacecrespa: {
        tituloproduto: "Alface Crespa",
        imagem: "./Imagens/Alface Crespa.webp",
        preco: "3,99 / Un",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    alho: {
        tituloproduto: "Alho",
        imagem: "./Imagens/Alho.webp",
        preco: "3,50 / 100g",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    bananananica: {
        tituloproduto: "Banana Nanica",
        imagem: "./Imagens/Banana Nanica.webp",
        preco: "5,49 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    maçagala: {
        tituloproduto: "Maçã Gala",
        imagem: "./Imagens/Maça Gala.webp",
        preco: "11,90 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    laranjapera: {
        tituloproduto: "Laranja Pera",
        imagem: "./Imagens/Laranja.webp",
        preco: "4,99 / Kg",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    ovosbrancos: {
        tituloproduto: "Ovos Brancos",
        imagem: "./Imagens/Ovos Brancos.webp",
        preco: "12,99 / Dúzia",
        precoOferta: null,
        setor: "hortifruti",
        categoria: "hortifruti",
        tags: null,
        quantidade_estoque: 50
    },
    //Mercado//
    arrozagulha: {
        tituloproduto: "Arroz Agulhinha Tipo 1 Camil (5Kg)",
        imagem: "./Imagens/Arroz Camil.webp",
        preco: "24,90 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "mercearia",
        tags: null,
        quantidade_estoque: 50
    },
    feijaocarioca: {
        tituloproduto: "Feijão Carioca (1Kg)",
        imagem: "./Imagens/Feijão Carioca.webp",
        preco: "9,99 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "mercearia",
        tags: null,
        quantidade_estoque: 50
    },
    açucarrefinado: {
        tituloproduto: "Açúcar Refinado (1Kg)",
        imagem: "./Imagens/Açucar Refinado.webp",
        preco: "5,49 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "mercearia",
        tags: null,
        quantidade_estoque: 50
    },
    cafeempotradicional: {
        tituloproduto: "Café em Pó Tradicional (500g)",
        imagem: "./Imagens/Café Tradicional jpg.jpg",
        preco: "18,90 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "bebidas",
        tags: null,
        quantidade_estoque: 50
    },
    leiteintegral: {
        tituloproduto: "Leite Integral (1L)",
        imagem: "./Imagens/Leite Integral.webp",
        preco: "5,99 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "laticinios",
        tags: null,
        quantidade_estoque: 50
    },
    biscoitorecheado: {
        tituloproduto: "Biscoito Recheado (Pacote)",
        imagem: "./Imagens/Biscoito Recheado .webp",
        preco: "3,99 / Un",
        precoOferta: null,
        setor: "mercado",
        categoria: "doces",
        tags: null,
        quantidade_estoque: 50
    },
    macaraoespaquete: {
        tituloproduto: "Macarrão Espaguete (500g)",
        imagem: "./Imagens/Macarrão.webp",
        preco: "4,79 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "mercearia",
        tags: null,
        quantidade_estoque: 50
    },
    detergeliquido: {
        tituloproduto: "Detergente Líquido Ypê (500ml)",
        imagem: "./Imagens/Detergente.webp",
        preco: "2,99 / Un",
        precoOferta: null,
        setor: "mercado",
        categoria: "limpeza",
        tags: null,
        quantidade_estoque: 50
    },
    raçaoparacaes: {
        tituloproduto: "Ração para Cães Adultos (1Kg)",
        imagem: "./Imagens/Ração para cachorro.jpeg",
        preco: "21,90 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "pets",
        tags: null,
        quantidade_estoque: 50
    },
    aguasanitaria: {
        tituloproduto: "Água Sanitária (1L)",
        imagem: "./Imagens/Candida.webp",
        preco: "4,79 / Un",
        precoOferta: null,
        setor: "mercearia",
        categoria: "limpeza",
        tags: null,
        quantidade_estoque: 50
    }
};

// 2. CONFIGURAÇÃO DO BANCO DE DADOS
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'BKD123!WVPwvp', // Insira sua senha do MySQL aqui
    database: 'padaria_diniz'
};

async function migrarDados() {
    let conexao;
    try {
        console.log("Iniciando a migração de dados...");
        conexao = await mysql.createConnection(dbConfig);

        const listaProdutos = Object.entries(produtosIniciais);

        for (const [id_js, produto] of listaProdutos) {
            console.log(`Processando: ${produto.tituloproduto}`);

            // --- TRATAMENTO DO SETOR ---
            // Verifica se o setor já existe no banco
            let [linhasSetor] = await conexao.execute(
                'select codigo_setor from setor where nome = ?',
                [produto.setor]
            );

            let codigoSetor;
            if (linhasSetor.length > 0) {
                codigoSetor = linhasSetor[0].codigo_setor;
            } else {
                // Se não existir, insere o novo setor
                const [resultadoSetor] = await conexao.execute(
                    'insert into setor (nome) values (?)',
                    [produto.setor]
                );
                codigoSetor = resultadoSetor.insertId;
            }

            // --- TRATAMENTO DE VALORES E UNIDADES ---
            // Exemplo: "0,80 / Un" -> valorStr: "0,80", unidadeStr: "Un"
            const partesPreco = produto.preco.split('/');
            const valorDecimal = parseFloat(partesPreco[0].replace(',', '.').trim());
            const unidadeMedida = partesPreco[1] ? partesPreco[1].trim() : null;

            let precoOfertaDecimal = null;
            if (produto.precoOferta) {
                const partesOferta = produto.precoOferta.split('/');
                precoOfertaDecimal = parseFloat(partesOferta[0].replace(',', '.').trim());
            }

            // --- TRATAMENTO DE TAGS (Booleano) ---
            const isRetiravel = (produto.tags && produto.tags.includes("retiravel")) ? 1 : 0;

            // --- INSERÇÃO DO PRODUTO ---
            const [resultadoProduto] = await conexao.execute(
                `insert into produtos 
                (codigo_setor, nome, valor, preco_oferta, is_retiravel, categoria, quantidade_estoque, unidade_medida) 
                values (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    codigoSetor,
                    produto.tituloproduto,
                    valorDecimal,
                    precoOfertaDecimal,
                    isRetiravel,
                    produto.categoria,
                    produto.quantidade_estoque,
                    unidadeMedida
                ]
            );
            const codigoProduto = resultadoProduto.insertId;

            // --- TRATAMENTO E INSERÇÃO DA IMAGEM ---
            if (produto.imagem) {
                try {
                    // Ajusta o caminho da imagem (remove ./ ou ../../ iniciais)
                    let caminhoRelativo = produto.imagem.replace(/^\.?\.?\//, '');
                    const caminhoAbsoluto = path.resolve(__dirname, '../', caminhoRelativo);
                    
                    // Lê o arquivo de imagem e converte para Base64
                    const bitmap = await fs.readFile(caminhoAbsoluto);
                    const base64Imagem = Buffer.from(bitmap).toString('base64');
                    
                    // Descobre a extensão para montar o prefixo Data URI (ex: data:image/webp;base64,...)
                    const extensao = path.extname(caminhoAbsoluto).replace('.', '');
                    const base64Completo = `data:image/${extensao};base64,${base64Imagem}`;

                    await conexao.execute(
                        'insert into imagens_produtos (codigo_produto, imagem_base64) values (?, ?)',
                        [codigoProduto, base64Completo]
                    );
                } catch (imgError) {
                    console.error(`Erro ao processar imagem do produto ${produto.tituloproduto}: O arquivo ${produto.imagem} foi encontrado no diretório?`);
                }
            }
        }

        console.log("Migração concluída com sucesso!");

    } catch (error) {
        console.error("Erro durante a migração:", error);
    } finally {
        if (conexao) {
            await conexao.end();
        }
    }
}

migrarDados();