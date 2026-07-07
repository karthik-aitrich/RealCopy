import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../services/chat.service';
import { GroupService } from '../../../services/group.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-chat.html',
  styleUrls: ['./group-chat.css', '../../shared/styles/chat-base.css']
})
export class GroupChat implements OnInit, OnDestroy {

  // ===== DATA =====
  messages: any[] = [];
  members: any[] = [];

  groupId!: string;
  senderId!: string;
  groupName = 'Group Chat';

  message = '';
  isLoading = false;
  isMember = false;

  activeMenuId: string | null = null;

  private routeSub!: Subscription;
  private msgSub!: Subscription;

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private chat: ChatService,
    private groupService: GroupService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // ===== INIT =====
  async ngOnInit() {
    this.senderId = String(localStorage.getItem('userId'));
    if (!this.senderId) return;

    await this.chat.startConnection();

    // 🔥 LISTEN REALTIME
    this.msgSub = this.chat.onGroupMessageReceived().subscribe(msg => {
      this.zone.run(() => this.handleIncoming(msg));
    });

    // 🔥 ROUTE CHANGE
    this.routeSub = this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (!id) return;

      if (this.groupId) {
        await this.chat.leaveGroup(this.groupId);
      }

      this.groupId = id;

      this.groupName = history.state?.groupName ?? 'Group Chat';
      console.log(this.groupName)

      this.messages = [];
      this.members = [];
      this.isLoading = true;

      await this.chat.joinGroup(this.groupId);

      this.loadMessages();
      this.loadMembers();
    });
  }

  // ===== RECEIVE =====
  private handleIncoming(msg: any) {
    // NORMAL MESSAGE
msg.senderId = String(msg.senderId);
    // 🔥 DELETE EVENT
    if (msg.type === 'group-delete') {

  const target = this.messages.find(m => m.messageId === msg.messageId);

  if (target) {
    target.isDeleted = true;
    target.messageText = 'This message was deleted';
  }
console.log('INCOMING:', msg);
  this.activeMenuId = null; // ✅ FORCE CLOSE MENU
  this.cdr.detectChanges();
  return;
}

    // 🔥 NORMAL MESSAGE
    if (msg.groupId?.toString() !== this.groupId) return;

    msg.senderId = String(msg.senderId);

    const index = this.messages.findIndex(
      m => m.clientTempId && m.clientTempId === msg.clientTempId
    );

    if (index !== -1) {
      this.messages[index] = { ...msg, clientTempId: null };
    } else {
      this.messages.push(msg);
    }

    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  // ===== SEND =====
  async send() {
    if (!this.message.trim()) return;

    const text = this.message;
    const tempId = crypto.randomUUID();

    const tempMsg = {
      clientTempId: tempId,
      messageId: null,
      senderId: this.senderId,
      senderName: 'You',
      messageText: text,
      sentAt: new Date(),
      isDeleted: false
    };

    this.messages.push(tempMsg); // ✅ NO ARRAY RECREATE
    this.scrollToBottom();

    this.message = '';
    this.cdr.detectChanges();

    await this.chat.sendGroupMessage(this.groupId, text, tempId);
  }

  // ===== LOAD =====
  loadMessages() {
    this.chat.getGroupHistory(this.groupId).subscribe({
      next: msgs => {
        this.messages = msgs.map(m => ({
          ...m,
          senderId: String(m.senderId)
        }));

        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => (this.isLoading = false)
    });
  }

  loadMembers() {
  this.groupService.getGroupMembers(this.groupId).subscribe({
    next: m => {
      this.members = m;

      this.isMember = this.members.some(
        x => String(x.userId) === String(this.senderId)
      );

      this.cdr.detectChanges();
    }
  });
}
  // ===== MENU =====
  getMenuKey(msg: any): string {
    return msg.messageId || msg.clientTempId;
  }

  toggleMenu(id: string) {
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  deleteMessage(msg: any) {
  if (!msg.messageId) return;

  this.chat.deleteGroupMessage(msg.messageId, this.groupId);
  this.activeMenuId = null;
}

  // ===== TRACKBY (CRITICAL 🔥) =====
  trackByMessage(index: number, msg: any): string {
    return msg.messageId || msg.clientTempId;
  }


  isMine(msg: any): boolean {
  return String(msg?.senderId) === String(this.senderId);
}
  // ===== HELPERS =====
  private scrollToBottom() {
    setTimeout(() => {
      this.chatBody?.nativeElement?.scrollTo({
        top: this.chatBody.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 0);
  }

  openGroupInfo() {
  this.router.navigate(
    ['/app/group-info', this.groupId],
    {
      state: {
        groupName: this.groupName
      }
    }
  );
}

  get membersCount(): number {
    return this.members.length;
  }

  // 🔥 CLOSE MENU ON OUTSIDE CLICK
  @HostListener('document:click')
  closeMenu() {
    this.activeMenuId = null;
  }

  // ===== DESTROY =====
  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.msgSub?.unsubscribe();

    if (this.groupId) {
      this.chat.leaveGroup(this.groupId);
    }
  }
}