import { supabaseclient, session, signoutfunc } from "./database.js";

let chatsArr;

localStorage.removeItem("senderEmail")
localStorage.removeItem("senderName")
const userObj = JSON.parse(localStorage?.getItem('userObj'))

const checkSession = async () => {
    const getSession = await session();
    if (!getSession.session) {
        window.location.href = "/login.html";
        return
    }
    const localStorageObj = {
        userEmail: getSession.session.user.email,
        userName: getSession.session.user.user_metadata.name
    }
    console.log(localStorageObj);

    localStorage.setItem("userObj", JSON.stringify(localStorageObj))
    renderUser()
}
checkSession();

const setupLogoutModal = () => {
    const logoutBtn = document.getElementById("logout_btn");
    const logoutModal = document.getElementById("logout_modal");
    const cancelLogout = document.getElementById("cancel_logout");
    const confirmLogout = document.getElementById("confirm_logout");

    // Open logout modal
    logoutBtn.addEventListener("click", () => {
        logoutModal.style.display = "flex";
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    });

    // Close modal when cancel is clicked
    cancelLogout.addEventListener("click", () => {
        logoutModal.style.display = "none";
        document.body.style.overflow = "auto"; // Restore scrolling
    });

    // Close modal when clicking outside the modal content
    logoutModal.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && logoutModal.style.display === "flex") {
            logoutModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    confirmLogout.addEventListener("click", signoutfunc)
}

const fetchData = async (table, currentEmail) => {
    const { data, error } = await supabaseclient
        .from(table)
        .select()
        .neq('email', currentEmail)
    if (error) {
        console.error(error.message)
        return
    }
    console.log("Users Fetched:", data)
    return data
}

const fetchChats = async (user1, user2) => {
    const { data, error } = await supabaseclient
        .from("chats")
        .select()
        .or(`and(first_person.eq.${user1},second_person.eq.${user2}),and(first_person.eq.${user2},second_person.eq.${user1})`);

    if (error) {
        console.error("Fetch Chats Error:", error.message)
        return null
    }

    if (data && data.length > 0) {
        chatsArr = data[0].chats;
    } else {
        chatsArr = [];
    }

    console.log("Chats Fetched:", data)
    return data
}


const insertData = async (message, first_person, second_person) => {
    const { data, error } = await supabaseclient
        .from('chats')
        .insert({ chats: JSON.parse(message), first_person: first_person, second_person: second_person })
        .select()
    if (error) {
        console.error("Insert Error:", error.message)
        return error
    }

    console.log("Insert Success:", data)
    return data
}

const updateData = async (newMessageObj, userEmail, senderEmail) => {
    const chatData = await fetchChats(userEmail, senderEmail);

    if (!chatData || chatData.length === 0) {
        console.error("Chat record not found for update.");
        return { message: "Chat record not found" };
    }

    const chatId = chatData[0].id;
    const currentChats = chatData[0].chats;

    currentChats.push(newMessageObj);
    const { data, error } = await supabaseclient
        .from('chats')
        .update({ chats: currentChats })
        .eq('id', chatId)
        .select()

    if (error) {
        console.error("Update Error:", error.message)
        return error
    }

    console.log("Update Success:", data)
    return data
}


const renderChatMessages = (chats, id) => {
    const userEmail = userObj?.userEmail;
    // console.log(userEmail);

    const userName = localStorage.getItem('userName');
    // const container = document.getElementById("chat_container")

    // const existingList = document.getElementById('message_container');
    // if (existingList) existingList.remove();

    const messageList = document.getElementById("message_container")
    messageList.innerHTML = ""
    chats.map((chat, i) => {
        const isSentByMe = chat.email === userEmail;
        messageList.innerHTML += `
        <div id=chat${i} style="text-align: ${isSentByMe ? "right" : "left"}; margin: 5px 0;"> 
        <span style="display: inline-block; padding: 8px 12px; border-radius: 10px; background-color: ${isSentByMe ? "#c6e9f8ff" : "#E5E5EA"}; color: #000;">
                ${chat.message}
                </span>
        </div>
        <div id="delete${i}" style="display: none; background-color: black">delete message</div>
        `;
    })
    chats.forEach((chat, i) => {
        document.getElementById(`chat${i}`).addEventListener("click", () => {
            document.getElementById(`delete${i}`).style.display = "block"
        })
        document.getElementById(`delete${i}`).addEventListener("click", async () => {
            chats.splice(i, 1)
            const { data, error } = await supabaseclient
                .from('chats')
                .update({
                    chats: chats
                })
                .eq('id', id)
                .select()

            if (error) {

                console.error("Update Error:", error.message)
                return error
            }

            console.log("Update Success:", data)
            renderChatMessages(chats, id)
            return data
        })
    })


    messageList.scrollTop = messageList.scrollHeight;
}


const renderUser = async () => {
    const userEmail = userObj?.userEmail
    console.log(userObj, userEmail);

    const listContainer = document.getElementById("list_container")

    listContainer.innerHTML = `
        <div id="user_container"></div>
        <div class="logout-container">
            <button class="logout-btn" id="logout_btn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    
    `
    document.getElementById("logout_btn").addEventListener("click", setupLogoutModal)

    const userContainer = document.getElementById("user_container")

    const data = await fetchData('users', userEmail)
    if (!data) return;

    userContainer.innerHTML = '<h4>Active Users:</h4>';

    data.forEach((user) => {
        const displayName = user.user_name

        userContainer.innerHTML += `
        <div 
            style="border: 1px solid #ccc; padding: 5px; margin-bottom: 5px; cursor: pointer;" 
            class="user-item" 
            data-email="${user.email}"  
            data-name="${displayName}"> 
            ${displayName} 
        </div>
        `
    })

    const userDivs = document.querySelectorAll(".user-item")
    userDivs.forEach((div) => {
        div.addEventListener("click", clickedUser)
    })
}
// renderUser()

const clickedUser = async (event) => {
    const senderEmail = event.target.getAttribute('data-email');
    const senderName = event.target.getAttribute('data-name');

    localStorage.setItem("senderEmail", senderEmail)
    localStorage.setItem("senderName", senderName)

    localStorage.setItem("senderEmail", senderEmail)
    const userEmail = userObj?.userEmail

    const container = document.getElementById('chat_container')

    container.innerHTML = `
    <div id="chat_with"></div>
    <div id="message_container"></div>
    <div id="input_container"></div>
    `

    const chatWith = document.getElementById("chat_with");
    const inputContainer = document.getElementById("input_container");

    chatWith.innerHTML = `
    <h4 style="border-bottom: 1px solid #eee; padding-bottom: 10px; ">Chatting with: <p style="text-transfrom: Capitalize; margin-left: 5px;">${senderName}
    </p></h4>
    `
    inputContainer.innerHTML = `
    <input type="text" id="message" placeholder="Send a message">
    <button id="send_btn">Send Message</button>
    `

    const chatData = await fetchChats(userEmail, senderEmail);
    const sendBtn = document.getElementById("send_btn")
    const messageInput = document.getElementById('message')

    sendBtn.addEventListener("click", sendMessage)
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendBtn.click()
            console.log('enter');
        }
    })
    if (!chatData || chatData.length === 0) {
        await insertData('[]', userEmail, senderEmail);
        console.log("New empty chat record inserted.");
        console.log(chatData);

        renderChatMessages(chatData[0].chats, chatData[0].id);

    } else {
        renderChatMessages(chatData[0].chats, chatData[0].id);
    }
}


const sendMessage = async () => {
    const userEmail = userObj?.userEmail
    const senderEmail = localStorage.getItem("senderEmail")
    const sendBtn = document.getElementById("send_btn")
    const messageInput = document.getElementById('message')

    if (!senderEmail) {
        alert("Pehle chat shuru karne ke liye kisi user par click karein.");
        return;
    }

    if (messageInput.value.trim() !== "") {
        const messageobj = {
            email: userEmail,
            message: messageInput.value.trim()
        }

        const sendFunction = await updateData(messageobj, userEmail, senderEmail)

        if (sendFunction && sendFunction.message) {
            alert("Message nahi bheja ja saka: " + sendFunction.message)
            return
        }

        messageInput.value = ""

    }
}
const setupRealtime = () => {
    const userEmail = userObj?.userEmail


    supabaseclient
        .channel('chat_updates')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'chats',
            },
            (payload) => {
                console.log('Realtime change received!', payload);

                const activeSenderEmail = localStorage.getItem('senderEmail');

                if (activeSenderEmail) {
                    const updatedChat = payload.new;

                    const isRelevant =
                        (updatedChat.first_person === userEmail && updatedChat.second_person === activeSenderEmail) ||
                        (updatedChat.first_person === activeSenderEmail && updatedChat.second_person === userEmail);

                    if (isRelevant) {
                        renderChatMessages(updatedChat.chats, updatedChat.id);
                    }
                }
            }
        )
        .subscribe();
}

setupRealtime();

