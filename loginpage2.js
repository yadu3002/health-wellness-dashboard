document.querySelectorAll('.role-item').forEach(item => {
    item.addEventListener('click', () => {
        const role = item.dataset.role;
        document.getElementById('step-select').classList.add('hidden');
        document.getElementById('step-login').classList.remove('hidden');
        document.getElementById('login-title').innerText = role + ' Login';
        
        // **NEW: Store the selected role in a data attribute on the login form for later use**
        document.getElementById('login-form').dataset.selectedRole = role; 
    });
});

// If this page is embedded in an iframe (index.html modal), remove the inner overlay styling
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embedded') === '1') {
        document.body.classList.add('embedded');
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('step-login').classList.add('hidden');
    document.getElementById('step-select').classList.remove('hidden');
});

function handleLogin() {
    const username = document.getElementById('username').value.toLowerCase().trim();
    let displayName = "";

    // Map usernames to Display Names
    if (username === 'wilkhoo') {
        displayName = "Dr. Wilkhoo";
    } else if (username === 'yadu') {
        displayName = "Yadu";
    } else {
        displayName = "Guest User";
    }

    // Save the name to the browser's memory
    localStorage.setItem('adminName', displayName);

    // Redirect to the admin page
    window.parent.location.href = 'adminpage.html'; 
}

// **NEW: Form Submission Handler**
document.getElementById('login-form').addEventListener('submit', (event) => {
    // 1. Prevent the default form submission (which causes the page reload)
    event.preventDefault(); 
    
    // 2. Get the selected role from the form's data attribute
    const selectedRole = event.currentTarget.dataset.selectedRole;

    // 2b. Store the typed username for showing it on the admin page
    const usernameInput = document.getElementById('username');
    const rawUsername = (usernameInput?.value || '').trim();
    if (rawUsername) {
        localStorage.setItem('loggedInUsername', rawUsername);
        // Backwards compatibility with existing admin page logic
        localStorage.setItem('adminName', rawUsername);
    }

    // 3. Determine the destination URL based on the role
    let destinationPage = '';
    
    // NOTE: I've added Corporate and Individual logic for completeness based on your role items
    switch (selectedRole) {
        case 'Admin':
            destinationPage = 'adminpage.html';
            break;
        case 'Corporate':
            destinationPage = 'corporatepage.html'; // Assuming this page exists
            break;
        case 'Individual':
            destinationPage = 'individualpage.html'; // Assuming this page exists
            break;
        default:
            console.error('Unknown role selected:', selectedRole);
            return; // Stop if no valid role is found
    }

    // 4. Navigate to the new page
    window.parent.location.href = destinationPage;
    
    // NOTE: In a real application, you would also perform an AJAX request here
    // to validate the user's credentials before redirecting.
});

// The rest of the unnecessary variable declarations have been removed for a cleaner file.