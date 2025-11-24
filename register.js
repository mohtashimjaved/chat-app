import { supabaseclient, session } from "./database.js";

const checkSession = async () => {
    const getSession = await session();
    if (getSession.session) {
        window.location.href = "/"
    }
}
checkSession();
const fetchUsers = async (email) => {
    const { data, error } = await supabaseclient
        .from('users')
        .select()
        .eq('email', email)
    if (error) {
        console.log(error.message)
        return
    }
    console.log(data)
    return data
}

const insertData = async (email, username) => {
    const { data, error } = await supabaseclient
        .from('users')
        .insert({
            email: email,
            user_name: username
        })
        .select()
    if (error) {
        console.log(error.message)
        return error
    }
    console.log(data)
    return data
}

const username_r = document.getElementById("username");
const email_r = document.getElementById("email_r");
const password_r = document.getElementById("password_r");
const modifyText = document.getElementById("modify_text");
const registerBtn = document.getElementById("register_btn");

password_r.addEventListener('input', function () {
    const strengthIndicator = this.parentElement.querySelector('.password-strength');
    const passwordValue = this.value;

    strengthIndicator.className = 'password-strength';

    if (passwordValue.length > 0) {
        let strength = 0;
        if (passwordValue.length >= 8) strength++;
        if (/[a-z]/.test(passwordValue)) strength++;
        if (/[A-Z]/.test(passwordValue)) strength++;
        if (/[0-9]/.test(passwordValue)) strength++;
        if (/[^A-Za-z0-9]/.test(passwordValue)) strength++;

        if (strength <= 2) {
            strengthIndicator.classList.add('weak');
        } else if (strength <= 4) {
            strengthIndicator.classList.add('medium');
        } else {
            strengthIndicator.classList.add('strong');
        }
    }
});

async function register() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const validPass = passwordRegex.test(password_r.value);
    const validemail = emailRegex.test(email_r.value);

    registerBtn.classList.add('loading');
    registerBtn.disabled = true;

    let value_check;

    if (username_r.value === "") {
        modifyText.classList.add('error', 'shake');
        modifyText.innerText = "Please Enter A Valid Username";
        setTimeout(() => { modifyText.classList.remove('shake'); }, 600);
        username_r.focus();
        value_check = false;
    }
    else if (!validemail) {
        modifyText.classList.add('error', 'shake');
        modifyText.innerText = "Please Enter A Valid Email Address";
        setTimeout(() => { modifyText.classList.remove('shake'); }, 600);
        email_r.focus();
        value_check = false;
    }
    else if (!validPass) {
        modifyText.classList.add('error', 'shake');
        modifyText.innerText = "Password must contain at least 8 characters, including uppercase, lowercase, number and special character";
        setTimeout(() => { modifyText.classList.remove('shake'); }, 600);
        password_r.focus();
        value_check = false;
    }
    else {
        value_check = true;
    }

    if (value_check) {
        await signup(username_r.value, email_r.value, password_r.value);
    }

    registerBtn.classList.remove('loading');
    registerBtn.disabled = false;
}
registerBtn.addEventListener('click', register)

function emptyInputValues(name, email, password) {
    for (let i = 0; i < arguments.length; i++) {
        arguments[i].value = "";
    }
}

async function signup(username, email, password) {
    const { data, error } = await supabaseclient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                name: username
            }
        }
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
    modifyText.innerText = "User Registered Successfully! Redirecting to login...";

    emptyInputValues(username_r, email_r, password_r);

    setTimeout(() => {
        window.location.href = "/login.html";
    }, 2200);
    const checkExistingUsers = await fetchUsers(email)
    console.log(checkExistingUsers)
    if (!checkExistingUsers.length) {
        insertData(email, username)
    }

    return data;
}
