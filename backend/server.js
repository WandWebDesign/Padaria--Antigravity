require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Importante: usar a versão com /promise
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');

// Configuração do Multer para armazenamento em memória (processamento com Sharp)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Função utilitária para comprimir imagem para WebP ultraleve (Data URI)
async function comprimirParaBase64(buffer) {
    try {
        const webpBuffer = await sharp(buffer)
            .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        return `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    } catch (err) {
        console.error('Erro ao comprimir imagem com sharp, usando buffer original:', err);
        return `data:image/webp;base64,${buffer.toString('base64')}`;
    }
}

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
// ROTA DE CADASTRO (Com Transação e Hash Bcrypt)
// ==========================================
app.post('/api/cadastro', async (req, res) => {
    let conn;
    try {
        const { nome, email, senha, telefone, cpf } = req.body;
        if (!email || !senha || !nome) {
            return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
        }

        conn = await db.getConnection();
        await conn.beginTransaction();

        // Verifica se o e-mail já existe
        const [existe] = await conn.query("SELECT codigo_usuario FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (existe.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        // Criptografa a senha com hash seguro
        const hashSenha = await bcrypt.hash(senha, 10);

        const [result] = await conn.query(
            "INSERT INTO usuarios (email, senha, tipo_usuario) VALUES (?, ?, 'cliente')", 
            [email, hashSenha]
        );
        const codigo_usuario = result.insertId;
        
        await conn.query(
            "INSERT INTO clientes (codigo_usuario, cpf, nome, telefone) VALUES (?, ?, ?, ?)", 
            [codigo_usuario, cpf || '', nome, telefone || '']
        );

        await conn.commit();
        res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Erro no cadastro:", err);
        res.status(500).json({ erro: 'Erro ao processar o cadastro no servidor.' });
    } finally {
        if (conn) conn.release();
    }
});

// ==========================================
// ROTA DE LOGIN (Suporte Híbrido: Bcrypt + Auto-migração)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
        }

        const [results] = await db.query(
            `SELECT u.codigo_usuario, u.email, u.senha, u.tipo_usuario, c.nome 
             FROM usuarios u 
             LEFT JOIN clientes c ON u.codigo_usuario = c.codigo_usuario 
             WHERE u.email = ? LIMIT 1`, 
            [email]
        );
        
        if (results.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha incorretos.' });
        }

        const usuario = results[0];
        let senhaValida = false;

        // Se for um hash bcrypt
        if (usuario.senha && (usuario.senha.startsWith('$2a$') || usuario.senha.startsWith('$2b$') || usuario.senha.startsWith('$2y$'))) {
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } else {
            // Senha legada em texto plano
            if (usuario.senha === senha) {
                senhaValida = true;
                // Migração transparente automática: gera hash e salva no banco!
                try {
                    const novoHash = await bcrypt.hash(senha, 10);
                    await db.query("UPDATE usuarios SET senha = ? WHERE codigo_usuario = ?", [novoHash, usuario.codigo_usuario]);
                } catch (eMigracao) {
                    console.error("Falha ao migrar senha legada:", eMigracao);
                }
            }
        }

        if (senhaValida) {
            res.status(200).json({ 
                mensagem: 'Login efetuado!', 
                tipo_usuario: usuario.tipo_usuario,
                email: usuario.email,
                nome: usuario.nome || usuario.email.split('@')[0]
            });
        } else {
            res.status(401).json({ erro: 'Email ou senha incorretos.' });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// ==========================================
// ROTA DE REDEFINIÇÃO DE SENHA REAL
// ==========================================
app.post('/api/redefinir-senha', async (req, res) => {
    try {
        const { email, novaSenha } = req.body;
        if (!email || !novaSenha) {
            return res.status(400).json({ erro: 'E-mail e nova senha são obrigatórios.' });
        }
        if (novaSenha.length < 8) {
            return res.status(400).json({ erro: 'A senha deve conter no mínimo 8 caracteres.' });
        }

        const [usuarios] = await db.query("SELECT codigo_usuario FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (usuarios.length === 0) {
            return res.status(404).json({ erro: 'Nenhuma conta encontrada com este e-mail.' });
        }

        const hash = await bcrypt.hash(novaSenha, 10);
        await db.query("UPDATE usuarios SET senha = ? WHERE email = ?", [hash, email]);

        res.status(200).json({ mensagem: 'Senha atualizada com sucesso!' });
    } catch (err) {
        console.error("Erro ao redefinir senha:", err);
        res.status(500).json({ erro: 'Erro ao processar a redefinição de senha.' });
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
                const dataUri = await comprimirParaBase64(file.buffer);
                await db.query('INSERT INTO imagens_produtos (codigo_produto, imagem_url) VALUES (?, ?)', [codigoProduto, dataUri]);
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
                const dataUri = await comprimirParaBase64(file.buffer);
                await db.query('INSERT INTO imagens_produtos (codigo_produto, imagem_url) VALUES (?, ?)', [req.params.id, dataUri]);
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
    const { cliente, dataPedido, pagamento, itens } = req.body;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ erro: "Dados do pedido ausentes." });
    }

    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const dataPedidoSQL = converterDataParaMySQL(dataPedido) || new Date().toISOString().split('T')[0];

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

        // 2. Agrupa os itens por data e hora de retirada
        const gruposPedidos = {};
        for (let item of itens) {
            const chaveGrupo = `${item.dataRetirada}_${item.horaRetirada}`;
            if (!gruposPedidos[chaveGrupo]) {
                gruposPedidos[chaveGrupo] = {
                    dataRetirada: item.dataRetirada,
                    horaRetirada: item.horaRetirada,
                    itens: []
                };
            }
            gruposPedidos[chaveGrupo].itens.push(item);
        }

        const idsPedidosGerados = [];
        let totalPagoGeral = 0;

        // 3. Validação de Agendamento no Backend (Regra de Negócio: retirada a partir de amanhã, 07:30 às 20:00)
        for (let chave in gruposPedidos) {
            const grupo = gruposPedidos[chave];
            if (!grupo.dataRetirada || !grupo.horaRetirada) {
                throw new Error("Data e horário de retirada são obrigatórios para todos os itens.");
            }
            
            const dataRetFormatada = converterDataParaMySQL(grupo.dataRetirada);
            const hojeStr = new Date().toISOString().split('T')[0];
            if (dataRetFormatada < hojeStr) {
                throw new Error(`Data de retirada inválida (${grupo.dataRetirada}). Não é permitido agendar no passado.`);
            }

            const partesHora = grupo.horaRetirada.split(':');
            const h = parseInt(partesHora[0], 10);
            const m = parseInt(partesHora[1] || '0', 10);
            const minDoDia = h * 60 + m;
            if (minDoDia < (7 * 60 + 30) || minDoDia > (20 * 60)) {
                throw new Error(`Horário de retirada ${grupo.horaRetirada} fora do expediente (07:30 às 20:00).`);
            }
        }

        // 4. Processa cada grupo como um pedido independente
        for (let chave in gruposPedidos) {
            const grupo = gruposPedidos[chave];
            let totalCalculado = 0;
            const itensValidados = [];

            // Valida itens, recalcula total e desconta estoque (com bloqueio FOR UPDATE)
            for (let item of grupo.itens) {
                const nomeItem = item.nome || item.tituloproduto; 
                const qtde = item.quantidade || 1;

                const [buscaProduto] = await conexao.query(
                    `SELECT codigo_produto, valor, preco_oferta, quantidade_estoque FROM produtos WHERE nome = ? LIMIT 1 FOR UPDATE`, 
                    [nomeItem]
                );
                
                if (buscaProduto.length === 0) {
                    throw new Error(`O produto '${nomeItem}' não existe no banco de dados!`);
                }

                const produtoDB = buscaProduto[0];
                
                if (produtoDB.quantidade_estoque < qtde) {
                    throw new Error(`Estoque insuficiente para '${nomeItem}'. Pedido: ${qtde}, Estoque: ${produtoDB.quantidade_estoque}`);
                }

                const precoUnit = (produtoDB.preco_oferta && produtoDB.preco_oferta > 0) ? produtoDB.preco_oferta : produtoDB.valor;
                const subtotal = precoUnit * qtde;
                totalCalculado += subtotal;

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

            // Insere o Pedido
            const dataRetiradaSQL = converterDataParaMySQL(grupo.dataRetirada);
            const horaRetirada = grupo.horaRetirada;
            
            // Gera um código único baseado no timestamp para este sub-pedido
            const codigo = 'PED-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 100);

            const sqlPedido = `
                INSERT INTO pedidos 
                (codigo_cliente, situacao, total, data_pedido, data_hora_atualizacao, data_retirada, hora_retirada, codigo_retirada, forma_pagto, excluido) 
                VALUES (?, 'Pendente', ?, NOW(), NOW(), ?, ?, ?, ?, FALSE)`;

            const [resultadoPedido] = await conexao.query(sqlPedido, [
                idCliente, totalCalculado, dataRetiradaSQL, horaRetirada, codigo, pagamento
            ]);
            const idPedidoGerado = resultadoPedido.insertId;
            idsPedidosGerados.push(codigo);
            totalPagoGeral += totalCalculado;

            // Insere os Itens do Pedido na tabela auxiliar
            const sqlItens = `INSERT INTO itens_pedidos (codigo_pedido, codigo_produto, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`;
            for (let itemVal of itensValidados) {
                await conexao.query(sqlItens, [idPedidoGerado, itemVal.idProduto, itemVal.qtde, itemVal.precoUnit, itemVal.subtotal]);
            }
        }

        // Salva a transação e finaliza
        await conexao.commit();
        res.status(201).json({ 
            mensagem: "Pedido(s) gravado(s) com sucesso!", 
            pedidosGerados: idsPedidosGerados, 
            totalPago: totalPagoGeral 
        });

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
// 3. ROTA: ATUALIZAR STATUS, SALVAR JUSTIFICATIVA E ESTORNAR ESTOQUE
// =======================================================
app.put('/api/pedidos/:codigo/status', async (req, res) => {
    const { codigo } = req.params;
    const { status, justificativa } = req.body; 

    let conexao;
    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        // 1. Busca o pedido atual para verificar o status anterior e obter o ID numérico
        const campoBusca = isNaN(codigo) ? 'codigo_retirada' : 'codigo_pedido';
        const [pedidos] = await conexao.query(
            `SELECT codigo_pedido, situacao FROM pedidos WHERE ${campoBusca} = ? FOR UPDATE`,
            [codigo]
        );

        if (pedidos.length === 0) {
            await conexao.rollback();
            return res.status(404).json({ erro: 'Pedido não encontrado.' });
        }

        const pedidoAtual = pedidos[0];
        const statusAnterior = pedidoAtual.situacao;

        // 2. Se o status está mudando para 'Cancelado' e NÃO estava cancelado antes: ESTORNA O ESTOQUE!
        if (status === 'Cancelado' && statusAnterior !== 'Cancelado') {
            const [itens] = await conexao.query(
                `SELECT codigo_produto, quantidade FROM itens_pedidos WHERE codigo_pedido = ?`,
                [pedidoAtual.codigo_pedido]
            );

            for (const item of itens) {
                await conexao.query(
                    `UPDATE produtos SET quantidade_estoque = quantidade_estoque + ? WHERE codigo_produto = ?`,
                    [item.quantidade, item.codigo_produto]
                );
            }
            console.log(`📦 [ESTOQUE ESTORNADO] Pedido #${pedidoAtual.codigo_pedido} cancelado. ${itens.length} itens devolvidos ao estoque.`);
        } 
        // Se por ventura um pedido cancelado for reativado
        else if (statusAnterior === 'Cancelado' && status !== 'Cancelado') {
            const [itens] = await conexao.query(
                `SELECT codigo_produto, quantidade FROM itens_pedidos WHERE codigo_pedido = ?`,
                [pedidoAtual.codigo_pedido]
            );

            for (const item of itens) {
                await conexao.query(
                    `UPDATE produtos SET quantidade_estoque = GREATEST(0, quantidade_estoque - ?) WHERE codigo_produto = ?`,
                    [item.quantidade, item.codigo_produto]
                );
            }
            console.log(`📦 [ESTOQUE DEBITADO] Pedido #${pedidoAtual.codigo_pedido} reativado.`);
        }

        // 3. Atualiza o status do pedido
        const sql = `UPDATE pedidos SET situacao = ?, justificativa = ?, data_hora_atualizacao = NOW() WHERE codigo_pedido = ?`;
        await conexao.query(sql, [status, justificativa || null, pedidoAtual.codigo_pedido]);

        await conexao.commit();
        res.json({ mensagem: "Status do pedido modificado com sucesso!" });
    } catch (erro) {
        if (conexao) await conexao.rollback();
        console.error("Erro ao atualizar status:", erro);
        res.status(500).json({ erro: erro.message });
    } finally {
        if (conexao) conexao.release();
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

