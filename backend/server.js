require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Importante: usar a versão com /promise
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Configuração do Multer para armazenamento local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const extensao = file.originalname.split('.').pop();
        cb(null, `produto_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extensao}`);
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir os arquivos do front-end (HTML, CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, '../')));

// Servir os arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota inicial apontando para a Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../padaria-landinpage.html'));
});

// Rotas diretas e tolerantes a maiúsculas/minúsculas para o Painel Admin
app.get(['/admin', '/Admin', '/Admin/HTML/index-admin.html', '/Admin/Html/index-admin.html', '/admin/html/index-admin.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../Admin/Html/index-admin.html'));
});

app.get(['/admin/pedidos', '/Admin/HTML/admin-pedidos.html', '/Admin/Html/admin-pedidos.html', '/admin/html/admin-pedidos.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../Admin/Html/admin-pedidos.html'));
});

// Configurar o Pool de conexão (suporta ambiente local, Render e AWS RDS)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'BKD123!WVPwvp',
    database: process.env.DB_NAME || 'padaria',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Teste de conexão
db.getConnection()
    .then(() => console.log('Conectado ao MySQL (Pool) - Padaria Diniz!'))
    .catch(err => console.error('Erro ao conectar:', err));

// ==========================================
// ROTA DE CADASTRO
// ==========================================
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, telefone, cpf } = req.body;
        const [result] = await db.query("INSERT INTO usuarios (email, senha, tipo_usuario) VALUES (?, ?, 'cliente')", [email, senha]);
        const codigo_usuario = result.insertId;
        
        await db.query("INSERT INTO clientes (codigo_usuario, cpf, nome, telefone) VALUES (?, ?, ?, ?)", [codigo_usuario, cpf, nome, telefone]);
        res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Email já cadastrado ou erro no servidor.' });
    }
});

// ==========================================
// ROTA DE LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const [results] = await db.query("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [email, senha]);
        
        if (results.length > 0) {
            res.status(200).json({ mensagem: 'Login efetuado!', tipo_usuario: results[0].tipo_usuario });
        } else {
            res.status(401).json({ erro: 'Email ou senha incorretos.' });
        }
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// ==========================================
// ROTA DE CATÁLOGO (PRODUTOS)
// ==========================================
app.get('/api/produtos', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT p.*, s.nome AS nome_setor,
                   (SELECT i.imagem_url FROM imagens_produtos i WHERE i.codigo_produto = p.codigo_produto LIMIT 1) AS imagem_url
            FROM produtos p
            JOIN setor s ON p.codigo_setor = s.codigo_setor
            ORDER BY p.codigo_produto ASC
        `);
        res.status(200).json(results);
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).json({ erro: "Erro ao buscar catálogo." });
    }
});

// ==========================================
// ROTA DE CATEGORIAS (FILTROS DINÂMICOS)
// ==========================================
app.get('/api/categorias', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT DISTINCT categoria 
            FROM produtos 
            WHERE categoria IS NOT NULL AND categoria != ''
            ORDER BY categoria ASC
        `);
        // Extrai apenas os nomes em um array simples de strings
        const categorias = results.map(row => row.categoria);
        res.status(200).json(categorias);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        res.status(500).json({ erro: "Erro ao buscar categorias." });
    }
});

// ==========================================
// ROTAS DO PAINEL ADMIN (CRUD)
// ==========================================

// ADICIONAR
app.post('/api/produtos', upload.array('imagens', 5), async (req, res) => {
    const { setor, nome, valor, preco_custo, preco_oferta, quantidade_estoque, is_retiravel, unidade_medida, categoria, marca } = req.body;
    try {
        const [resSetor] = await db.query('SELECT codigo_setor FROM setor WHERE nome = ?', [setor]);
        const codigoSetor = resSetor[0].codigo_setor;
        
        const isRet = (is_retiravel === 'true' || is_retiravel === '1' || is_retiravel === 1) ? 1 : 0;

        const [resProd] = await db.query(
            'INSERT INTO produtos (codigo_setor, nome, valor, preco_custo, preco_oferta, is_retiravel, quantidade_estoque, unidade_medida, categoria, marca) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [codigoSetor, nome, valor, preco_custo || 0.00, preco_oferta || null, isRet, quantidade_estoque || 0, unidade_medida, categoria, marca || null]
        );
        
        const codigoProduto = resProd.insertId;
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const url = `/uploads/${file.filename}`;
                await db.query('INSERT INTO imagens_produtos (codigo_produto, imagem_url) VALUES (?, ?)', [codigoProduto, url]);
            }
        }
        res.status(201).json({ mensagem: 'Sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao salvar.' });
    }
});

// EDITAR
app.put('/api/produtos/:id', upload.array('imagens', 5), async (req, res) => {
    const { setor, nome, valor, preco_custo, preco_oferta, quantidade_estoque, is_retiravel, unidade_medida, categoria, marca } = req.body;
    try {
        const [resSetor] = await db.query('SELECT codigo_setor FROM setor WHERE nome = ?', [setor]);
        
        const isRet = (is_retiravel === 'true' || is_retiravel === '1' || is_retiravel === 1) ? 1 : 0;

        await db.query('UPDATE produtos SET codigo_setor=?, nome=?, valor=?, preco_custo=?, preco_oferta=?, is_retiravel=?, quantidade_estoque=?, unidade_medida=?, categoria=?, marca=? WHERE codigo_produto=?',
            [resSetor[0].codigo_setor, nome, valor, preco_custo || 0.00, preco_oferta || null, isRet, quantidade_estoque || 0, unidade_medida, categoria, marca || null, req.params.id]);

        if (req.files && req.files.length > 0) {
            await db.query('DELETE FROM imagens_produtos WHERE codigo_produto = ?', [req.params.id]);
            for (let file of req.files) {
                const url = `/uploads/${file.filename}`;
                await db.query('INSERT INTO imagens_produtos (codigo_produto, imagem_url) VALUES (?, ?)', [req.params.id, url]);
            }
        } else if (req.body.remove_imagens === 'true') {
             // Caso o usuario tenha deletado a foto na interface
             await db.query('DELETE FROM imagens_produtos WHERE codigo_produto = ?', [req.params.id]);
        }
        res.status(200).json({ mensagem: 'Atualizado!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar.' });
    }
});

// EXCLUIR
app.delete('/api/produtos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM imagens_produtos WHERE codigo_produto = ?', [req.params.id]);
        await db.query('DELETE FROM produtos WHERE codigo_produto = ?', [req.params.id]);
        res.status(200).json({ mensagem: 'Excluído!' });
    } catch (err) {
        console.error("Erro ao excluir produto:", err);
        res.status(500).json({ erro: 'Erro ao excluir.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// =======================================================
// ROTA: LIMPAR PEDIDOS CONCLUÍDOS/CANCELADOS DO CLIENTE (SOFT DELETE)
// =======================================================
app.delete('/api/pedidos/cliente/:email/concluidos', async (req, res) => {
    const { email } = req.params;
    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction(); // Inicia uma transação segura

        // 1. Busca os IDs dos pedidos que estão Finalizados ou Cancelados deste cliente (e não excluídos)
        const [pedidos] = await conexao.query(`
            SELECT p.codigo_pedido FROM pedidos p
            JOIN clientes c ON p.codigo_cliente = c.codigo_cliente
            JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario
            WHERE u.email = ? 
              AND (p.situacao = 'Finalizado' OR p.situacao = 'Cancelado')
              AND (p.excluido = FALSE OR p.excluido IS NULL)
        `, [email]);

        if (pedidos.length > 0) {
            // Extrai apenas os números dos IDs em um Array [1, 2, 3...]
            const idsPedidos = pedidos.map(p => p.codigo_pedido);
            
            // Soft delete: Marca como excluído e atualiza timestamp de alteração, preservando dados no Power BI
            await conexao.query(`
                UPDATE pedidos 
                SET excluido = TRUE, data_hora_atualizacao = NOW() 
                WHERE codigo_pedido IN (?)
            `, [idsPedidos]);
        }

        await conexao.commit(); // Confirma as alterações no banco de dados
        res.json({ mensagem: "Pedidos concluídos e cancelados limpos com sucesso!" });
    } catch (erro) {
        if (conexao) await conexao.rollback(); // Desfaz tudo se der algum erro no caminho
        console.error("Erro ao limpar concluídos:", erro);
        res.status(500).json({ erro: erro.message });
    } finally {
        if (conexao) conexao.release(); // Libera a conexão de volta para o pool
    }
});

// =======================================================
// ROTA: LIMPAR TODO O HISTÓRICO DO CLIENTE (SOFT DELETE)
// =======================================================
app.delete('/api/pedidos/cliente/:email/todos', async (req, res) => {
    const { email } = req.params;
    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        // 1. Busca os IDs de TODOS os pedidos ativos do cliente
        const [pedidos] = await conexao.query(`
            SELECT p.codigo_pedido FROM pedidos p
            JOIN clientes c ON p.codigo_cliente = c.codigo_cliente
            JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario
            WHERE u.email = ? AND (p.excluido = FALSE OR p.excluido IS NULL)
        `, [email]);

        if (pedidos.length > 0) {
            const idsPedidos = pedidos.map(p => p.codigo_pedido);
            
            // Soft delete: Atualiza a flag de exclusão e o timestamp
            await conexao.query(`
                UPDATE pedidos 
                SET excluido = TRUE, data_hora_atualizacao = NOW() 
                WHERE codigo_pedido IN (?)
            `, [idsPedidos]);
        }

        await conexao.commit();
        res.json({ mensagem: "Todo o histórico foi limpo com sucesso!" });
    } catch (erro) {
        if (conexao) await conexao.rollback();
        console.error("Erro ao limpar histórico completo:", erro);
        res.status(500).json({ erro: erro.message });
    } finally {
        if (conexao) conexao.release();
    }
});

/// =======================================================
// FUNÇÃO AUXILIAR DE DATAS (À Prova de falhas)
// =======================================================
function converterDataParaMySQL(data) {
    if (!data) return null;
    // Se a data vier com barras (ex: 31/05/2026), converte para MySQL (YYYY-MM-DD)
    if (data.includes('/')) {
        const [dia, mes, ano] = data.split('/');
        return `${ano}-${mes}-${dia}`;
    }
    // Se já vier do input type="date" (ex: 2026-05-31), devolve como está
    return data; 
}

// =======================================================
// 1. ROTA: SALVAR NOVO PEDIDO (Checkout -> Banco)
// =======================================================
app.post('/api/pedidos', async (req, res) => {
    const { id, cliente, dataPedido, valorTotal, pagamento, dataRetirada, horaRetirada, itens } = req.body;

    if (!id || !itens || itens.length === 0) {
        return res.status(400).json({ erro: "Dados do pedido ausentes." });
    }

    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const dataPedidoSQL = converterDataParaMySQL(dataPedido) || new Date().toISOString().split('T')[0];
        const dataRetiradaSQL = converterDataParaMySQL(dataRetirada);

        // 1. Busca o ID numérico do Cliente
        const sqlBuscaCliente = `
            SELECT c.codigo_cliente 
            FROM clientes c
            JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario
            WHERE u.email = ? OR c.nome = ? LIMIT 1
        `;
        const [buscaCliente] = await conexao.query(sqlBuscaCliente, [cliente, cliente]);
        
        if (buscaCliente.length === 0) {
            throw new Error(`O usuário '${cliente}' não possui registro na tabela clientes do banco de dados.`);
        }
        const idCliente = buscaCliente[0].codigo_cliente;

        // 2. Valida Itens, Calcula Total Real e Desconta Estoque
        let totalCalculado = 0;
        const itensValidados = [];

        for (let item of itens) {
            const nomeItem = item.nome || item.tituloproduto; 
            const qtde = item.quantidade || 1;

            const [buscaProduto] = await conexao.query(
                `SELECT codigo_produto, valor, preco_oferta, quantidade_estoque FROM produtos WHERE nome = ? LIMIT 1`, 
                [nomeItem]
            );
            
            if (buscaProduto.length === 0) {
                throw new Error(`O produto '${nomeItem}' não existe no banco de dados!`);
            }

            const produtoDB = buscaProduto[0];
            
            // Validação de Estoque
            if (produtoDB.quantidade_estoque < qtde) {
                throw new Error(`Estoque insuficiente para '${nomeItem}'. Pedido: ${qtde}, Estoque: ${produtoDB.quantidade_estoque}`);
            }

            // Seleção do Preço (Prioriza Oferta se for maior que 0)
            const precoUnit = (produtoDB.preco_oferta && produtoDB.preco_oferta > 0) ? produtoDB.preco_oferta : produtoDB.valor;
            const subtotal = precoUnit * qtde;
            totalCalculado += subtotal;

            // Desconta o estoque no banco imediatamente (já dentro da transaction)
            await conexao.query(
                `UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE codigo_produto = ?`,
                [qtde, produtoDB.codigo_produto]
            );

            itensValidados.push({
                idProduto: produtoDB.codigo_produto,
                qtde: qtde,
                precoUnit: precoUnit,
                subtotal: subtotal
            });
        }

        // 3. Insere o Pedido com o Total Calculado pelo Backend
        const sqlPedido = `
            INSERT INTO pedidos 
            (codigo_cliente, situacao, total, data_pedido, data_hora_atualizacao, data_retirada, hora_retirada, codigo_retirada, forma_pagto, excluido) 
            VALUES (?, 'Pendente', ?, NOW(), NOW(), ?, ?, ?, ?, FALSE)`;

        const [resultadoPedido] = await conexao.query(sqlPedido, [
            idCliente, totalCalculado, dataRetiradaSQL, horaRetirada, id, pagamento
        ]);
        const idPedidoGerado = resultadoPedido.insertId;

        // 4. Insere os Itens do Pedido na tabela auxiliar
        const sqlItens = `INSERT INTO itens_pedidos (codigo_pedido, codigo_produto, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`;
        for (let itemVal of itensValidados) {
            await conexao.query(sqlItens, [idPedidoGerado, itemVal.idProduto, itemVal.qtde, itemVal.precoUnit, itemVal.subtotal]);
        }

        // Salva a transação e finaliza
        await conexao.commit();
        res.status(201).json({ mensagem: "Pedido gravado com sucesso!", id_pedido: idPedidoGerado, totalPago: totalCalculado });

    } catch (erro) {
        if (conexao) await conexao.rollback();
        // AQUI ESTÁ O SEGREDO: O erro real e detalhado aparecerá no terminal do Node.js!
        console.error("❌ FALHA NO BANCO DE DADOS:", erro.message); 
        res.status(500).json({ erro: "Erro ao inserir pedido: " + erro.message });
    } finally {
        if (conexao) conexao.release();
    }
});

// =======================================================
// 2. ROTA: BUSCAR PEDIDOS (Banco -> Painel Admin)
// =======================================================
// =======================================================
// ROTA: BUSCAR PEDIDOS (Com suporte a Justificativa de Cancelamento)
// =======================================================
// =======================================================
// ROTA: BUSCAR PEDIDOS (Com suporte a Justificativa de Cancelamento)
// =======================================================
app.get('/api/pedidos', async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.codigo_pedido, p.codigo_retirada AS id, c.nome AS cliente, 
                c.cpf,
                DATE_FORMAT(p.data_pedido, '%d/%m/%Y %H:%i') AS dataPedido, 
                DATE_FORMAT(p.data_retirada, '%d/%m/%Y') AS dataRetirada, 
                p.hora_retirada AS horaRetirada, 
                p.forma_pagto AS pagamento, p.total AS valorTotal, 
                p.situacao AS status, 
                p.justificativa, 
                p.data_hora_atualizacao AS dataHoraAtualizacao,
                GROUP_CONCAT(CONCAT(pr.nome, ':', i.quantidade) SEPARATOR ';') AS itens_string
            FROM pedidos p
            LEFT JOIN clientes c ON p.codigo_cliente = c.codigo_cliente
            LEFT JOIN itens_pedidos i ON p.codigo_pedido = i.codigo_pedido
            LEFT JOIN produtos pr ON i.codigo_produto = pr.codigo_produto
            WHERE (p.excluido = FALSE OR p.excluido IS NULL)
            GROUP BY p.codigo_pedido
            ORDER BY p.codigo_pedido DESC
        `;

        const [resultados] = await db.query(sql);

        // Formata os dados para o JavaScript do Front-end entender
        const pedidosFormatados = resultados.map(p => {
            const itens = p.itens_string ? p.itens_string.split(';').map(itemStr => {
                const [nome, quantidade] = itemStr.split(':');
                return { nome, quantidade: parseInt(quantidade) };
            }) : [];

            return {
                id: p.id,
                cliente: p.cliente || 'Desconhecido',
                cpf: p.cpf || 'Não informado',
                dataPedido: p.dataPedido,
                dataRetirada: p.dataRetirada,
                horaRetirada: p.horaRetirada,
                pagamento: p.pagamento,
                valorTotal: parseFloat(p.valorTotal),
                status: p.status,
                justificativa: p.justificativa, 
                dataHoraAtualizacao: p.dataHoraAtualizacao,
                itens: itens
            };
        });

        res.json(pedidosFormatados);
    } catch (erro) {
        console.error("Erro ao buscar pedidos:", erro);
        res.status(500).json({ erro: erro.message });
    }
});

// =======================================================
// 3. ROTA: ATUALIZAR STATUS E SALVAR JUSTIFICATIVA
// =======================================================
app.put('/api/pedidos/:codigo/status', async (req, res) => {
    const { codigo } = req.params;
    const { status, justificativa } = req.body; 

    try {
        let sql;
        let parametros;

        // Atualiza a situação, justificativa e carimbo de tempo exato (data_hora_atualizacao = NOW())
        if (isNaN(codigo)) {
            sql = `UPDATE pedidos SET situacao = ?, justificativa = ?, data_hora_atualizacao = NOW() WHERE codigo_retirada = ?`;
            parametros = [status, justificativa || null, codigo];
        } else {
            sql = `UPDATE pedidos SET situacao = ?, justificativa = ?, data_hora_atualizacao = NOW() WHERE codigo_pedido = ?`;
            parametros = [status, justificativa || null, codigo];
        }
        
        await db.query(sql, parametros);
        
        res.json({ mensagem: "Status do pedido modificado com sucesso!" });
    } catch (erro) {
        console.error("Erro ao atualizar status:", erro);
        res.status(500).json({ erro: erro.message });
    }
});
// =======================================================
// 4. ROTA: BUSCAR PEDIDOS ESPECÍFICOS DO CLIENTE (Por E-mail)
// =======================================================
app.get('/api/pedidos/cliente/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const sql = `
            SELECT 
                p.codigo_pedido, p.codigo_retirada AS id, c.nome AS cliente, 
                DATE_FORMAT(p.data_pedido, '%d/%m/%Y %H:%i') AS dataPedido, 
                DATE_FORMAT(p.data_retirada, '%d/%m/%Y') AS dataRetirada, 
                p.hora_retirada AS horaRetirada, 
                p.forma_pagto AS pagamento, p.total AS valorTotal, 
                p.situacao AS status,
                p.justificativa,
                GROUP_CONCAT(CONCAT(pr.nome, ':', i.quantidade) SEPARATOR ';') AS itens_string
            FROM pedidos p
            JOIN clientes c ON p.codigo_cliente = c.codigo_cliente
            JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario
            LEFT JOIN itens_pedidos i ON p.codigo_pedido = i.codigo_pedido
            LEFT JOIN produtos pr ON i.codigo_produto = pr.codigo_produto
            WHERE u.email = ? AND (p.excluido = FALSE OR p.excluido IS NULL)
            GROUP BY p.codigo_pedido
            ORDER BY p.codigo_pedido DESC`;

        const [resultados] = await db.query(sql, [email]);

        // Formata os dados para o JavaScript do Front-end ler perfeitamente
        const pedidosFormatados = resultados.map(p => {
            const itens = p.itens_string ? p.itens_string.split(';').map(itemStr => {
                const [nome, quantidade] = itemStr.split(':');
                return { nome, quantidade: parseInt(quantidade) };
            }) : [];

            return {
                id: p.id, 
                cliente: p.cliente,
                dataPedido: p.dataPedido,
                dataRetirada: p.dataRetirada,
                horaRetirada: p.horaRetirada,
                pagamento: p.pagamento,
                valorTotal: parseFloat(p.valorTotal),
                status: p.status,
                justificativa: p.justificativa,
                itens: itens
            };
        });

        res.json(pedidosFormatados);
    } catch (erro) {
        console.error("Erro ao buscar pedidos do cliente:", erro);
        res.status(500).json({ erro: erro.message });
    }
});
// =======================================================
// 5. ROTA: BUSCAR TODOS OS CLIENTES
// =======================================================
app.get('/api/clientes', async (req, res) => {
    try {
        const sql = `
            SELECT c.codigo_cliente, c.nome, c.cpf, c.telefone, u.email
            FROM clientes c
            JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario
            ORDER BY c.nome ASC
        `;
        const [resultados] = await db.query(sql);
        res.json(resultados);
    } catch (erro) {
        console.error("Erro ao buscar clientes:", erro);
        res.status(500).json({ erro: erro.message });
    }
});

// =======================================================
// ROTA ADMIN: LIMPAR TODOS OS PEDIDOS CONCLUÍDOS/CANCELADOS GERAIS (SOFT DELETE)
// =======================================================
app.delete('/api/admin/pedidos/concluidos', async (req, res) => {
    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        // Pega TODOS os pedidos do banco que já terminaram e ainda não foram marcados como excluídos
        const [pedidos] = await conexao.query(`
            SELECT codigo_pedido FROM pedidos 
            WHERE (situacao = 'Finalizado' OR situacao = 'Cancelado')
              AND (excluido = FALSE OR excluido IS NULL)
        `);

        if (pedidos.length > 0) {
            const idsPedidos = pedidos.map(p => p.codigo_pedido);
            
            // Soft delete: Marca os pedidos como excluídos logicamente e atualiza o timestamp
            // Mantém os registros para análises no Power BI / Data Warehouse
            await conexao.query(`
                UPDATE pedidos 
                SET excluido = TRUE, data_hora_atualizacao = NOW() 
                WHERE codigo_pedido IN (?)
            `, [idsPedidos]);
        }

        await conexao.commit();
        res.json({ mensagem: "Limpeza global realizada com sucesso via soft delete!" });
    } catch (erro) {
        if (conexao) await conexao.rollback();
        console.error("Erro na limpeza global do admin:", erro);
        res.status(500).json({ erro: erro.message });
    } finally {
        if (conexao) conexao.release();
    }
});

//cd Padaria - Antigravity
//cd backend
//npm install express mysql2 cors
//node migrarProdutos.js (Apenas caso ja n tenha feito uma vez - Uma só vez é necessária)
//node server.js
