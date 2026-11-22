
async function register(e) {
  e.preventDefault();
  clearMsg('msg');

  try {
    await api('/auth/register', 'POST', {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    });

    showMsg('msg', 'Account created. Redirecting to log in...', 'success');

    setTimeout(() => {
      location.href = 'login.html';
    }, 1000);

  } catch (err) {
    showMsg('msg', err.message);
  }
}


async function login(e) {
  e.preventDefault();
  clearMsg('msg');

  try {
    const data = await api('/auth/login', 'POST', {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    });

    // Save the user's authentication token and details
    Auth.save(data.token, data.user);

    // Redirect according to the user's role
    switch (data.user.role) {
      case 'admin':
        location.href = 'admin.html';
        break;

      case 'organizer':
        location.href = 'organizer.html';
        break;

      case 'student':
      default:
        location.href = 'student.html';
        break;
    }

  } catch (err) {
    showMsg('msg', err.message);
  }
}
