document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.querySelector('.form-login');
    const msgStatus = document.getElementById('mensagem-status-login');
    const botaoLogin = document.querySelector('.botao-login');

    // ==========================================
    // 1. VERIFICA SE JÁ HÁ SESSÃO NO NAVEGADOR
    // ==========================================
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true';
    const emailAtual = localStorage.getItem('emailUsuario');

    if (estaLogado && emailAtual && msgStatus) {
        msgStatus.style.display = 'block';
        msgStatus.style.backgroundColor = '#e0f2fe';
        msgStatus.style.color = '#0369a1';
        msgStatus.style.border = '1px solid #bae6fd';
        msgStatus.innerHTML = `Sessão ativa detectada (${emailAtual}). Para trocar de conta, preencha abaixo ou <a href="#" id="btn-desconectar-rapido" style="color: #0284c7; text-decoration: underline; font-weight: 600;">clique aqui para sair</a>.`;

        const btnDesconectar = document.getElementById('btn-desconectar-rapido');
        if (btnDesconectar) {
            btnDesconectar.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('usuarioLogado');
                localStorage.removeItem('emailUsuario');
                localStorage.removeItem('tipoUsuario');
                msgStatus.style.display = 'none';
                if (typeof mostrarToast === 'function') {
                    mostrarToast('Sessão encerrada com sucesso.');
                }
            });
        }
    }

    // ==========================================
    // 2. LÓGICA DE LOGIN COM O BANCO DE DADOS
    // ==========================================
    if (formLogin) {
        formLogin.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            const inputEmail = document.getElementById('email');
            const inputSenha = document.getElementById('senha');

            const email = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
            const senha = inputSenha ? inputSenha.value.trim() : '';

            if (msgStatus) msgStatus.style.display = 'none';

            if (!email || !senha) {
                if (msgStatus) {
                    msgStatus.style.display = 'block';
                    msgStatus.style.backgroundColor = '#fee2e2';
                    msgStatus.style.color = '#b91c1c';
                    msgStatus.style.border = '1px solid #fecaca';
                    msgStatus.innerText = 'Por favor, preencha todos os campos.';
                } else {
                    alert('Por favor, preencha todos os campos.');
                }
                return;
            }

            const textoOriginalBotao = botaoLogin ? botaoLogin.innerText : 'Entrar';
            if (botaoLogin) {
                botaoLogin.innerText = 'Entrando...';
                botaoLogin.disabled = true;
            }

            try {
                const resposta = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, senha: senha })
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    // SUCESSO! Salva os dados no navegador
                    localStorage.setItem('usuarioLogado', 'true');
                    localStorage.setItem('emailUsuario', email);
                    localStorage.setItem('tipoUsuario', dados.tipo_usuario);
                    if (dados.nome) {
                        localStorage.setItem('nomeUsuario', dados.nome);
                    }

                    if (msgStatus) {
                        msgStatus.style.display = 'block';
                        msgStatus.style.backgroundColor = '#dcfce7';
                        msgStatus.style.color = '#15803d';
                        msgStatus.style.border = '1px solid #bbf7d0';
                        msgStatus.innerText = 'Login realizado com sucesso! Redirecionando...';
                    }

                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Login realizado com sucesso! Entrando...');
                    }

                    // Redirecionamento baseado no cargo
                    setTimeout(() => { 
                        if (dados.tipo_usuario === 'funcionario') {
                            window.location.href = 'Admin/Html/index-admin.html';
                        } else {
                            window.location.href = 'padaria-landinpage.html';
                        }
                    }, 1200); 

                } else {
                    const msgErro = dados.erro || 'E-mail ou senha incorretos. Verifique suas credenciais.';
                    
                    if (msgStatus) {
                        msgStatus.style.display = 'block';
                        msgStatus.style.backgroundColor = '#fee2e2';
                        msgStatus.style.color = '#b91c1c';
                        msgStatus.style.border = '1px solid #fecaca';
                        msgStatus.innerHTML = `${msgErro} <br><small>Esqueceu sua senha? <a href="padaria-esqueceu-senha.html" style="color: #b91c1c; text-decoration: underline; font-weight: 600;">Clique aqui para recuperá-la</a>.</small>`;
                    }

                    if (typeof mostrarToast === 'function') {
                        mostrarToast(msgErro);
                    }
                }
            } catch (erro) {
                console.error("Erro ao conectar com a API:", erro);
                if (msgStatus) {
                    msgStatus.style.display = 'block';
                    msgStatus.style.backgroundColor = '#fee2e2';
                    msgStatus.style.color = '#b91c1c';
                    msgStatus.style.border = '1px solid #fecaca';
                    msgStatus.innerText = 'Erro ao conectar ao servidor. Verifique se o Back-end está ativo.';
                } else {
                    alert("Erro de conexão. Verifique se o servidor Back-end está rodando.");
                }
            } finally {
                if (botaoLogin) {
                    botaoLogin.innerText = textoOriginalBotao;
                    botaoLogin.disabled = false;
                }
            }
        });
    }

    // =======================================================
    // TRAVA DE SEGURANÇA NO ACESSO ADMIN
    // =======================================================
    const linkAdmin = document.getElementById('link-admin-seguro');
    if (linkAdmin) {
        linkAdmin.addEventListener('click', function(e) {
            e.preventDefault();

            const tipoUsuario = localStorage.getItem('tipoUsuario');
            const estaLogado = localStorage.getItem('usuarioLogado');

            if (estaLogado === 'true' && tipoUsuario === 'funcionario') {
                window.location.href = 'Admin/Html/index-admin.html';
            } else {
                alert('Acesso Restrito: Apenas colaboradores autorizados podem acessar esta área. Faça login com suas credenciais de funcionário.');
            }
        });
    }
});
