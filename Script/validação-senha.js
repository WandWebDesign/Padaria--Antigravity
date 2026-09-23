/* =======================================================
   VALIDAÇÃO E REDEFINIÇÃO REAL DE SENHA VIA API
======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form-esqueceu');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmar-senha').value;
            const btnSubmit = form.querySelector('.btn-salvar');

            if (!email) {
                if (typeof mostrarToast === 'function') mostrarToast('Informe o seu e-mail cadastrado.');
                else alert('Informe o seu e-mail cadastrado.');
                return;
            }

            // Validação 1: Tamanho mínimo
            if (senha.length < 8) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('A senha deve ter no mínimo 8 caracteres.');
                } else {
                    alert('A senha deve ter no mínimo 8 caracteres.');
                }
                return;
            }

            // Validação 2: Coincidência de senhas
            if (senha !== confirmarSenha) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('As senhas não coincidem. Verifique novamente.');
                } else {
                    alert('As senhas não coincidem.');
                }
                return;
            }

            // Estado de carregamento
            const textoOriginal = btnSubmit ? btnSubmit.innerText : 'Salvar Nova Senha';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Salvando...';
            }

            try {
                const resposta = await fetch('/api/redefinir-senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, novaSenha: senha })
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(dados.erro || 'Falha ao redefinir a senha.');
                }

                if (typeof mostrarToast === 'function') {
                    mostrarToast('✅ Senha alterada com sucesso! Redirecionando...');
                } else {
                    alert('Senha alterada com sucesso!');
                }

                setTimeout(() => {
                    window.location.href = 'padaria-login.html';
                }, 2000);

            } catch (erro) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('❌ ' + erro.message);
                } else {
                    alert(erro.message);
                }
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = textoOriginal;
                }
            }
        });
    }
});
