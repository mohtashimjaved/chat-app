import { supabaseclient, session, signoutfunc } from "./database.js";

let chatsArr;

localStorage.removeItem("senderEmail")
localStorage.removeItem("senderName")
let userObj = JSON.parse(localStorage?.getItem('userObj'))
let cachedUsers = null;

const toggleSidebar = (show = true) => {
    const listContainer = document.getElementById("list_container");
    const overlay = document.getElementById("sidebar_overlay");
    if (!listContainer || !overlay) return;

    if (show) {
        listContainer.classList.remove("hidden");
        overlay.classList.add("active");
    } else {
        listContainer.classList.add("hidden");
        overlay.classList.remove("active");
    }
}

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
    userObj = localStorageObj;
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

const showDeleteModal = (chats, index, id) => {
    const deleteModal = document.getElementById("delete_modal");
    const cancelDelete = document.getElementById("cancel_delete");
    const confirmDelete = document.getElementById("confirm_delete");

    deleteModal.style.display = "flex";
    document.body.style.overflow = "hidden";

    const closeModal = () => {
        deleteModal.style.display = "none";
        document.body.style.overflow = "auto";
        // Clean up listeners to avoid memory leaks/double triggers
        confirmDelete.onclick = null;
        cancelDelete.onclick = null;
    };

    confirmDelete.onclick = async () => {
        chats.splice(index, 1);
        await updateChatInDB(chats, id);
        closeModal();
    };

    cancelDelete.onclick = closeModal;

    // Close on backdrop click
    deleteModal.onclick = (e) => {
        if (e.target === deleteModal) closeModal();
    };
};

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

// Format time to HH:MM AM/PM
const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format date to Today, Yesterday, or Feb 1, 2026
const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    // Check if it's the same year
    if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const renderChatMessages = (chats, id) => {
    const userEmail = userObj?.userEmail;
    const messageList = document.getElementById("message_container")
    messageList.innerHTML = ""

    let lastDate = null;

    chats.forEach((chat, i) => {
        const isSentByMe = chat.email === userEmail;
        const msgId = `msg-${i}`;
        const currentMsgDate = formatDate(chat.timestamp);

        // Add date divider if day changed
        if (currentMsgDate !== lastDate) {
            messageList.innerHTML += `
                <div class="date-divider">
                    <span>${currentMsgDate}</span>
                </div>
            `;
            lastDate = currentMsgDate;
        }

        messageList.innerHTML += `
        <div class="message-wrapper ${isSentByMe ? "sent" : "received"}" id="wrapper-${i}"> 
            ${isSentByMe ? `
            <div class="message-actions">
                <button class="action-btn edit" id="edit-btn-${i}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" id="delete-btn-${i}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
            ` : ""}
            <div class="message-bubble">
                <span id="${msgId}" class="text-content">${chat.message}</span>
                <span class="message-time">${formatTime(chat.timestamp)}</span>
                ${chat.isEdited ? '<span class="edited-tag">Edited</span>' : ""}
                ${isSentByMe ? `
                    <span class="seen-indicator ${chat.seen ? "" : "not-seen"}">
                        ${chat.seen ? 'Seen' : 'Delivered'}
                    </span>
                ` : ""}
            </div>
        </div>
        `;
    })

    chats.forEach((chat, i) => {
        const isSentByMe = chat.email === userEmail;
        if (isSentByMe) {
            // Delete functionality
            document.getElementById(`delete-btn-${i}`).addEventListener("click", () => {
                showDeleteModal(chats, i, id);
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

// Mark messages from a specific user as seen
const markMessagesAsSeen = async (userEmail, senderEmail) => {
    const { data, error } = await supabaseclient
        .from("chats")
        .select()
        .or(`and(first_person.eq.${userEmail},second_person.eq.${senderEmail}),and(first_person.eq.${senderEmail},second_person.eq.${userEmail})`);

    if (error || !data || data.length === 0) return;

    const chatId = data[0].id;
    const chats = data[0].chats;
    let modified = false;

    chats.forEach(msg => {
        if (msg.email === senderEmail && !msg.seen) {
            msg.seen = true;
            modified = true;
        }
    });

    if (modified) {
        await supabaseclient
            .from('chats')
            .update({ chats: chats })
            .eq('id', chatId);
    }
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
    const userEmail = userObj?.userEmail;
    const listContainer = document.getElementById("list_container");
    if (!listContainer) return;

    // 1. Initialize stable structure if missing
    if (!listContainer.querySelector("#user_container")) {
        listContainer.innerHTML = `
            <div id="user_container">
                <div class="current-user-profile">
                    <h4 class="sidebar-label">My Profile</h4>
                    <div class="user-item current-user">
                        <i class="fas fa-user-circle profile-icon"></i>
                        <span class="user-name">${userObj.userName} (You)</span>
                    </div>
                </div>
                <h4 class="sidebar-label">Active Users</h4>
                <div id="other_user_list" class="user-list-group"></div>
            </div>
            <div class="logout-container">
                <button class="logout-btn" id="logout_btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
        setupLogoutModal();
        document.getElementById("sidebar_overlay")?.addEventListener("click", () => toggleSidebar(false));
    }

    const otherUserList = document.getElementById("other_user_list");

    // 2. Fetch data (Cashing users for speed)
    if (!cachedUsers) {
        cachedUsers = await fetchData('users');
    }
    const data = cachedUsers;
    if (!data) return;

    const allChats = await supabaseclient
        .from('chats')
        .select()
        .or(`first_person.eq.${userEmail},second_person.eq.${userEmail}`);

    const lastActivityMap = {};
    const unreadCounts = {};
    const lastMessageMap = {};

    if (allChats.data) {
        allChats.data.forEach(chat => {
            const other = chat.first_person === userEmail ? chat.second_person : chat.first_person;

            // Unread counts
            const unread = chat.chats.filter(msg => msg.email !== userEmail && !msg.seen).length;
            if (unread > 0) unreadCounts[other] = unread;

            // Last activity and message
            if (chat.chats.length > 0) {
                const latestMsg = chat.chats[chat.chats.length - 1];
                // Use timestamp if exists, otherwise use 1 to rank above 'no messages'
                lastActivityMap[other] = latestMsg.timestamp || 1;
                lastMessageMap[other] = latestMsg.message;
            } else {
                lastActivityMap[other] = 0;
            }
        });
    }

    // Sort data is no longer needed for rendering as we use flex 'order'
    // But we keep maps for the loop

    // 3. Update existing or Create new items (No-Glitch approach)
    data.forEach((user) => {
        if (user.email === userEmail) return;

        const safeEmail = user.email.replace(/[@.]/g, '_');
        let userItem = document.getElementById(`user-item-${safeEmail}`);
        const hasUnread = unreadCounts[user.email];
        const lastMsg = lastMessageMap[user.email] || "No messages yet";
        const activity = lastActivityMap[user.email] || 0;
        const timeStr = activity > 1 ? formatTime(activity) : "";

        if (!userItem) {
            const div = document.createElement("div");
            div.className = "user-item other-user";
            div.id = `user-item-${safeEmail}`;
            div.setAttribute("data-email", user.email);
            div.setAttribute("data-name", user.user_name);
            div.innerHTML = `
                <i class="fas fa-user user-icon"></i>
                <div class="user-info-text">
                    <div class="user-name-row">
                        <span class="user-name">${user.user_name}</span>
                        <span class="user-last-time">${timeStr}</span>
                    </div>
                    <span class="last-message">${lastMsg}</span>
                </div>
                <div class="dot-container">
                    ${hasUnread ? '<div class="notification-dot"></div>' : ""}
                </div>
            `;
            div.addEventListener("click", clickedUser);
            otherUserList.appendChild(div);
            userItem = div;
        } else {
            // Surgical updates to avoid flicker
            const msgSpan = userItem.querySelector(".last-message");
            if (msgSpan.innerText !== lastMsg) msgSpan.innerText = lastMsg;

            const timeSpan = userItem.querySelector(".user-last-time");
            if (timeSpan && timeSpan.innerText !== timeStr) timeSpan.innerText = timeStr;

            const dotContainer = userItem.querySelector(".dot-container");
            if (hasUnread) {
                if (!dotContainer.querySelector(".notification-dot")) {
                    dotContainer.innerHTML = '<div class="notification-dot"></div>';
                }
            } else {
                dotContainer.innerHTML = '';
            }
        }

        // Apply sorting via CSS 'order' (Higher timestamp = smaller negative order = top)
        userItem.style.order = activity ? -Math.floor(activity / 1000) : 0;
    });
}

// Granularly update unread dots without full re-render
const updateUnreadDots = async () => {
    const userEmail = userObj?.userEmail;
    if (!userEmail) return;

    const { data: allChats } = await supabaseclient
        .from('chats')
        .select()
        .or(`first_person.eq.${userEmail},second_person.eq.${userEmail}`);

    if (!allChats) return;

    const unreadCounts = {};
    allChats.forEach(chat => {
        const other = chat.first_person === userEmail ? chat.second_person : chat.first_person;
        const unread = chat.chats.filter(msg => msg.email !== userEmail && !msg.seen).length;
        if (unread > 0) unreadCounts[other] = unread;
    });

    // Find all user items and update their dots
    document.querySelectorAll('.user-item.other-user').forEach(item => {
        const email = item.getAttribute('data-email');
        const dotContainer = item.querySelector('.dot-container');
        if (!dotContainer) return;

        if (unreadCounts[email]) {
            if (!dotContainer.querySelector('.notification-dot')) {
                dotContainer.innerHTML = '<div class="notification-dot"></div>';
            }
        } else {
            dotContainer.innerHTML = '';
        }
    });
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
    <button class="mobile-nav-toggle" id="sidebar_toggle" title="Back to users">
        <i class="fas fa-chevron-left"></i>
    </button>
    <div class="header-info">
        <span class="chat-header-title">Connected with</span>
        <span class="active-sender-name">${senderName}</span>
    </div>
    `
    // Toggle back on mobile via the button
    document.getElementById("sidebar_toggle")?.addEventListener("click", () => toggleSidebar(true));

    // Hide sidebar on mobile after clicking a user
    if (window.innerWidth <= 768) toggleSidebar(false);
    inputContainer.innerHTML = `
    <textarea id="message" placeholder="Type a message..." rows="1"></textarea>
    <button id="send_btn" title="Send Message">
        <i class="fas fa-paper-plane"></i>
    </button>
    `

    const chatData = await fetchChats(userEmail, senderEmail);
    const sendBtn = document.getElementById("send_btn")
    const messageInput = document.getElementById('message')

    // Auto-resize textarea
    messageInput.addEventListener("input", function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        // Limit max height
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'auto';
            this.style.height = '150px';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    sendBtn.addEventListener("click", sendMessage)
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
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
        // Mark as seen when opening
        await markMessagesAsSeen(userEmail, senderEmail);
        updateUnreadDots(); // Hide dot immediately but gracefully
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
            message: messageInput.value.trim(),
            seen: false,
            timestamp: Date.now()
        }

        const sendFunction = await updateData(messageobj, userEmail, senderEmail)

        if (sendFunction && sendFunction.message) {
            alert("Message nahi bheja ja saka: " + sendFunction.message)
            return
        }

        messageInput.value = ""
        messageInput.style.height = 'auto'; // Reset height
        messageInput.style.overflowY = 'hidden';
        renderUser(); // Re-sort own list after sending
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
            async (payload) => {
                const activeSenderEmail = localStorage.getItem('senderEmail');
                if (activeSenderEmail && payload.new) {
                    const updatedChat = payload.new;
                    const isRelevant =
                        (updatedChat.first_person === userEmail && updatedChat.second_person === activeSenderEmail) ||
                        (updatedChat.first_person === activeSenderEmail && updatedChat.second_person === userEmail);

                    if (isRelevant) {
                        renderChatMessages(updatedChat.chats, updatedChat.id);
                        await markMessagesAsSeen(userEmail, activeSenderEmail);
                    }
                }

                // Update dots and re-sort list
                renderUser();
            }
        )
        .subscribe();
}

setupRealtime();

