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

    if (!logoutBtn || !logoutModal) return;

    // Open logout modal
    logoutBtn.addEventListener("click", () => {
        logoutModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });

    // Close modal when cancel is clicked
    cancelLogout.addEventListener("click", () => {
        logoutModal.style.display = "none";
        document.body.style.overflow = "auto";
    });

    // Close modal when clicking outside
    logoutModal.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && logoutModal.style.display === "flex") {
            logoutModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    confirmLogout.addEventListener("click", signoutfunc);
}

const fetchData = async (table) => {
    const getSession = await session();
    const currentEmail = getSession.session.user.email;
    const { data, error } = await supabaseclient
        .from(table)
        .select()
        .neq('email', currentEmail)
    console.log(currentEmail)
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
    const messageList = document.getElementById("message_container")
    messageList.innerHTML = ""

    chats.forEach((chat, i) => {
        const isSentByMe = chat.email === userEmail;
        const msgId = `msg-${i}`;

        messageList.innerHTML += `
        <div class="message-wrapper ${isSentByMe ? "sent" : "received"}" id="wrapper-${i}" style="animation-delay: ${i * 0.05}s"> 
            ${isSentByMe ? `
            <div class="message-actions">
                <button class="action-btn edit" id="edit-btn-${i}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" id="delete-btn-${i}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
            ` : ""}
            <span id="${msgId}" class="message-bubble">
                <span class="text-content">${chat.message}</span>
                ${chat.isEdited ? '<span class="edited-tag">Edited</span>' : ""}
            </span>
        </div>
        `;
    })

    chats.forEach((chat, i) => {
        const isSentByMe = chat.email === userEmail;
        if (isSentByMe) {
            // Delete functionality
            document.getElementById(`delete-btn-${i}`).addEventListener("click", async () => {
                if (!confirm("Are you sure you want to delete this message?")) return;
                chats.splice(i, 1)
                await updateChatInDB(chats, id);
            });

            // Edit functionality
            document.getElementById(`edit-btn-${i}`).addEventListener("click", () => {
                const messageSpan = document.getElementById(`msg-${i}`);
                const originalText = chat.message;

                messageSpan.innerHTML = `
                    <input type="text" class="edit-input" id="edit-input-${i}" value="${originalText}">
                    <div class="edit-actions">
                        <span class="edit-save" id="save-edit-${i}">Save</span>
                        <span class="edit-cancel" id="cancel-edit-${i}">Cancel</span>
                    </div>
                `;

                const input = document.getElementById(`edit-input-${i}`);
                input.focus();

                // Save on Enter
                input.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        document.getElementById(`save-edit-${i}`).click();
                    }
                });

                // Cancel on Escape
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Escape") {
                        document.getElementById(`cancel-edit-${i}`).click();
                    }
                });

                document.getElementById(`save-edit-${i}`).addEventListener("click", async () => {
                    const newText = input.value.trim();
                    if (newText && newText !== originalText) {
                        chats[i].message = newText;
                        chats[i].isEdited = true;
                        await updateChatInDB(chats, id);
                    } else {
                        renderChatMessages(chats, id);
                    }
                });

                document.getElementById(`cancel-edit-${i}`).addEventListener("click", () => {
                    renderChatMessages(chats, id);
                });
            });
        }
    })

    messageList.scrollTop = messageList.scrollHeight;
}

// Helper function to update database
const updateChatInDB = async (chats, id) => {
    const { data, error } = await supabaseclient
        .from('chats')
        .update({ chats: chats })
        .eq('id', id)
        .select()

    if (error) {
        console.error("Update Error:", error.message)
        alert("Failed to update message: " + error.message);
        return error
    }

    console.log("Update Success:", data)
    renderChatMessages(chats, id)
    return data
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
    setupLogoutModal();

    const userContainer = document.getElementById("user_container")

    const data = await fetchData('users')
    if (!data) return;

    userContainer.innerHTML = `
        <div class="current-user-profile">
            <h4 class="sidebar-label">My Profile</h4>
            <div class="user-item current-user">
                <i class="fas fa-user-circle profile-icon"></i>
                <span class="user-name">${userObj.userName} (You)</span>
            </div>
        </div>
        <h4 class="sidebar-label">Active Users</h4>
    `;

    data.forEach((user) => {
        if (user.email === userEmail) return; // Skip current user in the 'Active Users' list as they are shown above

        const displayName = user.user_name

        userContainer.innerHTML += `
        <div 
            class="user-item other-user" 
            data-email="${user.email}"  
            data-name="${displayName}"> 
            <i class="fas fa-user user-icon"></i>
            <span class="user-name">${displayName}</span>
        </div>
        `
    })

    const userDivs = document.querySelectorAll(".user-item:not(.current-user)")
    userDivs.forEach((div) => {
        div.addEventListener("click", clickedUser)
    })
}
// renderUser()

const clickedUser = async (event) => {
    const item = event.currentTarget.closest(".user-item");
    if (!item || item.classList.contains('current-user')) return;

    const senderEmail = item.getAttribute('data-email');
    const senderName = item.getAttribute('data-name');

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
    <div class="header-info">
        <span class="chat-header-title">Chatting with</span>
        <span class="active-sender-name">${senderName}</span>
    </div>
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
        }
    })

    if (!chatData || chatData.length === 0) {
        const result = await insertData('[]', userEmail, senderEmail);
        if (result && result.length > 0) {
            renderChatMessages(result[0].chats, result[0].id);
        } else {
            console.error("Failed to create new chat record.");
        }
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

