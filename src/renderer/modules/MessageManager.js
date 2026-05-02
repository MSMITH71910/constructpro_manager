/**
 * Message Manager for ConstructPro
 * Handles real-time messaging between team members
 */
class MessageManager {
    constructor() {
        this.messages = JSON.parse(localStorage.getItem('constructpro_messages') || '[]');
        this.contacts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('authStateChanged', () => {
            this.loadMessages();
        });
    }

    loadMessages() {
        this.messages = JSON.parse(localStorage.getItem('constructpro_messages') || '[]');
    }

    getMessagesBetween(user1Id, user2Id) {
        return this.messages.filter(m => 
            (m.fromId === user1Id && m.toId === user2Id) || 
            (m.fromId === user2Id && m.toId === user1Id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    sendMessage(fromId, toId, text) {
        const newMessage = {
            id: Date.now(),
            fromId,
            toId,
            text,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.messages.push(newMessage);
        this.saveMessages();
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('newMessage', { detail: newMessage }));
        return newMessage;
    }

    saveMessages() {
        localStorage.setItem('constructpro_messages', JSON.stringify(this.messages));
    }

    getUnreadCount(userId) {
        return this.messages.filter(m => m.toId === userId && !m.read).length;
    }

    markAsRead(fromId, toId) {
        this.messages.forEach(m => {
            if (m.fromId === fromId && m.toId === toId) {
                m.read = true;
            }
        });
        this.saveMessages();
    }
}

window.messageManager = new MessageManager();
