import {supabaseclient, session } from "./database.js";

// Initialize session check
const checkSession = async () => {
    const getSession = await session();
    if (getSession.session) {
        window.location.href = "/"
    }
}
checkSession();


const email = document.getElementById("email");
const password = document.getElementById("password");
const modifyText = document.getElementById("modify_text");
const loginBtn = document.getElementById("login_btn");


async function login() {

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    await signin(email.value, password.value);


    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
}

async function signin(email, password) {
    const { data, error } = await supabaseclient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error(error.message);
        modifyText.classList.add('error', 'shake');
        modifyText.innerText = error.message;
        setTimeout(() => { modifyText.classList.remove('shake'); }, 600);
        return error;
    }

    modifyText.classList.remove('error', 'shake');
    modifyText.classList.add('success');
    modifyText.innerText = "Login Successful! Redirecting...";

    setTimeout(() => {
        window.location.href = "/";
    }, 1500);
    return data;
}
loginBtn.addEventListener('click', login)