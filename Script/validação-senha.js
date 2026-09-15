/* =======================================================
   VALIDAÇÃO DE SENHA COM FEEDBACK MODERNO (TOAST)
======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form-esqueceu');

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmar-senha').value;

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

            // Sucesso
            if (typeof mostrarToast === 'function') {
                mostrarToast('Senha alterada com sucesso! Redirecionando...');
                
                setTimeout(() => {
                    window.location.href = 'padaria-login.html';
                }, 2000);
            } else {
                window.location.href = 'padaria-login.html';
            }
        });
    }
});