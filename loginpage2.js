document.querySelectorAll('.role-item').forEach(item => {
    item.addEventListener('click', () => {
        const role = item.dataset.role;
        document.getElementById('step-select').classList.add('hidden');
        document.getElementById('step-login').classList.remove('hidden');
        document.getElementById('login-title').innerText = role + ' Login';
    });
});

document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('step-login').classList.add('hidden');
    document.getElementById('step-select').classList.remove('hidden');
});