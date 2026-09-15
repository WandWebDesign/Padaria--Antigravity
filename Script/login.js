document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. VERIFICA SE O USUÁRIO JÁ ESTÁ LOGADO
    // ==========================================
    // Se ele já estiver logado, não tem motivo para estar na tela de Login.
    if (localStorage.getItem('usuarioLogado') === 'true') {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Você já está conectado! Redirecionando...');
        }
        // Manda de volta para a página inicial
        setTimeout(() => {
            window.location.href = 'padaria-landinpage.html';
        }, 1500);
        return; // Para a execução do script aqui, impedindo que o resto carregue
    }

    // ==========================================
    // 2. LÓGICA DE LOGIN COM O BANCO DE DADOS
    // ==========================================
    const formLogin = document.querySelector('.form-login');
    
    if (formLogin) {
        formLogin.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value.trim();

            if (email === '' || senha === '') {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                // Envia os dados digitados para a sua API Node.js testar no MySQL
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
                    localStorage.setItem('tipoUsuario', dados.tipo_usuario); // <--- SALVAMOS O CARGO AQUI
                    
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Login realizado com sucesso! Entrando...');
                    } else {
                        alert('Login realizado com sucesso!');
                    }

                    // Redirecionamento inteligente baseado no cargo do banco de dados
                    setTimeout(() => { 
                        if (dados.tipo_usuario === 'funcionario') {
                            window.location.href = 'Admin/Html/index-admin.html'; // Vai pro Painel
                        } else {
                            window.location.href = 'padaria-landinpage.html'; // Vai pra Loja
                        }
                    }, 1500); 

                } else {
                    // ERRO! O Banco de Dados não achou essa combinação de E-mail + Senha.
                    // Aqui entra a sua regra de pedir para ele se cadastrar.
                    const msgErro = 'E-mail ou senha incorretos. Se você ainda não tem uma conta, por favor, crie uma primeiro!';
                    
                    if (typeof mostrarToast === 'function') {
                        mostrarToast(msgErro);
                    } else {
                        alert(msgErro);
                    }
                }
            } catch (erro) {
                console.error("Erro ao conectar com a API:", erro);
                alert("Erro de conexão. Verifique se o servidor Back-end (Node.js) está rodando.");
            }
        });
    }
});

// =======================================================
// TRAVA DE SEGURANÇA NO ACESSO ADMIN
// =======================================================
document.getElementById('link-admin-seguro').addEventListener('click', function(e) {
    e.preventDefault(); // Impede o link de abrir a página direto

    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const estaLogado = localStorage.getItem('usuarioLogado');

    if (estaLogado === 'true' && tipoUsuario === 'funcionario') {
        // Se já está logado e é funcionário, libera a entrada
        window.location.href = 'Admin/Html/index-admin.html';
    } else {
        // Se não é, avisa e mantém na tela de login
        alert('Acesso Restrito: Apenas colaboradores autorizados podem acessar esta área. Faça login com suas credenciais de funcionário.');
    }
});
