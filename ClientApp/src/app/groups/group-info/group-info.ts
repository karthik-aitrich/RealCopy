import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GroupService } from '../../../services/group.service';
import { Subject, Subscription } from 'rxjs';
import { GroupStateService } from '../../../services/GroupStateService ';
import { forkJoin } from 'rxjs';
import { ChatService } from '../../../services/chat.service';
@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-info.html',
  styleUrls: ['./group-info.css']
})
export class GroupInfo implements OnInit, OnDestroy {

  groupId!: string;
  
  members: any[] = [];
  myId = localStorage.getItem('userId');
  showAddMembers = false;
allUsers: any[] = [];
addableUsers: any[] = [];
groupName=""
selectedUserIds: string[] = [];
isAdmin = false;




  private routeSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private groupService: GroupService,
    private router: Router,
    private cdr: ChangeDetectorRef  ,
    private groupState: GroupStateService,
     private chat: ChatService,
  ) {}

  ngOnInit() {
  // 🔹 1. Snapshot (handles refresh)
  const id = this.route.snapshot.paramMap.get('groupId');
    const nav = history.state;
  console.log(nav.groupName);
console.log('history.state:', history.state);
      this.groupName = history.state?.groupName ?? 'Group Members';
      console.log(this.groupName)
  if (id) {
    this.groupId = id;
    this.loadMembers();
        // Join the SignalR group
    this.chat.hubConnection.invoke('JoinGroup', this.groupId);
    console.log("memberjoined")
    this.chat.hubConnection.on(
  'MemberLeft',

  (groupId: string, userId: string) => {
console.log("memberLeft")
    if (groupId === this.groupId) {
     this.loadMembers();

      this.cdr.detectChanges();
    }
  }
);
this.chat.hubConnection.on(
  'MemberAdded',
  (groupId: string, userId: string) => {

    console.log('MemberAdded received');

    if (groupId === this.groupId) {
      this.loadMembers();
      this.cdr.detectChanges();
    }
  }
);
  }

  // 🔹 2. Subscribe (handles navigation)
  this.routeSub = this.route.paramMap.subscribe(params => {
    const newId = params.get('groupId');
    if (newId && newId !== this.groupId) {
      this.groupId = newId;
      this.loadMembers();
    }
  });
}

  toggleAddMembers() {
  this.showAddMembers = !this.showAddMembers;

  if (this.showAddMembers) {
    this.loadUsers();
  }
}

loadUsers() {
  this.groupService.getAllUsers().subscribe(users => {
    this.allUsers = users;

    // 👇 recompute if members already loaded
    if (this.members.length) {
      this.computeAddableUsers();
    }

    this.cdr.detectChanges();
  });
}



toggleSelect(userId: string) {
  if (this.selectedUserIds.includes(userId)) {
    this.selectedUserIds =
      this.selectedUserIds.filter(id => id !== userId);
  } else {
    this.selectedUserIds.push(userId);
  }
}

addMembers() {
  const requests = this.selectedUserIds.map(userId =>
    this.groupService.addMember(this.groupId, userId)
  );

  forkJoin(requests).subscribe({
    next: () => {
      // 🔁 reload from DB (source of truth)
      this.loadMembers();

      // UI cleanup
      this.showAddMembers = false;
      this.selectedUserIds = [];

      this.groupState.refreshGroups();
    },
    error: err => {
      console.error('Failed to add members', err);
    }
  });
}


private computeAddableUsers() {
  const memberIds = this.members.map(m => m.userId);
  this.addableUsers = this.allUsers.filter(
    u => !memberIds.includes(u.userId)
  );
}


loadMembers() {
  this.groupService.getGroupMembers(this.groupId).subscribe({
    next: members => {
      this.members = members;

      this.isAdmin = members.some(
        m => m.userId === this.myId && m.role === 1
      );

      // 👇 recompute if users already loaded
      if (this.allUsers.length) {
        this.computeAddableUsers();
      }

      this.cdr.detectChanges();
    }
  });
}


 



  remove(userId: string) {
    const confirmed = confirm('Are you sure you want to remove this member?');

  if (!confirmed) {
    return;
  }
    this.groupService.removeMember(this.groupId, userId)
    .subscribe({
      next: () => {

        // Remove member from UI
        this.members = this.members.filter(m => m.userId !== userId);

        // If no members remain, delete the group
        if (this.members.length === 0) {

          this.groupService.deleteGroup(this.groupId)
            .subscribe({
              next: () => {
                alert('Group deleted successfully');
                this.router.navigate(['/groups']);
              },

              error: (err) => {
                alert(err.error?.message || 'Failed to delete group');
              }
            });
        }

        this.cdr.detectChanges();
      },

      error: (err) => {
        alert(err.error?.message || 'Failed to remove member');
      }
    });
}
deleteGroup(): void {

  const confirmed = confirm(
    'You are no longer a member of this group. Do you want to delete it?'
  );

  if (!confirmed) {
    return;
  }

  this.groupService.deleteGroup(this.groupId)
    .subscribe({
      next: () => {
        this.router.navigate(['/app']);
        alert('Group deleted successfully');

        
      },

      error: (err) => {
        console.error('Error deleting group:', err);
        alert(err.error?.message || 'Failed to delete group');
      }
    });
}
get isMember(): boolean {
  return this.members.some(m => m.userId === this.myId);
}

  changeRole(userId: string, role: number) {
  this.groupService.changeRole(this.groupId, userId, role)
    .subscribe(() => {
      const member = this.members.find(m => m.userId === userId);
      if (member) {
        member.role = role;
        this.cdr.detectChanges();
      }
    });
}


 leave() {
  this.groupService.leaveGroup(this.groupId).subscribe({
    next: () => {
      this.router.navigate(['/app']);
    },
    error: (err) => {
      alert(err.error.message);
    }
  });
}
  ngOnDestroy() {
    this.routeSub?.unsubscribe();
     this.chat.hubConnection.off('MemberLeft');
  }
}
