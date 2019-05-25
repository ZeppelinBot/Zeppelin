const API_URL = process.env.API_URL;
document.getElementById('login-button').addEventListener('click', () => {
  window.location.href = `${API_URL}/auth/login`;
});
