// 🔥 CLEAN + FIXED VERSION
import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ChatService } from '../../../services/chat.service';
import { ChatStateService } from '../../../services/chat-state.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrls: ['./chat-window.css', '../../shared/styles/chat-base.css']
})
export class ChatWindow implements OnInit, OnDestroy {

  messages: any[] = [];

  senderId!: string;
  receiverId = '';

  message = '';
  selectedName = '';

  isOnline = false;
  isTyping = false;
  isLoading = false;

  activeMenuId: string | null = null;

  private msgSub!: Subscription;
  private routeSub!: Subscription;
  private typingTimeout: any;
  private signalRReady = false;

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private chat: ChatService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private chatState: ChatStateService
  ) {}

  // ================= INIT =================
  async ngOnInit() {
    this.senderId = String(localStorage.getItem('userId'));
    if (!this.senderId) return;

    await this.chat.startConnection();
    this.signalRReady = true;

    this.registerEvents();

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      this.receiverId = id ? String(id) : '';
      this.messages = [];
      this.isTyping = false;
      this.isLoading = !!id;

      if (!this.receiverId) return;

      this.chatState.activeChatUserId = this.receiverId;

      this.setSelectedName();
      this.listenOnlineStatus();
      this.loadChat();
    });
  }

  // ================= SIGNALR =================
  private registerEvents() {

    this.msgSub = this.chat.incomingMessage$.subscribe(msg => {
      this.zone.run(() => this.handleIncoming(msg));
    });

    this.chat.onUserTyping(id => {
      if (id === this.receiverId) {
        this.isTyping = true;
        this.refresh();
      }
    });

    this.chat.onUserStoppedTyping(id => {
      if (id === this.receiverId) {
        this.isTyping = false;
        this.refresh();
      }
    });
  }

  // ================= HANDLE =================
  private handleIncoming(msg: any) {

    // CLEAR
    if (msg.type === 'clear') {
      if (msg.otherUserId === this.receiverId) {
        this.messages = [];
        this.refresh();
      }
      return;
    }

    // DELETE
    if (msg.type === 'delete') {
      const m = this.messages.find(x => x.messageId === msg.messageId);
      if (m) {
        m.status = 1;
        m.messageText = 'This message was deleted';
        this.activeMenuId = null;
        this.refresh();
      }
      return;
    }

    // NORMAL MESSAGE
    msg.senderId = String(msg.senderId);
    msg.receiverId = String(msg.receiverId);
    msg.status = msg.status ?? 0;

    const isChat =
      (msg.senderId === this.receiverId && msg.receiverId === this.senderId) ||
      (msg.senderId === this.senderId && msg.receiverId === this.receiverId);

    if (!isChat) return;

    const index = this.messages.findIndex(
      m => m.clientTempId && m.clientTempId === msg.clientTempId
    );

    if (index !== -1) {
      this.messages[index] = { ...msg, clientTempId: null };
    } else {
      this.messages.push({ ...msg, clientTempId: null });
    }

    this.refresh();
    this.scrollToBottom();

    if (msg.receiverId === this.senderId) {
      this.chat.markMessageSeen(msg.messageId, msg.senderId);
    }
  }

  // ================= SEND =================
  async send() {
    if (!this.message.trim() || !this.signalRReady || !this.receiverId) return;

    const text = this.message;
    const tempId = crypto.randomUUID();

    const tempMsg = {
      clientTempId: tempId,
      messageId: null,
      senderId: this.senderId,
      receiverId: this.receiverId,
      messageText: text,
      sentAt: new Date(),
      status: 0 // 🔥 NORMAL
    };

    this.messages = [...this.messages, tempMsg];
    this.scrollToBottom();

    this.message = '';
    this.refresh();

    await this.chat.sendMessage(
      this.senderId,
      this.receiverId,
      text,
      tempId
    );
  }

  // ================= LOAD =================
  loadChat() {
    this.chat.getHistory(this.senderId, this.receiverId).subscribe({
      next: msgs => {
        this.messages = msgs.map(m => ({
          ...m,
          senderId: String(m.senderId),
          receiverId: String(m.receiverId),
          status: m.status ?? 0
        }));

        this.isLoading = false;
        this.refresh();
        this.scrollToBottom();
      },
      error: () => (this.isLoading = false)
    });
  }

  // ================= HEADER =================
  private setSelectedName() {
    const users = this.route.snapshot.parent?.data?.['users'];
    const user = users?.find((u: any) => String(u.userId) === this.receiverId);

    this.selectedName = user?.userName ?? 'Chat';
    this.isOnline = !!user?.isOnline;
  }

  private listenOnlineStatus() {
    this.chat.onlineUsers$.subscribe(users => {
      this.isOnline = users.includes(this.receiverId);
      this.refresh();
    });
  }

  // ================= MENU =================
  toggleMenu(id: string) {
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  getMenuKey(msg: any) {
    return msg.messageId ?? msg.clientTempId;
  }

  // ================= DELETE =================
  deleteMessage(msg: any) {
    if (!msg.messageId) return;
    if (!confirm('Delete this message?')) return;

    this.chat.deleteMessageRealtime(msg.messageId);
  }

  // ================= CLEAR =================
  clearChat() {
    if (!this.receiverId) return;
    if (!confirm('Clear chat?')) return;

    this.chat.clearChatRealtime(this.receiverId);
  }

  // ================= TYPING =================
  onTyping() {
    if (!this.receiverId) return;

    this.chat.sendTyping(this.senderId, this.receiverId);

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chat.stopTyping(this.senderId, this.receiverId);
    }, 800);
  }

  // ================= HELPERS =================
  private refresh() {
    this.messages = [...this.messages];
    this.cdr.detectChanges();
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.chatBody?.nativeElement?.scrollTo({
        top: this.chatBody.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 0);
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.msgSub?.unsubscribe();
    this.chatState.activeChatUserId = null;
  }
}