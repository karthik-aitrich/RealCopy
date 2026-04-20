  import { Injectable } from '@angular/core';
  import * as signalR from '@microsoft/signalr';
  import { HttpClient } from '@angular/common/http';
  import { BehaviorSubject, Subject } from 'rxjs';
  import { RealtimeChatMessage } from '../app/models/realtime-chat-message';


  @Injectable({ providedIn: 'root' })
  export class ChatService {

    private hubConnection!: signalR.HubConnection;
    private connectionPromise?: Promise<void>;

    private readonly hubUrl = 'http://localhost:5146/chatHub';
    private readonly apiUrl = 'http://localhost:5146/api/v1/chat';
    incomingMessage$ = new Subject<any>();

  onlineUsers$ = new BehaviorSubject<string[]>([]);


    private pingInterval?: any;


    private connectionReady = false;
    private isConnected = false;
    private messageListenerRegistered = false;



    constructor(private http: HttpClient) {}

    async startConnection(): Promise<void> {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        this.connectionReady = true;
        this.isConnected = true;
        return;
      }

      if (this.connectionPromise) {
        return this.connectionPromise;
      }

      this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(this.hubUrl, {
      accessTokenFactory: () => localStorage.getItem('token') || ''
    })
    .withAutomaticReconnect()
    .build();

  /* 🔥 ADD THESE EXACTLY HERE 🔥 */
  this.hubConnection.onreconnected(() => {
    console.log('[SignalR] Reconnected');
    this.startHeartbeat();
  });

  this.hubConnection.onclose(() => {
    console.log('[SignalR] Connection closed');
    this.stopHeartbeat();
  });
  /* 🔥 END 🔥 */

  this.connectionPromise = this.hubConnection
  .start()
  .then(() => {
    this.connectionReady = true;
    this.isConnected = true;

    // INITIAL ONLINE USERS
    this.hubConnection.on('OnlineUsers', (userIds: string[]) => {
      this.onlineUsers$.next(userIds);
    });

    // LIVE UPDATES
    this.hubConnection.on('UserOnline', (userId: string) => {
      const current = this.onlineUsers$.value;
      if (!current.includes(userId)) {
        this.onlineUsers$.next([...current, userId]);
      }
    });

    this.hubConnection.on('UserOffline', (userId: string) => {
      this.onlineUsers$.next(
        this.onlineUsers$.value.filter(id => id !== userId)
      );
    });

    this.registerReceiveMessage();
    this.startHeartbeat();

    console.log('[SignalR] Connected');
  });
    }



    clearChat(otherUserId: string) {
  return this.http.post(
    `${this.apiUrl}/clear/${otherUserId}`,
    {}
  );
}


clearChatRealtime(otherUserId: string) {
  return this.hubConnection.invoke(
    'ClearChat',
    otherUserId
  );
}

deleteMessageRealtime(messageId: string) {
  return this.hubConnection.invoke(
    'DeleteMessage',
    messageId
  );
}

deleteMessage(messageId: string) {
  return this.http.delete(
    `${this.apiUrl}/${messageId}`
  );
}

    private startHeartbeat() {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke('Ping')
          .catch(err => console.warn('Ping failed', err));
      }
    }, 10000); // every 10s
  }

    
  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }
  


    async stopConnection(): Promise<void> {
    if (!this.hubConnection) return;

    this.stopHeartbeat(); // 🔥 ADD
    await this.hubConnection.stop();

    this.connectionReady = false;
    this.isConnected = false;
    this.connectionPromise = undefined;

    console.log('[SignalR] Disconnected');
  }


    isReady(): boolean {
      return this.connectionReady;
    }

    isSignalRConnected(): boolean {
      return this.isConnected;
    }

  async sendMessage(
  senderId: string,
  receiverId: string,
  message: string,
  clientTempId: string   // 👈 add
) {
  return this.hubConnection.invoke(
    'SendMessage',
    senderId,
    receiverId,
    message,
    clientTempId   // 👈 pass
  );
}

private registerReceiveMessage() {
  if (this.messageListenerRegistered || !this.hubConnection) return;

  this.messageListenerRegistered = true;

  // 1-1 CHAT
  this.hubConnection.on('ReceiveMessage', (msg: any) => {
    this.incomingMessage$.next(msg);
  });

  // 🔥 GROUP CHAT (MISSING PART)
  this.hubConnection.on('ReceiveGroupMessage', (msg: any) => {
    console.log('👥 GROUP MESSAGE:', msg);
    this.groupMessage$.next(msg);
  });
  // 🗑 GROUP DELETE (ADD THIS)
this.hubConnection.on('GroupMessageDeleted', (data: any) => {
  console.log('🗑 GROUP DELETE:', data);

  this.groupMessage$.next({
    type: 'group-delete',
    messageId: data.messageId
  });
});

// 🧹 GROUP CLEAR (ADD THIS)
this.hubConnection.on('GroupChatCleared', (data: any) => {
  console.log('🧹 GROUP CLEAR:', data);

  this.groupMessage$.next({
    type: 'group-clear',
    groupId: data.groupId
  });
});
  // DELETE
  this.hubConnection.on('MessageDeleted', (data: any) => {
    this.incomingMessage$.next({
      type: 'delete',
      messageId: data.messageId
    });
  });

  // CLEAR
  this.hubConnection.on('ChatCleared', (data: any) => {
    this.incomingMessage$.next({
      type: 'clear',
      otherUserId: data.otherUserId
    });
  });
}

  //  private registerReceiveMessage() {
  // if (this.messageListenerRegistered || !this.hubConnection) return;

  // this.messageListenerRegistered = true;

  // // ✅ MAIN FIX (YOU WERE MISSING THIS)
  // this.hubConnection.on('ReceiveMessage', (msg: any) => {
  //   console.log('📩 MESSAGE RECEIVED:', msg);

  //   this.incomingMessage$.next(msg);
  // });

  // 🗑 DELETE
//   this.hubConnection.on('MessageDeleted', (data: any) => {
//     this.incomingMessage$.next({
//       type: 'delete',
//       messageId: data.messageId
//     });
//   });

//   // 🧹 CLEAR
//   this.hubConnection.on('ChatCleared', (data: any) => {
//     this.incomingMessage$.next({
//       type: 'clear',
//       otherUserId: data.otherUserId
//     });
//   });
// }




    getHistory(user1: string, user2: string) {
      return this.http.get<any[]>(
        `${this.apiUrl}/history/${user1}/${user2}`
      );
    }

    deleteGroupMessage(messageId: string, groupId: string) {
  return this.hubConnection.invoke('DeleteGroupMessage', messageId, groupId);
}

clearGroupChat(groupId: string) {
  return this.hubConnection.invoke('ClearGroupChat', groupId);
}

    // =====================================================
    // GROUP CHAT
    // =====================================================
    async joinGroup(groupId: string): Promise<void> {
      await this.startConnection();
      return this.hubConnection.invoke('JoinGroup', groupId);
    }

    async leaveGroup(groupId: string): Promise<void> {
      if (!this.hubConnection) return;
      return this.hubConnection.invoke('LeaveGroup', groupId);
    }

    async sendGroupMessage(
  groupId: string,
  message: string,
  clientTempId: string
): Promise<void> {
  await this.startConnection();

  return this.hubConnection.invoke(
    'SendGroupMessage',
    groupId,
    message,
    clientTempId
  );
}

    private groupMessage$ = new Subject<any>();

onGroupMessageReceived() {
  return this.groupMessage$.asObservable();
}

    // onGroupMessageReceived(callback: (msg: any) => void): void {
    //   if (!this.hubConnection) return;

    //   this.hubConnection.off('ReceiveGroupMessage');
    //   this.hubConnection.on('ReceiveGroupMessage', callback);
    // }

    getGroupHistory(groupId: string) {
      return this.http.get<any[]>(
        `http://localhost:5146/api/v1/GroupChat/group/${groupId}`
      ); 
    }



    // ==========================
  // ONLINE / OFFLINE
  // ==========================
  onUserStatusChanged(callback: (data: any) => void) {
    this.hubConnection.on('UserStatusChanged', callback);
  }

  // ==========================
  // MESSAGE SEEN
  // ==========================
  onMessageSeen(callback: (data: any) => void) {
    this.hubConnection.on('MessageSeen', callback);
  }


  // ==========================
  // TYPING
  // ==========================
  onUserTyping(callback: (senderId: string) => void) {
    this.hubConnection.on('UserTyping', callback);
  }

  onUserStoppedTyping(callback: (senderId: string) => void) {
    this.hubConnection.on('UserStoppedTyping', callback);
  }
  onMessageStatusUpdated(callback: (data: any) => void) {
    this.hubConnection.on('MessageStatusUpdated', callback);
  }

  // ==========================
  // SEND TYPING
  // ==========================
  sendTyping(senderId: string, receiverId: string) {
    return this.hubConnection.invoke('UserTyping', senderId, receiverId);
  }

  stopTyping(senderId: string, receiverId: string) {
    return this.hubConnection.invoke('UserStoppedTyping', senderId, receiverId);
  }

  // ==========================
  // MESSAGE SEEN (1-1)
  // ==========================
  markMessageSeen(messageId: string, senderId: string) {
    return this.hubConnection.invoke('MessageSeen', messageId, senderId);
  }



    // =====================================================
    // OPTIONAL: TYPING (future-ready)
    // =====================================================
    // async groupTyping(groupId: string): Promise<void> {
    //   await this.startConnection();
    //   return this.hubConnection.invoke('GroupTyping', groupId);
    // }

    // onGroupTyping(callback: (userId: string) => void): void {
    //   if (!this.hubConnection) return;

    //   this.hubConnection.off('GroupTyping');
    //   this.hubConnection.on('GroupTyping', callback);
    // }
  }
